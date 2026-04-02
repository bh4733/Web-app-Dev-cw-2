// controllers/organiserController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
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

// GET /organiser
export const dashboard = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    const users = await UserModel.list();
    res.render("organiser/dashboard", {
      title: "Organiser Dashboard",
      courseCount: courses.length,
      userCount: users.length,
    });
  } catch (err) {
    next(err);
  }
};

// GET /organiser/courses
export const courseList = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    const rows = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          allowDropIn: c.allowDropIn,
          sessionsCount: sessions.length,
        };
      })
    );
    res.render("organiser/courses", { title: "Manage Courses", courses: rows });
  } catch (err) {
    next(err);
  }
};

// GET /organiser/courses/new
export const newCourseForm = (req, res) => {
  res.render("organiser/course_form", { title: "Add Course", course: {} });
};

// POST /organiser/courses/new
export const createCourse = async (req, res, next) => {
  try {
    const { title, level, type, allowDropIn, startDate, endDate, description } = req.body;
    const errors = [];
    if (!title || !title.trim()) errors.push("Title is required.");
    if (!level) errors.push("Level is required.");
    if (!type) errors.push("Type is required.");

    if (errors.length) {
      return res.status(400).render("organiser/course_form", {
        title: "Add Course",
        errors: { list: errors },
        course: req.body,
      });
    }

    await CourseModel.create({
      title: title.trim(),
      level,
      type,
      allowDropIn: allowDropIn === "on" || allowDropIn === "true",
      startDate: startDate || null,
      endDate: endDate || null,
      description: description ? description.trim() : "",
    });
    res.redirect("/organiser/courses");
  } catch (err) {
    next(err);
  }
};

// GET /organiser/courses/:id/edit
export const editCourseForm = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course)
      return res.status(404).render("error", { title: "Not found", message: "Course not found" });
    res.render("organiser/course_form", {
      title: "Edit Course",
      editing: true,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: course.startDate ? course.startDate.slice(0, 10) : "",
        endDate: course.endDate ? course.endDate.slice(0, 10) : "",
        description: course.description,
        levelBeginner: course.level === "beginner",
        levelIntermediate: course.level === "intermediate",
        levelAdvanced: course.level === "advanced",
        typeWeekly: course.type === "WEEKLY_BLOCK",
        typeWeekend: course.type === "WEEKEND_WORKSHOP",
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /organiser/courses/:id/edit
export const updateCourse = async (req, res, next) => {
  try {
    const { title, level, type, allowDropIn, startDate, endDate, description } = req.body;
    const errors = [];
    if (!title || !title.trim()) errors.push("Title is required.");
    if (!level) errors.push("Level is required.");
    if (!type) errors.push("Type is required.");

    if (errors.length) {
      return res.status(400).render("organiser/course_form", {
        title: "Edit Course",
        editing: true,
        errors: { list: errors },
        course: { id: req.params.id, ...req.body },
      });
    }

    await CourseModel.update(req.params.id, {
      title: title.trim(),
      level,
      type,
      allowDropIn: allowDropIn === "on" || allowDropIn === "true",
      startDate: startDate || null,
      endDate: endDate || null,
      description: description ? description.trim() : "",
    });
    res.redirect("/organiser/courses");
  } catch (err) {
    next(err);
  }
};

// POST /organiser/courses/:id/delete
export const deleteCourse = async (req, res, next) => {
  try {
    await SessionModel.deleteByCourse(req.params.id);
    await CourseModel.delete(req.params.id);
    res.redirect("/organiser/courses");
  } catch (err) {
    next(err);
  }
};

// GET /organiser/courses/:id/sessions
export const sessionList = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course)
      return res.status(404).render("error", { title: "Not found", message: "Course not found" });
    const sessions = await SessionModel.listByCourse(req.params.id);
    const rows = sessions.map((s) => ({
      id: s._id,
      start: fmtDate(s.startDateTime),
      end: fmtDate(s.endDateTime),
      capacity: s.capacity,
      booked: s.bookedCount ?? 0,
    }));
    res.render("organiser/sessions", {
      title: `Sessions: ${course.title}`,
      course: { id: course._id, title: course.title },
      sessions: rows,
    });
  } catch (err) {
    next(err);
  }
};

// GET /organiser/courses/:id/sessions/new
export const newSessionForm = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course)
      return res.status(404).render("error", { title: "Not found", message: "Course not found" });
    res.render("organiser/session_form", {
      title: "Add Session",
      course: { id: course._id, title: course.title },
      session: {},
    });
  } catch (err) {
    next(err);
  }
};

// POST /organiser/courses/:id/sessions/new
export const createSession = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course)
      return res.status(404).render("error", { title: "Not found", message: "Course not found" });

    const { startDateTime, endDateTime, capacity } = req.body;
    const errors = [];
    if (!startDateTime) errors.push("Start date/time is required.");
    if (!endDateTime) errors.push("End date/time is required.");
    if (!capacity || isNaN(Number(capacity)) || Number(capacity) < 1)
      errors.push("Capacity must be a positive number.");

    if (errors.length) {
      return res.status(400).render("organiser/session_form", {
        title: "Add Session",
        errors: { list: errors },
        course: { id: course._id, title: course.title },
        session: req.body,
      });
    }

    await SessionModel.create({
      courseId: course._id,
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: new Date(endDateTime).toISOString(),
      capacity: Number(capacity),
      bookedCount: 0,
    });
    res.redirect(`/organiser/courses/${course._id}/sessions`);
  } catch (err) {
    next(err);
  }
};

