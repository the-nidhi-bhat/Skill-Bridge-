// SkillBridge Matching Engine: transparent skill-overlap scoring.
export const SKILL_ALIASES = {
  SQL: ["sql", "structured query language"],
  Excel: ["excel", "microsoft excel", "spreadsheets"],
  Python: ["python"],
  "Power BI": ["power bi", "powerbi"],
  Tableau: ["tableau"],
  Statistics: ["statistics", "statistical analysis"],
  JavaScript: ["javascript", "ecmascript", "js"],
  React: ["react", "react.js", "reactjs"],
  HTML: ["html", "html5"],
  CSS: ["css", "css3"],
  Java: ["java"],
  "C++": ["c++", "cpp"],
  Git: ["git", "github", "version control"],
  MongoDB: ["mongodb", "mongo db"],
  "Node.js": ["node.js", "nodejs"],
  Communication: ["communication", "presentation skills"],
  TypeScript: ["typescript", "ts"],
  "Next.js": ["next.js", "nextjs"],
  Angular: ["angular"],
  Vue: ["vue", "vue.js", "vuejs"],
  Express: ["express", "express.js", "expressjs"],
  "REST APIs": ["rest api", "rest apis", "restful api", "restful apis"],
  PostgreSQL: ["postgresql", "postgres"],
  MySQL: ["mysql"],
  "C#": ["c#", "c sharp", "csharp"],
  "PowerPoint": ["powerpoint", "microsoft powerpoint"],
  "Data analysis": ["data analysis", "data analytics"],
  "Data visualization": ["data visualization", "data viz"],
  "Machine learning": ["machine learning", "ml"],
  "Deep learning": ["deep learning"],
  NLP: ["nlp", "natural language processing"],
  NumPy: ["numpy"],
  pandas: ["pandas"],
  "scikit-learn": ["scikit-learn", "sklearn"],
  Figma: ["figma"],
  "UX research": ["ux research", "user research"],
  "UI design": ["ui design", "interface design"],
  "Product design": ["product design"],
  "Project management": ["project management", "project coordination"],
  Leadership: ["leadership", "team leadership"],
  "Problem solving": ["problem solving", "problem-solving"],
  Research: ["research"],
  Writing: ["writing", "technical writing", "content writing"],
  Marketing: ["marketing", "digital marketing"],
  Sales: ["sales"],
  "Customer support": ["customer support", "customer service"],
  AWS: ["aws", "amazon web services"],
  Azure: ["azure", "microsoft azure"],
  "Google Cloud": ["google cloud", "gcp"],
  Docker: ["docker"],
  Kubernetes: ["kubernetes", "k8s"],
  Linux: ["linux"],
  Agile: ["agile", "agile methodology"],
  "Public speaking": ["public speaking"],
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWholeTerm(text, term) {
  const escaped = escapeRegExp(term);
  const expression = new RegExp(`(^|[^a-z0-9+#])${escaped}(?=$|[^a-z0-9+#])`, "i");
  return expression.test(text);
}

export function normalizeSkill(value) {
  const original = String(value ?? "").trim().replace(/\s+/g, " ");
  const input = original.toLowerCase();
  if (!input) return null;
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (canonical.toLowerCase() === input || aliases.some((alias) => alias.toLowerCase() === input)) {
      return canonical;
    }
  }
  // Keep unfamiliar skills editable and matchable by exact name instead of silently deleting them.
  return original;
}

export function extractSkills(resumeText = "") {
  const text = String(resumeText).toLowerCase();
  const found = [];
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if ([canonical, ...aliases].some((term) => hasWholeTerm(text, term))) found.push(canonical);
  }
  return found.sort((a, b) => a.localeCompare(b));
}

export function parseSkillList(input = "") {
  const values = Array.isArray(input) ? input : String(input).split(/[,;\n]+/);
  const unique = new Map();
  for (const value of values) {
    const skill = normalizeSkill(value);
    if (skill && !unique.has(skill.toLocaleLowerCase())) unique.set(skill.toLocaleLowerCase(), skill);
  }
  return [...unique.values()];
}

export function calculateMatch(studentSkills = [], requiredSkills = []) {
  const student = new Set(parseSkillList(studentSkills).map((skill) => skill.toLocaleLowerCase()));
  const required = [...new Set(parseSkillList(requiredSkills))];
  const matchedSkills = required.filter((skill) => student.has(skill.toLocaleLowerCase()));
  const missingSkills = required.filter((skill) => !student.has(skill.toLocaleLowerCase()));
  const score = required.length ? Math.round((matchedSkills.length / required.length) * 100) : 0;
  return {
    score, matchedSkills, missingSkills,
    totalRequired: required.length,
    totalMatched: matchedSkills.length,
    algorithmVersion: "skill-overlap-v1",
    scoreMeaning: "Percentage of listed required skills matched; not hiring probability.",
  };
}

export function analyzeCandidate({ resumeText = "", manualSkills = [] } = {}) {
  return {
    detectedSkills: parseSkillList([...extractSkills(resumeText), ...parseSkillList(manualSkills)]),
  };
}
