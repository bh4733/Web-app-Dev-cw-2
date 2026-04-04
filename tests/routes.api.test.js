// tests/routes.api.test.js
//
// Note: GET /courses and GET /courses/:id are handled by the SSR view routes
// (registered first in index.js) and return HTML, not JSON. Those routes are
// covered in routes.ssr.test.js. This file tests the JSON API endpoints that
// are not shadowed by view routes: POST /courses, /sessions, and /bookings.
//
import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { UserModel } from "../models/userModel.js";

describe("JSON API routes", () => {
  let data;
  let student;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
    student = await UserModel.create({
      name: "API Student",
      email: "api@student.local",
      role: "student",
    });
  });

  // COURSES — only POST is reachable via the JSON API
  test("POST /courses creates a course and returns 201 JSON", async () => {
    const res = await request(app).post("/courses").send({
      title: "API Created Course",
      level: "advanced",
      type: "WEEKEND_WORKSHOP",
      allowDropIn: false,
      startDate: "2026-05-01",
      endDate: "2026-05-02",
      instructorId: data.instructor._id,
      description: "Created via API route.",
    });
    expect(res.status).toBe(201);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.course).toBeDefined();
    expect(res.body.course.title).toBe("API Created Course");
  });

  // SESSIONS
  test("POST /sessions creates a session and returns 201 JSON", async () => {
    const res = await request(app).post("/sessions").send({
      courseId: data.course._id,
      startDateTime: new Date("2026-02-16T18:30:00").toISOString(),
      endDateTime: new Date("2026-02-16T19:45:00").toISOString(),
      capacity: 16,
      bookedCount: 0,
    });
    expect(res.status).toBe(201);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.courseId).toBe(data.course._id);
  });

  test("GET /sessions/by-course/:courseId returns sessions array", async () => {
    const res = await request(app).get(`/sessions/by-course/${data.course._id}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBeGreaterThanOrEqual(2);
  });

  // BOOKINGS
  test("POST /bookings/course creates a COURSE booking", async () => {
    const res = await request(app).post("/bookings/course").send({
      userId: student._id,
      courseId: data.course._id,
    });
    expect(res.status).toBe(201);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.type).toBe("COURSE");
    expect(["CONFIRMED", "WAITLISTED"]).toContain(res.body.booking.status);
  });

  test("POST /bookings/session creates a SESSION booking", async () => {
    const res = await request(app).post("/bookings/session").send({
      userId: student._id,
      sessionId: data.sessions[0]._id,
    });
    expect(res.status).toBe(201);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.type).toBe("SESSION");
    expect(["CONFIRMED", "WAITLISTED"]).toContain(res.body.booking.status);
  });

  test("DELETE /bookings/:id cancels a booking", async () => {
    const create = await request(app).post("/bookings/session").send({
      userId: student._id,
      sessionId: data.sessions[1]._id,
    });
    expect(create.status).toBe(201);
    const bookingId = create.body.booking._id;

    const del = await request(app).delete(`/bookings/${bookingId}`);
    expect(del.status).toBe(200);
    expect(del.body.booking.status).toBe("CANCELLED");
  });
});
