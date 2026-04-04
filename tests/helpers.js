// tests/helpers.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  initDb,
  usersDb,
  coursesDb,
  sessionsDb,
  bookingsDb,
} from "../models/_db.js";
import { UserModel } from "../models/userModel.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

export async function resetDb() {
  await initDb();
  await Promise.all([
    usersDb.remove({}, { multi: true }),
    coursesDb.remove({}, { multi: true }),
    sessionsDb.remove({}, { multi: true }),
    bookingsDb.remove({}, { multi: true }),
  ]);
  await Promise.all([
    usersDb.persistence.compactDatafile(),
    coursesDb.persistence.compactDatafile(),
    sessionsDb.persistence.compactDatafile(),
    bookingsDb.persistence.compactDatafile(),
  ]);
}

// Generate a signed JWT cookie string for a user.
// The app's attachDemoUser middleware will verify this and load req.user from DB,
// so the user must already exist in the DB with a matching email.
export function makeAuthCookie(user) {
  const secret = process.env.ACCESS_TOKEN_SECRET || "your-super-secure-secret-key";
  const token = jwt.sign(
    { email: user.email, name: user.name },
    secret,
    { expiresIn: "1d" }
  );
  return `token=${token}`;
}

// Seed a minimal dataset used by multiple tests
export async function seedMinimal() {
  const student = await UserModel.create({
    name: "Test Student",
    email: "student@test.local",
    role: "student",
  });
  const instructor = await UserModel.create({
    name: "Test Instructor",
    email: "instructor@test.local",
    role: "instructor",
  });

  const course = await CourseModel.create({
    title: "Test Course",
    level: "beginner",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-02-02",
    endDate: "2026-04-20",
    instructorId: instructor._id,
    sessionIds: [],
    description: "A test course for E2E route testing.",
    location: "Studio A",
    price: "£30",
  });

  const s1 = await SessionModel.create({
    courseId: course._id,
    startDateTime: new Date("2026-02-02T18:30:00").toISOString(),
    endDateTime: new Date("2026-02-02T19:45:00").toISOString(),
    capacity: 18,
    bookedCount: 0,
  });

  const s2 = await SessionModel.create({
    courseId: course._id,
    startDateTime: new Date("2026-02-09T18:30:00").toISOString(),
    endDateTime: new Date("2026-02-09T19:45:00").toISOString(),
    capacity: 18,
    bookedCount: 0,
  });

  await CourseModel.update(course._id, { sessionIds: [s1._id, s2._id] });

  return { student, instructor, course, sessions: [s1, s2] };
}

// Seed an organiser user with a real hashed password.
// Uses 4 salt rounds (not 12) to keep tests fast.
export async function seedOrganiser() {
  const password = await bcrypt.hash("organiser123", 4);
  return UserModel.create({
    name: "Test Organiser",
    email: "organiser@test.local",
    password,
    role: "organiser",
  });
}

// Seed a student user with a real hashed password (for login tests).
export async function seedStudentWithPassword(email = "pw-student@test.local", plainPassword = "student123") {
  const password = await bcrypt.hash(plainPassword, 4);
  return UserModel.create({
    name: "PW Student",
    email,
    password,
    role: "student",
  });
}
