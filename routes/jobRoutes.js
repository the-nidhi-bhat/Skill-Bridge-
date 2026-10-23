import express from "express";
import mongoose from "mongoose";
import Job from "../models/Job.js";
import { protect, allowRoles } from "../middleware/auth.js";

const router = express.Router();

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const filter = { status: "open" };

    if (typeof req.query.location === "string" && req.query.location.trim()) {
      filter.location = { $regex: escapeRegExp(req.query.location.trim().slice(0, 80)), $options: "i" };
    }
    if (req.query.employmentType) filter.employmentType = req.query.employmentType;
    if (req.query.experienceLevel) filter.experienceLevel = req.query.experienceLevel;
    if (typeof req.query.search === "string" && req.query.search.trim()) filter.$text = { $search: req.query.search.trim().slice(0, 120) };

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("postedBy", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Job.countDocuments(filter)
    ]);

    res.json({ jobs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch {
    res.status(500).json({ message: "Could not fetch jobs" });
  }
});

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid job ID" });
  }

  try {
    const job = await Job.findOne({ _id: req.params.id, status: "open" })
      .populate("postedBy", "name");

    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ job });
  } catch {
    res.status(500).json({ message: "Could not fetch job" });
  }
});

router.post("/", protect, allowRoles("recruiter", "admin"), async (req, res) => {
  try {
    const {
      title, company, description, minSalary, maxSalary,
      requiredSkills, preferredSkills
    } = req.body;

    if (typeof title !== "string" || !title.trim() ||
        typeof company !== "string" || !company.trim() ||
        typeof description !== "string" || !description.trim()) {
      return res.status(400).json({
        message: "Title, company and description are required"
      });
    }

    for (const skills of [requiredSkills, preferredSkills]) {
      if (skills !== undefined &&
          (!Array.isArray(skills) || !skills.every(s => typeof s === "string"))) {
        return res.status(400).json({ message: "Skills must be arrays of strings" });
      }
    }

    if ((minSalary != null && (!Number.isFinite(minSalary) || minSalary < 0)) ||
        (maxSalary != null && (!Number.isFinite(maxSalary) || maxSalary < 0)) ||
        (minSalary != null && maxSalary != null && minSalary > maxSalary)) {
      return res.status(400).json({ message: "Invalid salary range" });
    }

    const job = await Job.create({
      title: title.trim(),
      company: company.trim(),
      description: description.trim(),
      location: req.body.location,
      employmentType: req.body.employmentType,
      requiredSkills: requiredSkills || [],
      preferredSkills: preferredSkills || [],
      minSalary,
      maxSalary,
      experienceLevel: req.body.experienceLevel,
      applicationUrl: req.body.applicationUrl,
      postedBy: req.user._id
    });

    res.status(201).json({ message: "Job created", job });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Could not create job" });
  }
});

router.patch("/:id", protect, allowRoles("recruiter", "admin"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const isOwner = job.postedBy.toString() === req.user._id.toString();
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "You do not own this job" });
    }

    const allowed = [
      "title", "company", "location", "employmentType", "description",
      "requiredSkills", "preferredSkills", "minSalary", "maxSalary",
      "experienceLevel", "applicationUrl", "status"
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) job.set(key, req.body[key]);
    }

    await job.save();
    res.json({ message: "Job updated", job });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Could not update job" });
  }
});

router.delete("/:id", protect, allowRoles("recruiter", "admin"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const isOwner = job.postedBy.toString() === req.user._id.toString();
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "You do not own this job" });
    }

    await job.deleteOne();
    res.json({ message: "Job deleted" });
  } catch {
    res.status(500).json({ message: "Could not delete job" });
  }
});

export default router;
