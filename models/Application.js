import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId, ref: "User", required: true
    },
    resumeUrl: { type: String, default: "" },
    coverLetter: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Applied", "Under Review", "Shortlisted", "Rejected"],
      default: "Applied"
    }
  },
  { timestamps: true }
);

applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

export default mongoose.model("Application", applicationSchema);
