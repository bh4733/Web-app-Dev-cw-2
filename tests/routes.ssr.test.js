// tests/routes.ssr.test.js
import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal, makeAuthCookie } from "./helpers.js";

describe("SSR view routes", () => {
  let data;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
  });

  // Public pages
  test("GET / renders home page HTML", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Courses|Yoga/i);
  });

  test("GET /about renders about page HTML", async () => {
    const res = await request(app).get("/about");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/About/i);
  });

  test("GET /courses renders course list HTML with seeded course", async () => {
    const res = await request(app).get("/courses");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Test Course/);
  });

  test("GET /courses/:id renders course detail page", async () => {
    const res = await request(app).get(`/courses/${data.course._id}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Test Course/);
  });

  test("GET /login renders login form", async () => {
    const res = await request(app).get("/login");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Login/i);
  });

  test("GET /register renders registration form", async () => {
    const res = await request(app).get("/register");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Register/i);
  });

  // Auth-gated pages — unauthenticated
  test("GET /courses/:id/book without auth redirects to /login", async () => {
    const res = await request(app).get(`/courses/${data.course._id}/book`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login/);
  });

  // Auth-gated pages — authenticated
  test("GET /courses/:id/book with auth cookie renders booking form", async () => {
    const res = await request(app)
      .get(`/courses/${data.course._id}/book`)
      .set("Cookie", makeAuthCookie(data.student));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Book/i);
  });

  // 404 for unknown course
  test("GET /courses/:id with unknown id renders 404 HTML", async () => {
    const res = await request(app).get("/courses/no-such-id");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/not found/i);
  });
});
