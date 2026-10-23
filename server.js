import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/authRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();

const app = express();
const clientBuildPath = fileURLToPath(new URL("./dist/", import.meta.url));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5500"
}));
app.use(express.json({ limit: "1mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Wait a little and try again." }
});
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "You’ve made several AI requests. Please try again in a little while." }
});

app.get("/", (_req, res) => {
  const clientIndex = path.join(clientBuildPath, "index.html");
  if (existsSync(clientIndex)) return res.sendFile(clientIndex);
  res.json({
    message: "SkillBridge API is running",
    version: "1.0.0"
  });
});

app.get("/api/health", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? "OK" : "DEGRADED",
    database: connected ? "connected" : "disconnected"
  });
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/ai", aiRoutes);

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API route not found" });
});

app.use(express.static(clientBuildPath));
app.get("*", (_req, res, next) => {
  const clientIndex = path.join(clientBuildPath, "index.html");
  if (existsSync(clientIndex)) return res.sendFile(clientIndex);
  next();
});
app.use((_req, res) => {
  res.status(404).json({ message: "Page not found" });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET ||
        process.env.JWT_SECRET === "replace_this_with_a_long_random_secret_before_running") {
      throw new Error("Configure MONGO_URI and a unique JWT_SECRET in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`SkillBridge API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
