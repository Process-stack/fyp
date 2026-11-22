import PDFDocument from "pdfkit";

function addList(document, items, emptyMessage) {
  if (!items.length) {
    document.fontSize(10).fillColor("#64748b").text(emptyMessage);
    return;
  }
  for (const item of items) {
    document.fontSize(10).fillColor("#263449").text(`• ${item}`, { indent: 8 });
  }
}

export function createPdfReport(analysis) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: "Resume analysis report" } });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.fillColor("#182536").fontSize(22).text("Resume Analysis Report");
    document.moveDown(0.35).fontSize(10).fillColor("#64748b").text(
      `File: ${analysis.filename} | Created: ${new Date(analysis.createdAt).toLocaleString()}`
    );
    document.moveDown(0.8).fontSize(16).fillColor("#182536").text(`Overall score: ${analysis.score}/100`);
    document.moveDown(0.4).fontSize(11).text(
      `Relevance ${analysis.pillars.relevance} (weight ${analysis.weights.relevance}%)  |  ATS ${analysis.pillars.ats} (weight ${analysis.weights.ats}%)  |  Formatting ${analysis.pillars.formatting} (weight ${analysis.weights.formatting}%)`
    );

    document.moveDown(1).fontSize(14).text("Keyword analysis");
    document.moveDown(0.3).fontSize(11).text("Matched job-description terms");
    addList(document, analysis.keywords.matched.slice(0, 20), "No matched terms were found.");
    document.moveDown(0.5).fontSize(11).text("Potentially relevant terms not found");
    addList(document, analysis.keywords.missing.slice(0, 20), "No missing terms were identified.");

    document.moveDown(0.8).fontSize(14).text("ATS and formatting signals");
    document.moveDown(0.3).fontSize(10).text(
      `Detected sections: ${analysis.metrics.ats.detectedSections.join(", ") || "none"}`
    );
    document.text(
      `Contact signals: email ${analysis.metrics.ats.contact.email ? "present" : "not found"}, phone ${analysis.metrics.ats.contact.phone ? "present" : "not found"}, professional link ${analysis.metrics.ats.contact.professionalLink ? "present" : "not found"}`
    );
    document.text(
      `Extracted lines: ${analysis.metrics.formatting.extractedLines}; average line length: ${analysis.metrics.formatting.averageLineLength}; pages: ${analysis.pageCount}.`
    );
    document.moveDown(0.25).fillColor("#64748b").text(analysis.metrics.formatting.note);

    if (analysis.explanations.length) {
      document.addPage().fillColor("#182536").fontSize(14).text("Sentence-level evidence");
      document.moveDown(0.5);
      for (const evidence of analysis.explanations.slice(0, 10)) {
        document.fontSize(10).fillColor("#263449").text(evidence.sentence);
        document.fontSize(9).fillColor("#64748b").text(
          `Matched: ${evidence.matchedTerms.join(", ")}`
        );
        document.moveDown(0.4);
      }
    }

    if (analysis.fairnessAudit) {
      document.moveDown(0.4).fontSize(12).fillColor("#182536").text("Name-masking sensitivity");
      document.fontSize(10).fillColor("#263449").text(
        analysis.fairnessAudit.interpretation
      );
      if (analysis.fairnessAudit.parityIndex !== null) {
        document.text(
          `Original score ${analysis.fairnessAudit.originalScore}; masked score ${analysis.fairnessAudit.maskedScore}; sensitivity index ${analysis.fairnessAudit.parityIndex}/100.`
        );
      }
    }

    if (analysis.advisory) {
      document.addPage().fillColor("#182536").fontSize(14).text("Optional AI advisory");
      document.moveDown(0.4).fontSize(10).fillColor("#263449").text(analysis.advisory);
      document.moveDown(0.5).fillColor("#64748b").text(
        "Non-authoritative suggestions; deterministic scores are unchanged."
      );
    }

    document.moveDown(1).fontSize(9).fillColor("#64748b").text(
      "Decision-support output only. Scores are heuristic and should not be used as an automated hiring decision. Formatting measures are based on extracted text, not visual inspection."
    );
    document.end();
  });
}
