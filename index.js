import "./loadEnv.js";
import express from "express";
import cookieParser from "cookie-parser";
import mustacheExpress from "mustache-express";
import path from "path";
import { fileURLToPath } from "url";

import courseRoutes from "./routes/courses.js";
import sessionRoutes from "./routes/sessions.js";
import bookingRoutes from "./routes/bookings.js";
import viewRoutes from "./routes/views.js";
import { attachUser } from "./middleware/attachUser.js";
import { initDb } from "./models/_db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// View engine (Mustache)
app.engine(
  "mustache",
  mustacheExpress(path.join(__dirname, "views", "partials"), ".mustache"),
);
app.set("view engine", "mustache");
app.set("views", path.join(__dirname, "views"));

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Static
app.use("/static", express.static(path.join(__dirname, "public")));

// Attach authenticated user to req and res.locals
app.use(attachUser);

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

// SSR view routes
app.use("/", viewRoutes);

// JSON API routes
// app.use('/auth', authRoutes);
app.use("/courses", courseRoutes);
app.use("/sessions", sessionRoutes);
app.use("/bookings", bookingRoutes);

// Errors
export const not_found = (req, res) =>
  res.status(404).type("text/plain").send("404 Not found.");
export const server_error = (err, req, res, next) => {
  console.error(err);
  res.status(500).type("text/plain").send("Internal Server Error.");
};
app.use(not_found);
app.use(server_error);

// Only start the server outside tests
if (process.env.NODE_ENV !== "test") {
  await initDb();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`Yoga booking running on http://localhost:${PORT}`),
  );
}
