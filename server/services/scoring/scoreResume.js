import { buildSentenceExplanations } from "../explainability/buildSentenceExplanations.js";
import { contentTerms } from "./terms.js";

const SECTION_PATTERNS = {
  summary: /\b(summary|profile|objective|about me)\b/i,
  experience: /\b(experience|employment|work history|career history)\b/i,
  education: /\b(education|academic|qualifications)\b/i,
  skills: /\b(skills|technologies|competencies|technical proficiencies)\b/i,
  projects: /\b(projects|selected work|portfolio)\b/i,
  certifications: /\b(certifications|licenses|professional development)\b/i
};

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeWeights(input = {}) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw Object.assign(new Error("Weights must be a JSON object."), { status: 400 });
  }
  const defaults = { relevance: 50, ats: 30, formatting: 20 };
  const values = {};
  for (const key of Object.keys(defaults)) {
    const candidate = input[key] === undefined ? defaults[key] : input[key];
    if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate < 0 || candidate > 100) {
      throw Object.assign(new Error(`Weight "${key}" must be a number from 0 to 100.`), {
        status: 400
      });
    }
    values[key] = candidate;
  }

  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    throw Object.assign(new Error("At least one score weight must be greater than zero."), {
      status: 400
    });
  }
  const adjustmentKey = Object.keys(values).reduce((largest, key) =>
    values[key] > values[largest] ? key : largest
  );
  const normalized = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      key === adjustmentKey ? 0 : Math.round((value / total) * 1000) / 10
    ])
  );
  normalized[adjustmentKey] =
    Math.round((100 - Object.entries(normalized).reduce((sum, [key, value]) => (
      key === adjustmentKey ? sum : sum + value
    ), 0)) * 10) / 10;
  return normalized;
}

function keywordAnalysis(resumeText, jobDescription) {
  const jdSentences = jobDescription.split(/[.!?\n]+/).filter((sentence) => sentence.trim());
  const jdTerms = contentTerms(jobDescription);
  const resumeTerms = contentTerms(resumeText);
  const jdFrequency = new Map();
  const jdDocumentFrequency = new Map();

  for (const term of jdTerms) jdFrequency.set(term, (jdFrequency.get(term) || 0) + 1);
  for (const sentence of jdSentences) {
    for (const term of new Set(contentTerms(sentence))) {
      jdDocumentFrequency.set(term, (jdDocumentFrequency.get(term) || 0) + 1);
    }
  }

  const sentenceCount = Math.max(1, jdSentences.length);
  const resumeFrequency = new Map();
  for (const term of resumeTerms) {
    resumeFrequency.set(term, (resumeFrequency.get(term) || 0) + 1);
  }

  const rankedTerms = [...jdFrequency.keys()]
    .map((term) => {
      const tf = jdFrequency.get(term);
      const df = jdDocumentFrequency.get(term) || 0;
      const idf = Math.log(1 + (sentenceCount - df + 0.5) / (df + 0.5));
      const importance = (1 + Math.log(tf)) * idf;
      const frequency = resumeFrequency.get(term) || 0;
      const documentLengthFactor =
        frequency === 0
          ? 0
          : (frequency * 2.2) / (frequency + 1.2 * (0.25 + 0.75 * (resumeTerms.length / 500)));
      return { term, importance, matched: frequency > 0, termScore: importance * documentLengthFactor };
    })
    .sort((a, b) => b.importance - a.importance || a.term.localeCompare(b.term));

  const totalImportance = rankedTerms.reduce((sum, item) => sum + item.importance, 0);
  const matchedImportance = rankedTerms
    .filter((item) => item.matched)
    .reduce((sum, item) => sum + item.importance, 0);
  const bm25Score = rankedTerms.reduce((sum, item) => sum + item.termScore, 0);
  const maxScore = rankedTerms.reduce((sum, item) => sum + item.importance * 2.2, 0);
  const coverage = totalImportance ? matchedImportance / totalImportance : 0;
  const normalizedBm25 = maxScore ? bm25Score / maxScore : 0;
  const score = Math.round(clamp((coverage * 0.75 + normalizedBm25 * 0.25) * 100));

  return {
    score,
    matched: rankedTerms.filter((item) => item.matched).slice(0, 30).map((item) => item.term),
    missing: rankedTerms.filter((item) => !item.matched).slice(0, 30).map((item) => item.term),
    explanations: buildSentenceExplanations(resumeText, rankedTerms)
  };
}

