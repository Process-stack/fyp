import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, maxlength: 255 },
    jobDescription: { type: String, required: true, maxlength: 50000 },
    resumeText: { type: String, required: true, maxlength: 150000, select: false },
    pageCount: { type: Number, default: 1 },
    score: { type: Number, required: true, min: 0, max: 100 },
    weights: {
      relevance: { type: Number, required: true, min: 0, max: 100 },
      ats: { type: Number, required: true, min: 0, max: 100 },
      formatting: { type: Number, required: true, min: 0, max: 100 }
    },
    pillars: {
      relevance: { type: Number, required: true, min: 0, max: 100 },
      ats: { type: Number, required: true, min: 0, max: 100 },
      formatting: { type: Number, required: true, min: 0, max: 100 }
    },
    keywords: {
      matched: [{ type: String }],
      missing: [{ type: String }]
    },
    explanations: [
      {
        sentence: { type: String, required: true },
        matchedTerms: [{ type: String }],
        relevance: { type: Number, min: 0, max: 100 }
      }
    ],
    metrics: {
      ats: { type: mongoose.Schema.Types.Mixed, required: true },
      formatting: { type: mongoose.Schema.Types.Mixed, required: true }
    },
    fairnessAudit: { type: mongoose.Schema.Types.Mixed, default: null },
    advisory: { type: String, default: null, maxlength: 6000 }
  },
  { timestamps: true, versionKey: false }
);

export const Analysis = mongoose.model("Analysis", analysisSchema);
