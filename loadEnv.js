import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
const requiredVars = ["ACCESS_TOKEN_SECRET", "PORT"];
const missingVars = requiredVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingVars.join(", ")}`
  );
  process.exit(1);
}

// Optional: Log environment mode
console.log(
  `Environment loaded. Mode: ${process.env.NODE_ENV || "development"}`
);
