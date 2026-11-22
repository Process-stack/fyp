import test from "node:test";
import assert from "node:assert/strict";
import {
  maskCandidateName,
  normalizeWeights,
  scoreResumeWithPages
} from "../services/scoring/scoreResume.js";
import { createNameMaskAudit } from "../services/fairness/nameMaskAudit.js";

const resumeText = `Alex Morgan
alex.morgan@example.com | +1 555 123 4567 | linkedin.com/in/alexmorgan
SUMMARY
Product analyst with experience using SQL, Python, data analysis, and dashboard development.
EXPERIENCE
Built Python dashboards for business reporting and improved data analysis workflows.
EDUCATION
Bachelor of Science in Information Systems.`;
const jobDescription =
  "We need an analyst with Python, SQL, data analysis, dashboard development, and communication skills.";

test("normalizes supplied scoring weights to exactly 100 percent", () => {
  assert.deepEqual(normalizeWeights({ relevance: 20, ats: 10, formatting: 10 }), {
    relevance: 50,
    ats: 25,
    formatting: 25
  });
  const normalized = Object.values(normalizeWeights({ relevance: 1, ats: 1, formatting: 1 }));
  assert.equal(Math.round(normalized.reduce((sum, value) => sum + value, 0) * 10) / 10, 100);
});

test("rejects weights that cannot produce a meaningful total", () => {
  assert.throws(() => normalizeWeights({ relevance: 0, ats: 0, formatting: 0 }), {
    message: "At least one score weight must be greater than zero."
  });
  assert.throws(() => normalizeWeights({ relevance: -1 }), /from 0 to 100/);
  assert.throws(() => normalizeWeights(null), /JSON object/);
});

test("returns bounded weighted pillar scores and sentence-level term evidence", () => {
  const result = scoreResumeWithPages(
    resumeText,
    jobDescription,
    { relevance: 70, ats: 20, formatting: 10 },
    2
  );
  assert.equal(Object.values(result.weights).reduce((sum, value) => sum + value, 0), 100);
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.ok(Object.values(result.pillars).every((score) => score >= 0 && score <= 100));
  assert.ok(result.keywords.matched.includes("python"));
  assert.ok(result.explanations.some((item) => item.matchedTerms.includes("python")));
  assert.equal(result.metrics.formatting.pageCount, 2);
});

test("masks a likely name line but leaves section headings intact", () => {
  const masked = maskCandidateName(resumeText);
  assert.equal(masked.masked, true);
  assert.match(masked.text, /^\[NAME MASKED\]/);
  assert.deepEqual(maskCandidateName("EXPERIENCE\nBuilt systems").masked, false);
});

test("reports name-mask sensitivity without labeling it demographic parity", () => {
  const result = scoreResumeWithPages(resumeText, jobDescription, undefined, 1);
  const audit = createNameMaskAudit(
    resumeText,
    jobDescription,
    result.weights,
    1,
    result.score
  );
  assert.equal(audit.masked, true);
  assert.equal(audit.parityIndex, 100 - audit.absoluteDifference);
  assert.match(audit.interpretation, /not demographic parity/);
});