function scoreAts(resumeText) {
  const lines = resumeText.split("\n").map((line) => line.trim()).filter(Boolean);
  const foundSections = Object.entries(SECTION_PATTERNS)
    .filter(([, pattern]) => lines.some((line) => line.length <= 70 && pattern.test(line)))
    .map(([name]) => name);
  const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(resumeText);
  const hasPhone = /(?:\+?\d[\d\s().-]{7,}\d)/.test(resumeText);
  const hasLink = /\b(?:https?:\/\/|www\.|linkedin\.com|github\.com)\S*/i.test(resumeText);
  const bulletLines = lines.filter((line) => /^(?:[-*•▪◦]|\d+[.)])\s/.test(line)).length;
  const bulletRatio = lines.length ? bulletLines / lines.length : 0;
  const replacementChars = (resumeText.match(/\uFFFD/g) || []).length;
  const replacementRatio = resumeText.length ? replacementChars / resumeText.length : 0;
  const score = clamp(
    45 +
      foundSections.length * 6 +
      (hasEmail ? 8 : 0) +
      (hasPhone ? 5 : 0) +
      (hasLink ? 4 : 0) +
      Math.min(8, bulletRatio * 30) -
      Math.min(25, replacementRatio * 1000)
  );

  return {
    score: Math.round(score),
    metrics: {
      detectedSections: foundSections,
      contact: { email: hasEmail, phone: hasPhone, professionalLink: hasLink },
      bulletLines,
      extractedLines: lines.length,
      textExtractionWarnings: replacementChars
    }
  };
}

function scoreFormatting(resumeText, pageCount) {
  const lines = resumeText.split("\n").map((line) => line.trim()).filter(Boolean);
  const lengths = lines.map((line) => line.length);
  const averageLineLength = lengths.length
    ? lengths.reduce((sum, length) => sum + length, 0) / lengths.length
    : 0;
  const veryLongLines = lengths.filter((length) => length > 180).length;
  const emptyLineRatio = resumeText.split("\n").length
    ? (resumeText.match(/\n\s*\n/g) || []).length / resumeText.split("\n").length
    : 0;
  const unusualCharacters = (resumeText.match(/[^\p{L}\p{N}\p{P}\p{Z}\p{S}]/gu) || []).length;
  const unusualRatio = resumeText.length ? unusualCharacters / resumeText.length : 0;
  let score = 88;
  if (averageLineLength > 120) score -= Math.min(18, (averageLineLength - 120) / 4);
  if (averageLineLength < 25) score -= 8;
  score -= Math.min(18, veryLongLines * 2);
  score -= Math.min(12, Math.max(0, emptyLineRatio - 0.22) * 40);
  score -= Math.min(20, unusualRatio * 400);
  if (pageCount > 3) score -= Math.min(10, (pageCount - 3) * 3);

  return {
    score: Math.round(clamp(score)),
    metrics: {
      pageCount,
      extractedLines: lines.length,
      averageLineLength: Math.round(averageLineLength),
      veryLongLines,
      blankLineRatio: Math.round(emptyLineRatio * 100) / 100,
      note: "These are extracted-text heuristics; visual spacing, columns, fonts, and page layout are not inspected."
    }
  };
}

export function scoreResume(resumeText, jobDescription, inputWeights) {
  if (typeof resumeText !== "string" || resumeText.trim().length < 40) {
    throw Object.assign(new Error("Resume text is too short to score."), { status: 422 });
  }
  if (typeof jobDescription !== "string" || jobDescription.trim().length < 30) {
    throw Object.assign(new Error("Job description must contain at least 30 characters."), {
      status: 400
    });
  }

  const weights = normalizeWeights(inputWeights);
  const relevance = keywordAnalysis(resumeText, jobDescription);
  const ats = scoreAts(resumeText);
  const formatting = scoreFormatting(resumeText, 1);
  const pillars = {
    relevance: relevance.score,
    ats: ats.score,
    formatting: formatting.score
  };
  const score = Math.round(
    Object.entries(weights).reduce((total, [key, weight]) => total + pillars[key] * weight, 0) / 100
  );

  return {
    score,
    weights,
    pillars,
    keywords: { matched: relevance.matched, missing: relevance.missing },
    explanations: relevance.explanations,
    metrics: { ats: ats.metrics, formatting: formatting.metrics }
  };
}

export function scoreResumeWithPages(resumeText, jobDescription, inputWeights, pageCount) {
  const result = scoreResume(resumeText, jobDescription, inputWeights);
  const formatting = scoreFormatting(resumeText, pageCount);
  result.pillars.formatting = formatting.score;
  result.metrics.formatting = formatting.metrics;
  result.score = Math.round(
    Object.entries(result.weights).reduce(
      (total, [key, weight]) => total + result.pillars[key] * weight,
      0
    ) / 100
  );
  return result;
}

export function maskCandidateName(resumeText) {
  const lines = resumeText.split("\n");
  const firstContentLineIndex = lines.findIndex((line) => line.trim());
  if (firstContentLineIndex < 0) return { text: resumeText, masked: false };

  const candidateLine = lines[firstContentLineIndex].trim();
  const candidateName = candidateLine.split(/\s+[|•]\s+/)[0].trim();
  const looksLikeName =
    candidateName.length <= 55 &&
    /^[\p{L}][\p{L} .'-]+$/u.test(candidateName) &&
    !Object.values(SECTION_PATTERNS).some((pattern) => pattern.test(candidateName));
  if (!looksLikeName) return { text: resumeText, masked: false };

  lines[firstContentLineIndex] = lines[firstContentLineIndex].replace(
    candidateName,
    "[NAME MASKED]"
  );
  return { text: lines.join("\n"), masked: true };
}
