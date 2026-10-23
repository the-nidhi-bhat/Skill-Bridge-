import test from "node:test";
import assert from "node:assert/strict";
import { File } from "node:buffer";
import { extractResumeText } from "./resumeParser.js";

test("reads text resumes locally", async () => {
  const file = new File(["Skills: SQL and Excel"], "resume.txt", { type: "text/plain" });
  assert.equal(await extractResumeText(file), "Skills: SQL and Excel");
});

test("rejects resumes larger than five megabytes", async () => {
  const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "resume.txt", { type: "text/plain" });
  await assert.rejects(extractResumeText(file), /5 MB or smaller/);
});

test("rejects unsupported resume formats", async () => {
  const file = new File(["resume"], "resume.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  await assert.rejects(extractResumeText(file), /Upload a \.txt or text-based \.pdf/);
});
