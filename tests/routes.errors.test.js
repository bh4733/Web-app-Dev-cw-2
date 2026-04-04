// tests/routes.errors.test.js
import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal, seedOrganiser, makeAuthCookie } from "./helpers.js";

describe("Edge cases & access control", () => {
  let data;
  let organiser;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
    organiser = await seedOrganiser();
  });

  // Unknown resource IDs
  test("GET /courses/:id with unknown id renders 404 HTML page", async () => {
    const res = await request(app).get("/courses/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/not found/i);
  });

  test("GET /bookings/:id with unknown id renders 404 HTML page", async () => {
    const res = await request(app).get("/bookings/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/not found/i);
  });

  // JSON API — bad IDs
  test("POST /bookings/session with invalid sessionId returns 4xx", async () => {
    const res = await request(app).post("/bookings/session").send({
      userId: "invalid-user",
      sessionId: "invalid-session",
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(600);
  });

  test("POST /bookings/course with invalid courseId returns 4xx", async () => {
    const res = await request(app).post("/bookings/course").send({
      userId: "invalid-user",
      courseId: "invalid-course",
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(600);
  });

  // Organiser route access control — no auth
  test("GET /organiser without auth redirects to /login", async () => {
    const res = await request(app).get("/organiser");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login/);
  });

  test("GET /organiser/courses without auth redirects to /login", async () => {
    const res = await request(app).get("/organiser/courses");
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/\/login/);
  });

  // Organiser route access control — wrong role (student)
  test("GET /organiser with student auth returns 403", async () => {
    const res = await request(app)
      .get("/organiser")
      .set("Cookie", makeAuthCookie(data.student));
    expect(res.status).toBe(403);
    expect(res.text).toMatch(/restricted|denied/i);
  });

  test("GET /organiser/users with student auth returns 403", async () => {
    const res = await request(app)
      .get("/organiser/users")
      .set("Cookie", makeAuthCookie(data.student));
    expect(res.status).toBe(403);
  });

  // Organiser route access — correct role
  test("GET /organiser with organiser auth returns 200", async () => {
    const res = await request(app)
      .get("/organiser")
      .set("Cookie", makeAuthCookie(organiser));
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  // Global 404
  test("GET /no-such-route returns 404 text/plain", async () => {
    const res = await request(app).get("/no-such-route");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/text\/plain/);
    expect(res.text).toMatch(/404 Not found/i);
  });
});
