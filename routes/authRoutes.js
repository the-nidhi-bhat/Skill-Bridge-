import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Job from "../models/Job.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

function makeToken(user) {
  return jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    skills: user.skills,
    education: user.education,
    targetRole: user.targetRole || "",
    resumeUrl: user.resumeUrl,
    savedJobs: (user.savedJobs || []).map(id => id.toString())
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, skills, education, targetRole } = req.body;

    if (typeof name !== "string" || !name.trim() ||
        typeof email !== "string" || !email.trim() ||
        typeof password !== "string") {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters"
      });
    }

    if (role && role !== "student") {
      return res.status(400).json({ message: "Public registration is for student accounts" });
    }

    if (skills !== undefined &&
        (!Array.isArray(skills) || !skills.every(s => typeof s === "string"))) {
      return res.status(400).json({ message: "Skills must be an array of strings" });
    }
    if (targetRole !== undefined && (typeof targetRole !== "string" || targetRole.length > 160)) {
      return res.status(400).json({ message: "Target role must be 160 characters or fewer" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: "student",
      skills: skills || [],
      education: typeof education === "string" ? education : "",
      targetRole: typeof targetRole === "string" ? targetRole.trim() : ""
    });

    return res.status(201).json({
      message: "Registration successful",
      token: makeToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    return res.json({
      message: "Login successful",
      token: makeToken(user),
      user: publicUser(user)
    });
  } catch {
    return res.status(500).json({ message: "Login failed" });
  }
});

router.get("/me", protect, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.patch("/me", protect, async (req, res) => {
  try {
    const { name, education, skills, targetRole } = req.body;
    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
    if (education !== undefined && typeof education !== "string") {
      return res.status(400).json({ message: "Education must be text" });
    }
    if (targetRole !== undefined && (typeof targetRole !== "string" || targetRole.length > 160)) {
      return res.status(400).json({ message: "Target role must be 160 characters or fewer" });
    }
    if (skills !== undefined && (!Array.isArray(skills) || skills.length > 50 || !skills.every(skill => typeof skill === "string" && skill.trim().length <= 60))) {
      return res.status(400).json({ message: "Skills must be a list of up to 50 short text values" });
    }

    if (name !== undefined) req.user.name = name.trim();
    if (education !== undefined) req.user.education = education.trim();
    if (targetRole !== undefined) req.user.targetRole = targetRole.trim();
    if (skills !== undefined) req.user.skills = [...new Set(skills.map(skill => skill.trim()).filter(Boolean))];
    await req.user.save();
    res.json({ message: "Profile updated", user: publicUser(req.user) });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    res.status(500).json({ message: "Could not update profile" });
  }
});

router.patch("/me/saved-jobs", protect, async (req, res) => {
  try {
    const { jobIds } = req.body;
    if (!Array.isArray(jobIds) || jobIds.length > 100 || !jobIds.every(mongoose.isValidObjectId)) {
      return res.status(400).json({ message: "Saved jobs must be a list of up to 100 valid job IDs" });
    }
    const uniqueIds = [...new Set(jobIds.map(id => id.toString()))];
    const validJobs = await Job.countDocuments({ _id: { $in: uniqueIds }, status: "open" });
    if (validJobs !== uniqueIds.length) {
      return res.status(400).json({ message: "One or more saved jobs are no longer open" });
    }
    req.user.savedJobs = uniqueIds;
    await req.user.save();
    res.json({ message: "Saved roles updated", user: publicUser(req.user) });
  } catch {
    res.status(500).json({ message: "Could not update saved roles" });
  }
});

export default router;
