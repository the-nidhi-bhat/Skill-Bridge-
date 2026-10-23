import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/User.js";
import Job from "./models/Job.js";

dotenv.config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = "demo-recruiter@skillbridge.local";
    let recruiter = await User.findOne({ email });

    if (!recruiter) {
      recruiter = await User.create({
        name: "SkillBridge Demo Recruiter",
        email,
        password: "DemoRecruiter123!",
        role: "recruiter"
      });
    }

    const samples = [
      {
        title: "Junior Data Analyst",
        company: "Analytics Labs",
        location: "Bengaluru",
        employmentType: "Full-time",
        description: "Analyze business data, build reports and support decisions.",
        requiredSkills: ["SQL", "Excel", "Statistics"],
        preferredSkills: ["Python", "Power BI"],
        experienceLevel: "Fresher",
        minSalary: 300000,
        maxSalary: 500000
      },
      {
        title: "Frontend Developer Intern",
        company: "WebWorks",
        location: "Remote",
        employmentType: "Internship",
        description: "Build responsive interfaces and integrate REST APIs.",
        requiredSkills: ["HTML", "CSS", "JavaScript"],
        preferredSkills: ["Git", "React"],
        experienceLevel: "Fresher",
        minSalary: 100000,
        maxSalary: 200000
      },
      {
        title: "Junior Python Developer",
        company: "CodeCraft",
        location: "Hyderabad",
        employmentType: "Full-time",
        description: "Develop Python services and work with databases.",
        requiredSkills: ["Python", "SQL", "Git"],
        preferredSkills: ["Flask", "REST APIs"],
        experienceLevel: "Entry-level",
        minSalary: 350000,
        maxSalary: 600000
      }
    ];

    const existingCount = await Job.countDocuments({ postedBy: recruiter._id });
    if (existingCount === 0) {
      await Job.insertMany(samples.map(job => ({ ...job, postedBy: recruiter._id })));
    }

    console.log("Sample jobs are ready. Demo recruiter:", email);
    console.log("Demo password: DemoRecruiter123! (local development only)");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
