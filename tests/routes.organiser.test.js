// tests/routes.organiser.test.js
import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal, seedOrganiser, makeAuthCookie } from "./helpers.js";

describe("Organiser routes", () => {
  let data;
  let organiser;
  let authCookie;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
    organiser = await seedOrganiser();
    authCookie = makeAuthCookie(organiser);
  });

  // --- Dashboard ---
  test("GET /organiser renders dashboard with counts", async () => {
    const res = await request(app)
      .get("/organiser")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Dashboard/i);
  });

  // --- Course management ---
  test("GET /organiser/courses lists courses", async () => {
    const res = await request(app)
      .get("/organiser/courses")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Test Course/);
  });

  test("GET /organiser/courses/new renders add course form", async () => {
    const res = await request(app)
      .get("/organiser/courses/new")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Add Course/i);
  });

  test("POST /organiser/courses/new with valid data creates course and redirects", async () => {
    const res = await request(app)
      .post("/organiser/courses/new")
      .set("Cookie", authCookie)
      .type("form")
      .send({
        title: "Organiser Created Course",
        level: "intermediate",
        type: "WEEKEND_WORKSHOP",
        startDate: "2026-06-01",
        endDate: "2026-06-02",
        description: "Created by organiser test.",
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/organiser/courses");
  });

  test("POST /organiser/courses/new with missing title returns 400", async () => {
    const res = await request(app)
      .post("/organiser/courses/new")
      .set("Cookie", authCookie)
      .type("form")
      .send({ title: "", level: "beginner", type: "WEEKLY_BLOCK" });
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Title is required/i);
  });

  test("GET /organiser/courses/:id/edit renders edit form with course data", async () => {
    const res = await request(app)
      .get(`/organiser/courses/${data.course._id}/edit`)
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Edit Course/i);
    expect(res.text).toMatch(/Test Course/);
  });

  test("POST /organiser/courses/:id/edit updates course and redirects", async () => {
    const res = await request(app)
      .post(`/organiser/courses/${data.course._id}/edit`)
      .set("Cookie", authCookie)
      .type("form")
      .send({
        title: "Updated Test Course",
        level: "advanced",
        type: "WEEKLY_BLOCK",
        startDate: "2026-02-02",
        endDate: "2026-04-20",
        description: "Updated description.",
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/organiser/courses");
  });

  // --- Session management ---
  test("GET /organiser/courses/:id/sessions lists sessions", async () => {
    const res = await request(app)
      .get(`/organiser/courses/${data.course._id}/sessions`)
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  test("GET /organiser/courses/:id/sessions/new renders add session form", async () => {
    const res = await request(app)
      .get(`/organiser/courses/${data.course._id}/sessions/new`)
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Add Session/i);
  });

  test("POST /organiser/courses/:id/sessions/new with valid data creates session and redirects", async () => {
    const res = await request(app)
      .post(`/organiser/courses/${data.course._id}/sessions/new`)
      .set("Cookie", authCookie)
      .type("form")
      .send({
        startDateTime: "2026-05-01T10:00",
        endDateTime: "2026-05-01T11:30",
        capacity: "20",
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/organiser/courses/${data.course._id}/sessions`);
  });

  test("POST /organiser/courses/:id/sessions/new with invalid capacity returns 400", async () => {
    const res = await request(app)
      .post(`/organiser/courses/${data.course._id}/sessions/new`)
      .set("Cookie", authCookie)
      .type("form")
      .send({
        startDateTime: "2026-05-01T10:00",
        endDateTime: "2026-05-01T11:30",
        capacity: "0",
      });
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/Capacity/i);
  });

  test("GET /organiser/sessions/:id/edit renders edit form", async () => {
    const res = await request(app)
      .get(`/organiser/sessions/${data.sessions[0]._id}/edit`)
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Edit Session/i);
  });

  test("POST /organiser/sessions/:id/edit updates session and redirects", async () => {
    const res = await request(app)
      .post(`/organiser/sessions/${data.sessions[0]._id}/edit`)
      .set("Cookie", authCookie)
      .type("form")
      .send({
        startDateTime: "2026-02-02T18:00",
        endDateTime: "2026-02-02T19:30",
        capacity: "25",
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/organiser/courses/${data.course._id}/sessions`);
  });

  test("POST /organiser/sessions/:id/delete removes session and redirects", async () => {
    const res = await request(app)
      .post(`/organiser/sessions/${data.sessions[1]._id}/delete`)
      .set("Cookie", authCookie);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/organiser/courses/${data.course._id}/sessions`);
  });

  // --- Class list ---
  test("GET /organiser/courses/:id/classlist renders participant list", async () => {
    const res = await request(app)
      .get(`/organiser/courses/${data.course._id}/classlist`)
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/Class List/i);
  });

  // --- User management ---
  test("GET /organiser/users lists all users", async () => {
    const res = await request(app)
      .get("/organiser/users")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Manage Users/i);
    expect(res.text).toMatch(/Test Student/);
  });

  test("POST /organiser/users/new with valid data creates organiser and redirects", async () => {
    const res = await request(app)
      .post("/organiser/users/new")
      .set("Cookie", authCookie)
      .type("form")
      .send({
        name: "New Organiser",
        email: "new-org@test.local",
        password: "secure123",
      });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/organiser/users");
  });

  test("POST /organiser/users/new with duplicate email returns 400", async () => {
    const res = await request(app)
      .post("/organiser/users/new")
      .set("Cookie", authCookie)
      .type("form")
      .send({
        name: "Duplicate",
        email: "organiser@test.local",
        password: "secure123",
      });
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/already exists/i);
  });

  test("POST /organiser/users/:id/make-organiser promotes student and redirects", async () => {
    const res = await request(app)
      .post(`/organiser/users/${data.student._id}/make-organiser`)
      .set("Cookie", authCookie);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/organiser/users");
  });

  test("POST /organiser/users/:id/delete removes user and redirects", async () => {
    const res = await request(app)
      .post(`/organiser/users/${data.instructor._id}/delete`)
      .set("Cookie", authCookie);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/organiser/users");
  });

  // --- Course delete (last, since it cascades sessions) ---
  test("POST /organiser/courses/:id/delete removes course and redirects", async () => {
    const res = await request(app)
      .post(`/organiser/courses/${data.course._id}/delete`)
      .set("Cookie", authCookie);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/organiser/courses");
  });
});
