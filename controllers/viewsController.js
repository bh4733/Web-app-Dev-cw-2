// controllers/viewsController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import {
  bookCourseForUser,
  bookSessionForUser,
} from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";
import { UserModel } from "../models/userModel.js";
import bcrypt from "bcryptjs";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const fmtDateOnly = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const aboutPage = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    res.render("about", {
      title: "About Us",
      courses: courses.map((c) => ({
        title: c.title,
        level: c.level,
        type: c.type,
        allowDropIn: c.allowDropIn,
        description: c.description,
        location: c.location,
        price: c.price,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const homePage = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    const cards = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        const nextSession = sessions[0];
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          allowDropIn: c.allowDropIn,
          startDate: c.startDate ? fmtDateOnly(c.startDate) : "",
          endDate: c.endDate ? fmtDateOnly(c.endDate) : "",
          nextSession: nextSession ? fmtDate(nextSession.startDateTime) : "TBA",
          sessionsCount: sessions.length,
          description: c.description,
          location: c.location,
          price: c.price,
        };
      }),
    );
    res.render("home", { title: "Yoga Courses", courses: cards });
  } catch (err) {
    next(err);
  }
};

export const courseDetailPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    const sessions = await SessionModel.listByCourse(courseId);
    const rows = sessions.map((s) => ({
      id: s._id,
      start: fmtDate(s.startDateTime),
      end: fmtDate(s.endDateTime),
      capacity: s.capacity,
      booked: s.bookedCount ?? 0,
      remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
    }));

    res.render("course", {
      title: course.title,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: course.startDate ? fmtDateOnly(course.startDate) : "",
        endDate: course.endDate ? fmtDateOnly(course.endDate) : "",
        description: course.description,
        location: course.location,
        price: course.price,
      },
      sessions: rows,
    });
  } catch (err) {
    next(err);
  }
};

export const bookCoursePage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    const sessions = await SessionModel.listByCourse(courseId);
    const rows = sessions.map((s) => ({
      id: s._id,
      start: fmtDate(s.startDateTime),
      remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
    }));

    res.render("course_book", {
      title: `Book: ${course.title}`,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: course.startDate ? fmtDateOnly(course.startDate) : "",
        endDate: course.endDate ? fmtDateOnly(course.endDate) : "",
        description: course.description,
        location: course.location,
        price: course.price,
      },
      sessions: rows,
      sessionsCount: rows.length,
    });
  } catch (err) {
    next(err);
  }
};

export const postBookCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const booking = await bookCourseForUser(req.user._id, courseId);
    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    res
      .status(400)
      .render("error", { title: "Booking failed", message: err.message });
  }
};

export const postBookSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const booking = await bookSessionForUser(req.user._id, sessionId);
    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    const message =
      err.code === "DROPIN_NOT_ALLOWED"
        ? "Drop-ins are not allowed for this course."
        : err.message;
    res.status(400).render("error", { title: "Booking failed", message });
  }
};

export const bookingConfirmationPage = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await BookingModel.findById(bookingId);
    if (!booking)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Booking not found" });

    res.render("booking_confirmation", {
      title: "Booking confirmation",
      booking: {
        id: booking._id,
        type: booking.type,
        status: req.query.status || booking.status,
        createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
      },
    });
  } catch (err) {
    next(err);
  }
};

export const LoginPage = (req, res) => {
  res.render("login", { title: "Login" });
};

export const postLogin = (req, res) => {
  res.redirect("/");
};

export const logout = (req, res) => {
  res.clearCookie("jwt")
    .status(200)
    .redirect("/");
};

export const RegisterPage = (req, res) => {
  res.render("register", { title: "Register" });
};

export const postRegister = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    const errors = [];

    if (!name || !name.trim()) errors.push("Full name is required.");
    if (!email || !email.trim()) errors.push("Email is required.");
    if (!password) errors.push("Password is required.");
    if (password && password.length < 6)
      errors.push("Password must be at least 6 characters.");
    if (password !== confirmPassword) errors.push("Passwords do not match.");

    if (errors.length) {
      return res.status(400).render("register", {
        title: "Register",
        errors: { list: errors },
        values: { name, email },
      });
    }

    const existing = await UserModel.findByEmail(email.trim());
    if (existing) {
      return res.status(400).render("register", {
        title: "Register",
        errors: { list: ["An account with that email already exists."] },
        values: { name, email },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await UserModel.create({
      name: name.trim(),
      email: email.trim(),
      password: hashedPassword,
      role: "student",
    });
    res.redirect("/login");
  } catch (err) {
    next(err);
  }
};
