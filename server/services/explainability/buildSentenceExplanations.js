import { contentTerms } from "../scoring/terms.js";

export function buildSentenceExplanations(resumeText, rankedTerms) {
  return resumeText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 25)
    .map((sentence) => {
      const sentenceTerms = new Set(contentTerms(sentence));
      const matchedTerms = rankedTerms
        .filter((item) => sentenceTerms.has(item.term))
        .slice(0, 8)
        .map((item) => item.term);
      return {
        sentence: sentence.slice(0, 700),
        matchedTerms,
        relevance: Math.round(
          rankedTerms.length ? (matchedTerms.length / Math.min(8, rankedTerms.length)) * 100 : 0
        )
      };
    })
    .filter((item) => item.matchedTerms.length > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 12);
}
