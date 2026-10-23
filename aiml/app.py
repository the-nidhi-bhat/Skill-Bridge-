
from flask import Flask, request, jsonify
from ai_engine import match_jobs, extract_skills, create_learning_roadmap

app = Flask(__name__)


@app.post("/match")
def match():
    data = request.get_json(silent=True) or {}

    resume_text = data.get("resumeText", "")
    jobs = data.get("jobs", [])

    if not isinstance(resume_text, str) or not resume_text.strip():
        return jsonify({"error": "resumeText is required"}), 400
    if len(resume_text) > 100000:
        return jsonify({"error": "resumeText must be 100,000 characters or fewer"}), 413

    if not isinstance(jobs, list):
        return jsonify({"error": "jobs must be a list"}), 400
    if any(not isinstance(job, dict) for job in jobs):
        return jsonify({"error": "each job must be an object"}), 400
    for job in jobs:
        for field in ("requiredSkills", "preferredSkills"):
            values = job.get(field, [])
            if not isinstance(values, list) or not all(isinstance(value, str) for value in values):
                return jsonify({"error": f"{field} must be a list of strings"}), 400

    skills = extract_skills(resume_text)
    matches = match_jobs(resume_text, jobs)

    all_missing = sorted({
        skill
        for result in matches
        for skill in result["missingSkills"]
    })

    return jsonify({
        "extractedSkills": skills,
        "matches": matches,
        "learningRoadmap": create_learning_roadmap(all_missing)
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=False)
