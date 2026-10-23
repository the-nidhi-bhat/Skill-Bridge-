
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


SKILL_ALIASES = {
    "python": ["python"],
    "sql": ["sql", "mysql", "postgresql", "sqlite"],
    "excel": ["excel", "microsoft excel", "spreadsheets"],
    "power bi": ["power bi"],
    "tableau": ["tableau"],
    "javascript": ["javascript", "js"],
    "html": ["html"],
    "css": ["css"],
    "react": ["react", "react.js"],
    "node.js": ["node.js", "nodejs"],
    "mongodb": ["mongodb", "mongo db"],
    "machine learning": ["machine learning", "scikit-learn", "sklearn"],
    "data analysis": ["data analysis", "data analytics"],
    "communication": ["communication", "presentation skills"],
    "git": ["git", "github"],
}


def extract_skills(text):
    """Identify known skills mentioned in resume text."""
    text = text.lower()
    found = []

    for skill, aliases in SKILL_ALIASES.items():
        for alias in aliases:
            pattern = r"(?<!\w)" + re.escape(alias) + r"(?!\w)"

            if re.search(pattern, text):
                found.append(skill)
                break

    return sorted(found)


def calculate_similarity(resume_text, job_text):
    """Calculate text similarity using TF-IDF and cosine similarity."""
    if not resume_text.strip() or not job_text.strip():
        return 0.0

    vectorizer = TfidfVectorizer()
    try:
        vectors = vectorizer.fit_transform([resume_text, job_text])
    except ValueError:
        # Very short text (for example, single-letter tokens) can produce an
        # empty vocabulary with TfidfVectorizer's default token pattern.
        return 0.0

    return float(cosine_similarity(vectors[0:1], vectors[1:2])[0][0])


def match_jobs(resume_text, jobs):
    """Rank jobs by skill overlap and text similarity."""
    student_skills = set(extract_skills(resume_text))
    results = []

    for job in jobs:
        required = set(
            skill.lower() for skill in job.get("requiredSkills", [])
        )
        preferred = set(
            skill.lower() for skill in job.get("preferredSkills", [])
        )

        # Recognize only skills supported by our skill dictionary.
        required = required.intersection(SKILL_ALIASES)
        preferred = preferred.intersection(SKILL_ALIASES)

        matched_required = student_skills.intersection(required)
        missing_required = required - student_skills
        matched_preferred = student_skills.intersection(preferred)

        if required:
            skill_score = (
                len(matched_required) / len(required)
            ) * 100
        else:
            skill_score = 100.0 if preferred and student_skills.intersection(preferred) else 0.0

        job_text = " ".join([
            str(job.get("title", "")),
            str(job.get("description", "")),
            " ".join(required),
            " ".join(preferred),
        ])

        similarity = calculate_similarity(resume_text, job_text) * 100

        # Skill overlap is weighted more heavily than text similarity.
        score = round((0.8 * skill_score) + (0.2 * similarity))

        results.append({
            "jobId": str(job.get("_id", job.get("id", ""))),
            "title": job.get("title", "Untitled role"),
            "company": job.get("company", "Company not specified"),
            "matchScore": min(100, max(0, score)),
            "matchedSkills": sorted(matched_required | matched_preferred),
            "missingSkills": sorted(missing_required),
            "skillScore": round(skill_score),
        })

    return sorted(
        results,
        key=lambda item: item["matchScore"],
        reverse=True
    )


def create_learning_roadmap(missing_skills):
    """Suggest a simple learning sequence for missing skills."""
    resources = {
        "python": "Learn Python basics and solve beginner exercises.",
        "sql": "Practise SELECT, WHERE, JOIN, GROUP BY and subqueries.",
        "excel": "Learn formulas, pivot tables and data cleaning.",
        "power bi": "Build dashboards and learn Power Query.",
        "tableau": "Practise charts, filters and interactive dashboards.",
        "javascript": "Learn variables, functions, arrays and DOM basics.",
        "html": "Learn semantic HTML and accessible page structure.",
        "css": "Practise layouts, Flexbox, Grid and responsive design.",
        "react": "Learn components, props, state and hooks.",
        "node.js": "Learn Express routes and REST APIs.",
        "mongodb": "Practise CRUD operations and document modelling.",
        "machine learning": "Learn train/test splits, evaluation and basic models.",
        "data analysis": "Practise cleaning, exploring and explaining datasets.",
        "communication": "Practise explaining projects and presenting findings.",
        "git": "Learn commits, branches, merges and pull requests.",
    }

    return [
        {
            "skill": skill,
            "action": resources.get(
                skill.lower(),
                f"Learn the fundamentals of {skill} and build a small project."
            ),
        }
        for skill in sorted(set(missing_skills))
    ]
