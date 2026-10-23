import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, default: "India" },
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Internship", "Contract"],
      default: "Full-time"
    },
    description: { type: String, required: true },
    requiredSkills: [{ type: String, trim: true }],
    preferredSkills: [{ type: String, trim: true }],
    minSalary: { type: Number, default: null, min: 0 },
    maxSalary: { type: Number, default: null, min: 0 },
    experienceLevel: {
      type: String,
      enum: ["Fresher", "Entry-level", "Experienced"],
      default: "Fresher"
    },
    applicationUrl: { type: String, default: "" },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: { type: String, enum: ["open", "closed"], default: "open" }
  },
  { timestamps: true }
);

jobSchema.index({ title: "text", company: "text", description: "text" });

export default mongoose.model("Job", jobSchema);
