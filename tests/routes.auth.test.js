// tests/routes.auth.test.js
import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedStudentWithPassword } from "./helpers.js";

describe("Auth routes — login, register, logout", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    await seedStudentWithPassword("auth-student@test.local", "password123");
  });

  // --- Login ---
  test("GET /login renders login form", async () => {
    const res = await request(app).get("/login");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Login/i);
  });

  test("POST /login with valid credentials sets cookie and redirects to /", async () => {
    const res = await request(app)
      .post("/login")
      .type("form")
      .send({ email: "auth-student@test.local", password: "password123" });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
    // Cookie must be set
    const cookies = res.headers["set-cookie"];
    expect(Array.isArray(cookies) ? cookies.join() : cookies).toMatch(/token=/);
  });

  test("POST /login with wrong password returns 401 with error message", async () => {
    const res = await request(app)
      .post("/login")
      .type("form")
      .send({ email: "auth-student@test.local", password: "wrongpass" });
    expect(res.status).toBe(401);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Invalid email or password/i);
  });

  test("POST /login with unknown email returns 401 with error message", async () => {
    const res = await request(app)
      .post("/login")
      .type("form")
      .send({ email: "nobody@test.local", password: "password123" });
    expect(res.status).toBe(401);
    expect(res.text).toMatch(/Invalid email or password/i);
  });

  // --- Logout ---
  test("GET /logout clears cookie and redirects to /login", async () => {
    const res = await request(app).get("/logout");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login/);
    // Cookie should be cleared (set-cookie with empty/expired token)
    const cookies = res.headers["set-cookie"];
    if (cookies) {
      const cookieStr = Array.isArray(cookies) ? cookies.join() : cookies;
      // Either no token cookie, or it has an expired/empty value
      expect(cookieStr).toMatch(/token=;|token=$/m);
    }
  });

  // --- Register ---
  test("GET /register renders registration form", async () => {
    const res = await request(app).get("/register");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Register/i);
  });

  test("POST /register with valid new user redirects to /login", async () => {
    const res = await request(app)
      .post("/register")
      .type("form")
      .send({
        name: "New User",
        email: "newuser@test.local",
        password: "secure123",
        confirmPassword: "secure123",
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login/);
  });

  test("POST /register with duplicate email returns 400 with error", async () => {
    const res = await request(app)
      .post("/register")
      .type("form")
      .send({
        name: "Duplicate",
        email: "auth-student@test.local",
        password: "secure123",
        confirmPassword: "secure123",
      });
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/already exists/i);
  });

  test("POST /register with short password returns 400 with error", async () => {
    const res = await request(app)
      .post("/register")
      .type("form")
      .send({
        name: "Short Pass",
        email: "shortpass@test.local",
        password: "abc",
        confirmPassword: "abc",
      });
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/at least 6 characters/i);
  });

  test("POST /register with mismatched passwords returns 400 with error", async () => {
    const res = await request(app)
      .post("/register")
      .type("form")
      .send({
        name: "Mismatch",
        email: "mismatch@test.local",
        password: "password123",
        confirmPassword: "different456",
      });
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/do not match/i);
  });

  test("POST /register with empty name returns 400 with error", async () => {
    const res = await request(app)
      .post("/register")
      .type("form")
      .send({
        name: "",
        email: "noname@test.local",
        password: "password123",
        confirmPassword: "password123",
      });
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/name is required/i);
  });
});
