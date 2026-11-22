import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import {
  compareAnalyses,
  createAnalysis,
  deleteAnalysis,
  downloadReport,
  getAnalysis,
  listAnalyses,
  requestAdvisory,
  runFairnessAudit
} from "../controllers/analysisController.js";

const router = Router();
const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 10);
if (!Number.isInteger(maxUploadMb) || maxUploadMb < 1 || maxUploadMb > 50) {
  throw new Error("MAX_UPLOAD_MB must be a whole number between 1 and 50.");
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadMb * 1024 * 1024,
    fieldSize: 50 * 1024,
    fields: 2,
    files: 1,
    parts: 3
  },
  fileFilter: (req, file, callback) => {
    const extension = file.originalname.toLowerCase().split(".").pop();
    if (!["pdf", "docx"].includes(extension)) {
      return callback(Object.assign(new Error("Only PDF and DOCX resumes are supported."), {
        status: 415
      }));
    }
    callback(null, true);
  }
});
const advisoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Advisory request limit reached. Try again later." }
});

router.post("/", upload.single("resume"), createAnalysis);
router.get("/", listAnalyses);
router.post("/compare", compareAnalyses);
router.get("/:id/report", downloadReport);
router.post("/:id/fairness", runFairnessAudit);
router.post("/:id/advisory", advisoryLimiter, requestAdvisory);
router.get("/:id", getAnalysis);
router.delete("/:id", deleteAnalysis);

export default router;
