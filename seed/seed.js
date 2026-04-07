import {
  initDb,
  usersDb,
  coursesDb,
  sessionsDb,
  bookingsDb,
} from "../models/_db.js";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { UserModel } from "../models/userModel.js";
import { BookingModel } from "../models/bookingModel.js";
import bcrypt from "bcryptjs";

const iso = (d) => new Date(d).toISOString();

async function wipeAll() {
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

async function seedStudent() {
  let student = await UserModel.findByEmail("fiona@student.local");
  if (!student) {
    const password = await bcrypt.hash("student123", 12);
    student = await UserModel.create({
      name: "Fiona",
      email: "fiona@student.local",
      password,
      role: "student",
    });
  }
  return student;
}

async function seedOrganiser() {
  let organiser = await UserModel.findByEmail("maya@yoga.local");
  if (!organiser) {
    const password = await bcrypt.hash("organiser123", 12);
    organiser = await UserModel.create({
      name: "Admin",
      email: "Admin@yoga.local",
      password,
      role: "organiser",
    });
  }
  return organiser;
}

async function createWeekendWorkshop() {
  const avaPassword = await bcrypt.hash("password", 12);
  const organiser = await UserModel.create({
    name: "Ava",
    email: "ava@yoga.local",
    password: avaPassword,
    role: "organiser",
  });
  const course = await CourseModel.create({
    title: "Winter Mindfulness Workshop",
    level: "beginner",
    type: "WEEKEND_WORKSHOP",
    allowDropIn: false,
    startDate: "2026-01-10",
    endDate: "2026-01-11",
    instructorId: organiser._id,
    sessionIds: [],
    description: "Two days of breath, posture alignment, and meditation.",
    location: "Studio A",
    price: "£40",
  });

  const base = new Date("2026-01-10T09:00:00");
  const sessions = [];
  for (let i = 0; i < 5; i++) {
    const start = new Date(base.getTime() + i * 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const s = await SessionModel.create({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      capacity: 20,
      bookedCount: 0,
    });
    sessions.push(s);
  }
  await CourseModel.update(course._id, {
    sessionIds: sessions.map((s) => s._id),
  });
  return { course, sessions, organiser };
}

async function createWeeklyBlock() {
  const benPassword = await bcrypt.hash("password", 12);
  const organiser = await UserModel.create({
    name: "Ben",
    email: "ben@yoga.local",
    password: benPassword,
    role: "organiser",
  });
  const course = await CourseModel.create({
    title: "12‑Week Vinyasa Flow",
    level: "intermediate",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-02-02",
    endDate: "2026-04-20",
    instructorId: organiser._id,
    sessionIds: [],
    description: "Progressive sequences building strength and flexibility.",
    price: "£60",
    location: "Studio B",
  });

  const first = new Date("2026-02-02T18:30:00");
  const sessions = [];
  for (let i = 0; i < 12; i++) {
    const start = new Date(first.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 75 * 60 * 1000);
    const s = await SessionModel.create({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      capacity: 18,
      bookedCount: 0,
    });
    sessions.push(s);
  }
  await CourseModel.update(course._id, {
    sessionIds: sessions.map((s) => s._id),
  });
  return { course, sessions, organiser };
}

async function createBookings(student, w, b) {
  // Book the student onto the full weekend workshop (all sessions)
  const workshopSessionIds = w.sessions.map((s) => s._id);
  await BookingModel.create({
    userId: student._id,
    courseId: w.course._id,
    type: "COURSE",
    sessionIds: workshopSessionIds,
    status: "CONFIRMED",
  });
  for (const s of w.sessions) {
    await SessionModel.incrementBookedCount(s._id, 1);
  }

  const dropInSession = b.sessions[0];
  await BookingModel.create({
    userId: student._id,
    courseId: b.course._id,
    type: "SESSION",
    sessionIds: [dropInSession._id],
    status: "CONFIRMED",
  });
  await SessionModel.incrementBookedCount(dropInSession._id, 1);
}

async function verifyAndReport() {
  const [users, courses, sessions, bookings] = await Promise.all([
    usersDb.count({}),
    coursesDb.count({}),
    sessionsDb.count({}),
    bookingsDb.count({}),
  ]);
  console.log("— Verification —");
  console.log("Users   :", users);
  console.log("Courses :", courses);
  console.log("Sessions:", sessions);
  console.log("Bookings:", bookings);
  if (courses === 0 || sessions === 0) {
    throw new Error("Seed finished but no courses/sessions were created.");
  }
}

async function run() {
  console.log("Initializing DB…");
  await initDb();

  console.log("Wiping existing data…");
  await wipeAll();

  console.log("Creating organiser…");
  await seedOrganiser();

  console.log("Creating student…");
  const student = await seedStudent();

  console.log("Creating weekend workshop…");
  const w = await createWeekendWorkshop();

  console.log("Creating weekly block…");
  const b = await createWeeklyBlock();

  console.log("Creating bookings…");
  await createBookings(student, w, b);

  await verifyAndReport();

  console.log("\n Seed complete.");
  console.log("Organiser login      : Admin@yoga.local / organiser123");
  console.log("Student login        : fiona@student.local / student123");
  console.log(
    "Workshop course ID   :",
    w.course._id,
    "(sessions:",
    w.sessions.length + ")",
  );
  console.log(
    "Weekly block course ID:",
    b.course._id,
    "(sessions:",
    b.sessions.length + ")",
  );
}

run().catch((err) => {
  console.error("❌ Seed failed:", err?.stack || err);
  process.exit(1);
});
