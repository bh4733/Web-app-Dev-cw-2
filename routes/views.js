import { Router } from "express";
import {
  aboutPage,
  homePage,
  courseDetailPage,
  bookCoursePage,
  postBookCourse,
  postBookSession,
  bookingConfirmationPage,
  LoginPage,
  RegisterPage,
  postRegister,
  postLogin,
  logout,
} from "../controllers/viewsController.js";

import { coursesListPage } from "../controllers/coursesListController.js";
import { login, verify, requireOrganiser } from "../auth/auth.js";
import {
  dashboard,
  courseList,
  newCourseForm,
  createCourse,
  editCourseForm,
  updateCourse,
  deleteCourse,
  sessionList,
  newSessionForm,
  createSession,
  editSessionForm,
  updateSession,
  deleteSession,
  classList,
  userList,
  createOrganiser,
  deleteUser,
  makeOrganiser,
} from "../controllers/organiserController.js";

const router = Router();

router.get("/about", aboutPage);
router.get("/", homePage);
router.get("/courses", coursesListPage);
router.get("/courses/:id", courseDetailPage);
router.get("/courses/:id/book", verify, bookCoursePage);
router.post("/courses/:id/book", verify, postBookCourse);
router.post("/sessions/:id/book", verify, postBookSession);
router.get("/bookings/:bookingId", bookingConfirmationPage);
router.get("/login", LoginPage);
router.post("/login", login, postLogin);
router.get("/logout", logout);
router.get("/register", RegisterPage);
router.post("/register", postRegister);

// Organiser routes (all require login + organiser role)
router.get("/organiser", verify, requireOrganiser, dashboard);
router.get("/organiser/courses", verify, requireOrganiser, courseList);
router.get("/organiser/courses/new", verify, requireOrganiser, newCourseForm);
router.post("/organiser/courses/new", verify, requireOrganiser, createCourse);
router.get(
  "/organiser/courses/:id/edit",
  verify,
  requireOrganiser,
  editCourseForm,
);
router.post(
  "/organiser/courses/:id/edit",
  verify,
  requireOrganiser,
  updateCourse,
);
router.post(
  "/organiser/courses/:id/delete",
  verify,
  requireOrganiser,
  deleteCourse,
);
router.get(
  "/organiser/courses/:id/sessions",
  verify,
  requireOrganiser,
  sessionList,
);
router.get(
  "/organiser/courses/:id/sessions/new",
  verify,
  requireOrganiser,
  newSessionForm,
);
router.post(
  "/organiser/courses/:id/sessions/new",
  verify,
  requireOrganiser,
  createSession,
);
router.get(
  "/organiser/sessions/:id/edit",
  verify,
  requireOrganiser,
  editSessionForm,
);
router.post(
  "/organiser/sessions/:id/edit",
  verify,
  requireOrganiser,
  updateSession,
);
router.post(
  "/organiser/sessions/:id/delete",
  verify,
  requireOrganiser,
  deleteSession,
);
router.get(
  "/organiser/courses/:id/classlist",
  verify,
  requireOrganiser,
  classList,
);
router.get("/organiser/users", verify, requireOrganiser, userList);
router.post("/organiser/users/new", verify, requireOrganiser, createOrganiser);
router.post(
  "/organiser/users/:id/delete",
  verify,
  requireOrganiser,
  deleteUser,
);
router.post(
  "/organiser/users/:id/make-organiser",
  verify,
  requireOrganiser,
  makeOrganiser,
);

export default router;
