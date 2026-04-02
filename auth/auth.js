import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/userModel.js";

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).render("login", {
        title: "Login",
        error: "Invalid email or password.",
        values: { email },
      });
    }
    const token = jwt.sign(
      { email: user.email, name: user.name },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" },
    );
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });
    next();
  } catch (err) {
    next(err);
  }
};

export const verify = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.redirect("/login");
  try {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    next();
  } catch {
    res.clearCookie("token");
    res.redirect("/login");
  }
};

export const requireOrganiser = (req, res, next) => {
  if (!req.user) return res.redirect("/login");
  if (req.user.role !== "organiser") {
    return res.status(403).render("error", {
      title: "Access denied",
      message: "This area is restricted to organisers.",
    });
  }
  next();
};
