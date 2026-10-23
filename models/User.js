import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String, required: true, unique: true, lowercase: true, trim: true
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String, enum: ["student", "recruiter", "admin"], default: "student"
    },
    skills: [{ type: String, trim: true }],
    education: { type: String, default: "" },
    targetRole: { type: String, default: "", trim: true, maxlength: 160 },
    resumeUrl: { type: String, default: "" },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }]
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