// GET /organiser/sessions/:id/edit
export const editSessionForm = async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);
    if (!session)
      return res.status(404).render("error", { title: "Not found", message: "Session not found" });
    const course = await CourseModel.findById(session.courseId);
    res.render("organiser/session_form", {
      title: "Edit Session",
      editing: true,
      course: { id: course._id, title: course.title },
      session: {
        id: session._id,
        startDateTime: session.startDateTime ? session.startDateTime.slice(0, 16) : "",
        endDateTime: session.endDateTime ? session.endDateTime.slice(0, 16) : "",
        capacity: session.capacity,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /organiser/sessions/:id/edit
export const updateSession = async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);
    if (!session)
      return res.status(404).render("error", { title: "Not found", message: "Session not found" });

    const { startDateTime, endDateTime, capacity } = req.body;
    const errors = [];
    if (!startDateTime) errors.push("Start date/time is required.");
    if (!endDateTime) errors.push("End date/time is required.");
    if (!capacity || isNaN(Number(capacity)) || Number(capacity) < 1)
      errors.push("Capacity must be a positive number.");

    if (errors.length) {
      const course = await CourseModel.findById(session.courseId);
      return res.status(400).render("organiser/session_form", {
        title: "Edit Session",
        editing: true,
        errors: { list: errors },
        course: { id: course._id, title: course.title },
        session: { id: session._id, ...req.body },
      });
    }

    await SessionModel.update(req.params.id, {
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: new Date(endDateTime).toISOString(),
      capacity: Number(capacity),
    });
    res.redirect(`/organiser/courses/${session.courseId}/sessions`);
  } catch (err) {
    next(err);
  }
};

// POST /organiser/sessions/:id/delete
export const deleteSession = async (req, res, next) => {
  try {
    const session = await SessionModel.findById(req.params.id);
    if (!session)
      return res.status(404).render("error", { title: "Not found", message: "Session not found" });
    const courseId = session.courseId;
    await SessionModel.delete(req.params.id);
    res.redirect(`/organiser/courses/${courseId}/sessions`);
  } catch (err) {
    next(err);
  }
};

// GET /organiser/courses/:id/classlist
export const classList = async (req, res, next) => {
  try {
    const course = await CourseModel.findById(req.params.id);
    if (!course)
      return res.status(404).render("error", { title: "Not found", message: "Course not found" });

    const bookings = await BookingModel.listByCourse(req.params.id);
    const participants = await Promise.all(
      bookings.map(async (b) => {
        const user = await UserModel.findById(b.userId);
        return {
          name: user ? user.name : "Unknown",
          email: user ? user.email : "",
          type: b.type,
          status: b.status,
          bookedAt: b.createdAt ? fmtDate(b.createdAt) : "",
        };
      })
    );

    res.render("organiser/classlist", {
      title: `Class List: ${course.title}`,
      course: { id: course._id, title: course.title },
      participants,
      count: participants.length,
    });
  } catch (err) {
    next(err);
  }
};

// GET /organiser/users
export const userList = async (req, res, next) => {
  try {
    const users = await UserModel.list();
    const rows = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isOrganiser: u.role === "organiser",
      isStudent: u.role === "student",
    }));
    res.render("organiser/users", { title: "Manage Users", users: rows });
  } catch (err) {
    next(err);
  }
};

// POST /organiser/users/new
export const createOrganiser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const errors = [];
    if (!name || !name.trim()) errors.push("Full name is required.");
    if (!email || !email.trim()) errors.push("Email is required.");
    if (!password || password.length < 6) errors.push("Password must be at least 6 characters.");

    if (errors.length) {
      const users = await UserModel.list();
      return res.status(400).render("organiser/users", {
        title: "Manage Users",
        users: users.map((u) => ({
          id: u._id, name: u.name, email: u.email, role: u.role,
          isOrganiser: u.role === "organiser", isStudent: u.role === "student",
        })),
        errors: { list: errors },
        values: { name, email },
      });
    }

    const existing = await UserModel.findByEmail(email.trim());
    if (existing) {
      const users = await UserModel.list();
      return res.status(400).render("organiser/users", {
        title: "Manage Users",
        users: users.map((u) => ({
          id: u._id, name: u.name, email: u.email, role: u.role,
          isOrganiser: u.role === "organiser", isStudent: u.role === "student",
        })),
        errors: { list: ["An account with that email already exists."] },
        values: { name, email },
      });
    }

    const hashed = await bcrypt.hash(password, 12);
    await UserModel.create({ name: name.trim(), email: email.trim(), password: hashed, role: "organiser" });
    res.redirect("/organiser/users");
  } catch (err) {
    next(err);
  }
};

// POST /organiser/users/:id/delete
export const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id) {
      const users = await UserModel.list();
      return res.status(400).render("organiser/users", {
        title: "Manage Users",
        users: users.map((u) => ({
          id: u._id, name: u.name, email: u.email, role: u.role,
          isOrganiser: u.role === "organiser", isStudent: u.role === "student",
        })),
        errors: { list: ["You cannot delete your own account."] },
      });
    }
    await UserModel.delete(req.params.id);
    res.redirect("/organiser/users");
  } catch (err) {
    next(err);
  }
};

// POST /organiser/users/:id/make-organiser
export const makeOrganiser = async (req, res, next) => {
  try {
    await UserModel.update(req.params.id, { role: "organiser" });
    res.redirect("/organiser/users");
  } catch (err) {
    next(err);
  }
};
