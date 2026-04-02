// middlewares/demoUser.js
import jwt from "jsonwebtoken";
import { UserModel } from "../models/userModel.js";

export const attachDemoUser = async (req, res, next) => {
  res.locals.year = new Date().getFullYear();
  const token = req.cookies?.token;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await UserModel.findByEmail(payload.email);
    if (user) {
      req.user = user;
      res.locals.user = user;
      res.locals.isOrganiser = user.role === "organiser";
    }
  } catch {
    res.clearCookie("token");
  }
  next();
};
