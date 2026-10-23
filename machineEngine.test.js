// Run from project directory: node --test machineEngine.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { extractSkills, parseSkillList, calculateMatch, analyzeCandidate } from "./machineEngine.js";
import { generateRoadmap } from "./roadMap.js";

test("extracts known skills", () => {
  assert.deepEqual(extractSkills("BCA student with SQL, Excel and Python"), ["Excel", "Python", "SQL"]);
});
test("does not confuse JavaScript with Java", () => {
  assert.deepEqual(extractSkills("I use JavaScript and React"), ["JavaScript", "React"]);
});
test("normalizes aliases and duplicates", () => {
  assert.deepEqual(parseSkillList("js, JavaScript, mysql, SQL"), ["JavaScript", "MySQL", "SQL"]);
});
test("parses newline separated skills and keeps unfamiliar skills", () => {
  assert.deepEqual(parseSkillList("Figma\nSQL\nfigma\nAccessibility"), ["Figma", "SQL", "Accessibility"]);
});
test("matches case-insensitive user-entered skills exactly", () => {
  const result = calculateMatch(["Accessibility"], ["accessibility", "Leadership"]);
  assert.deepEqual(result.matchedSkills, ["accessibility"]);
  assert.deepEqual(result.missingSkills, ["Leadership"]);
});
test("extracts more common skills from resume text", () => {
  assert.deepEqual(extractSkills("Built dashboards in Power BI and Tableau; used pandas and PostgreSQL."), ["pandas", "PostgreSQL", "Power BI", "Tableau"]);
});
test("calculates 60 percent for three of five matched skills", () => {
  const result = calculateMatch(["SQL", "Excel", "Python"], ["SQL", "Excel", "Python", "Power BI", "Statistics"]);
  assert.equal(result.score, 60);
  assert.deepEqual(result.missingSkills, ["Power BI", "Statistics"]);
});
test("returns zero when job has no required skills", () => {
  assert.equal(calculateMatch(["SQL"], []).score, 0);
});
test("combines resume and manual skills", () => {
  assert.deepEqual(analyzeCandidate({ resumeText: "SQL", manualSkills: "Excel, SQL" }).detectedSkills, ["SQL", "Excel"]);
});
test("generates roadmap tasks", () => {
  const tasks = generateRoadmap(["Power BI", "Statistics"]);
  assert.equal(tasks.length, 2);
  assert.ok(tasks[0].resource.startsWith("https://"));
});
