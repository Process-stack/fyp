import path from "node:path";
import mongoose from "mongoose";
import { Analysis } from "../models/Analysis.js";
import { extractResume } from "../services/ingestion/extractResume.js";
import { scoreResumeWithPages } from "../services/scoring/scoreResume.js";
import { createNameMaskAudit } from "../services/fairness/nameMaskAudit.js";
import { createAdvisory } from "../services/advisory/createAdvisory.js";
import { createPdfReport } from "../services/export/createPdfReport.js";

function parseWeights(value) {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw Object.assign(new Error("Weights must be a valid JSON object."), { status: 400 });
  }
}

function getAnalysisId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw Object.assign(new Error("Analysis was not found."), { status: 404 });
  }
  return id;
}

function plainObject(value) {
  return typeof value?.toObject === "function" ? value.toObject() : value;
}

export async function createAnalysis(req, res, next) {
  try {
    const jobDescription = String(req.body.jobDescription || "").trim();
    if (jobDescription.length < 30 || jobDescription.length > 50000) {
      throw Object.assign(
        new Error("Job description must contain between 30 and 50,000 characters."),
        { status: 400 }
      );
    }
    const { text, pageCount } = await extractResume(req.file);
    const result = scoreResumeWithPages(text, jobDescription, parseWeights(req.body.weights), pageCount);
    const analysis = await Analysis.create({
      filename: path.basename(req.file.originalname).slice(0, 255),
      jobDescription,
      resumeText: text,
      pageCount,
      ...result
    });
    res.status(201).json({ analysis });
  } catch (error) {
    next(error);
  }
}

export async function listAnalyses(req, res, next) {
  try {
    const analyses = await Analysis.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("-resumeText -jobDescription -explanations");
    res.json({ analyses });
  } catch (error) {
    next(error);
  }
}

export async function getAnalysis(req, res, next) {
  try {
    const analysis = await Analysis.findById(getAnalysisId(req.params.id));
    if (!analysis) return res.status(404).json({ error: "Analysis was not found." });
    res.json({ analysis });
  } catch (error) {
    next(error);
  }
}

export async function deleteAnalysis(req, res, next) {
  try {
    const analysis = await Analysis.findByIdAndDelete(getAnalysisId(req.params.id));
    if (!analysis) return res.status(404).json({ error: "Analysis was not found." });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function runFairnessAudit(req, res, next) {
  try {
    const analysis = await Analysis.findById(getAnalysisId(req.params.id)).select("+resumeText");
    if (!analysis) return res.status(404).json({ error: "Analysis was not found." });
    analysis.fairnessAudit = createNameMaskAudit(
      analysis.resumeText,
      analysis.jobDescription,
      plainObject(analysis.weights),
      analysis.pageCount,
      analysis.score
    );
    await analysis.save();
    res.json({ analysis });
  } catch (error) {
    next(error);
  }
}

export async function requestAdvisory(req, res, next) {
  try {
    const analysis = await Analysis.findById(getAnalysisId(req.params.id)).select("+resumeText");
    if (!analysis) return res.status(404).json({ error: "Analysis was not found." });
    analysis.advisory = await createAdvisory({
      resumeText: analysis.resumeText,
      jobDescription: analysis.jobDescription,
      score: analysis.score,
      pillars: plainObject(analysis.pillars),
      keywords: analysis.keywords
    });
    await analysis.save();
    res.json({ analysis });
  } catch (error) {
    next(error);
  }
}

export async function downloadReport(req, res, next) {
  try {
    const analysis = await Analysis.findById(getAnalysisId(req.params.id));
    if (!analysis) return res.status(404).json({ error: "Analysis was not found." });
    const pdf = await createPdfReport(analysis);
    const safeFilename = analysis.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="analysis-${safeFilename}.pdf"`,
      "Content-Length": pdf.length
    });
    res.send(pdf);
  } catch (error) {
    next(error);
  }
}

export async function compareAnalyses(req, res, next) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length !== 2 || !ids.every(mongoose.isValidObjectId)) {
      throw Object.assign(new Error("Provide exactly two valid analysis IDs."), { status: 400 });
    }
    const found = await Analysis.find({ _id: { $in: ids } }).select(
      "-resumeText -jobDescription -explanations"
    );
    const ordered = ids.map((id) => found.find((item) => item._id.toString() === id));
    if (ordered.some((item) => !item)) {
      return res.status(404).json({ error: "One or both analyses were not found." });
    }
    res.json({ analyses: ordered });
  } catch (error) {
    next(error);
  }
}
