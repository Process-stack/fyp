import { scoreResumeWithPages, maskCandidateName } from "../scoring/scoreResume.js";

export function createNameMaskAudit(resumeText, jobDescription, weights, pageCount, originalScore) {
  const maskedResume = maskCandidateName(resumeText);
  if (!maskedResume.masked) {
    return {
      evaluatedAt: new Date(),
      masked: false,
      originalScore,
      maskedScore: originalScore,
      absoluteDifference: 0,
      parityIndex: null,
      interpretation:
        "No likely candidate-name line was detected, so a name-masked comparison could not be performed."
    };
  }

  const maskedResult = scoreResumeWithPages(
    maskedResume.text,
    jobDescription,
    weights,
    pageCount
  );
  const absoluteDifference = Math.abs(originalScore - maskedResult.score);

  return {
    evaluatedAt: new Date(),
    masked: true,
    originalScore,
    maskedScore: maskedResult.score,
    absoluteDifference,
    parityIndex: Math.max(0, 100 - absoluteDifference),
    interpretation:
      "Within-resume name-masking sensitivity only. This is not demographic parity or proof of fairness."
  };
}
