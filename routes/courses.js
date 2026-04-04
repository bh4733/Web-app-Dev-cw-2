import { Router } from "express";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

const router = Router();

router.get("/", async (req, res) => {
  const courses = await CourseModel.list();
  res.json({ courses });
});

router.post("/", async (req, res) => {
  const course = await CourseModel.create(req.body);
  res.status(201).json({ course });
});

router.get("/:id", async (req, res) => {
  const course = await CourseModel.findById(req.params.id);
  if (!course) return res.status(404).json({ error: "Course not found" });
  const sessions = await SessionModel.listByCourse(course._id);
  res.json({ course, sessions });
});

export default router;
