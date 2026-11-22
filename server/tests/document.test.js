import test from "node:test";
import assert from "node:assert/strict";
import PDFDocument from "pdfkit";
import { extractResume } from "../services/ingestion/extractResume.js";
import { createPdfReport } from "../services/export/createPdfReport.js";

function createPdf(text) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument();
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    document.text(text);
    document.end();
  });
}

test("extracts readable text and page count from a PDF resume", async () => {
  const buffer = await createPdf(
    "Jordan Lee. Product analyst with experience in Python, SQL, data analysis, and dashboard development."
  );
  const result = await extractResume({ originalname: "resume.pdf", buffer });
  assert.match(result.text, /Product analyst/);
  assert.equal(result.pageCount, 1);
});

test("rejects a PDF with an invalid file signature", async () => {
  await assert.rejects(
    extractResume({ originalname: "broken.pdf", buffer: Buffer.from("not a PDF") }),
    { status: 400 }
  );
});

test("generates a downloadable PDF report", async () => {
  const report = await createPdfReport({
    filename: "resume.pdf",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    score: 75,
    weights: { relevance: 50, ats: 30, formatting: 20 },
    pillars: { relevance: 80, ats: 70, formatting: 65 },
    keywords: { matched: ["python"], missing: ["leadership"] },
    metrics: {
      ats: {
        detectedSections: ["experience", "education"],
        contact: { email: true, phone: true, professionalLink: false }
      },
      formatting: {
        extractedLines: 5,
        averageLineLength: 48,
        pageCount: 1,
        note: "Text-based layout signals."
      }
    },
    explanations: [],
    fairnessAudit: null,
    advisory: null
  });
  assert.match(report.toString("utf8", 0, 8), /^%PDF-1\./);
  assert.match(report.toString("utf8"), /%%EOF/);
});
