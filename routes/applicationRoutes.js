import express from "express";
import mongoose from "mongoose";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import { protect, allowRoles } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, allowRoles("student"), async (req, res) => {
  try {
    const { jobId, resumeUrl, coverLetter } = req.body;

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Valid jobId is required" });
    }

    const job = await Job.findOne({ _id: jobId, status: "open" });
    if (!job) return res.status(404).json({ message: "Open job not found" });

    const application = await Application.create({
      job: job._id,
      applicant: req.user._id,
      resumeUrl: typeof resumeUrl === "string" ? resumeUrl : req.user.resumeUrl,
      coverLetter: typeof coverLetter === "string" ? coverLetter : ""
    });

    res.status(201).json({ message: "Application submitted", application });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You have already applied for this job" });
    }
    res.status(500).json({ message: "Could not submit application" });
  }
});

router.get("/mine", protect, allowRoles("student"), async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id })
      .populate("job")
      .sort({ createdAt: -1 });

    res.json({ applications });
  } catch {
    res.status(500).json({ message: "Could not fetch applications" });
  }
});

export default router;
