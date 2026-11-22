import mammoth from "mammoth";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const MAX_EXTRACTED_CHARACTERS = 150000;
const MAX_PDF_PAGES = 50;

export async function extractResume(file) {
  if (!file?.buffer || !file.originalname) {
    throw Object.assign(new Error("Upload a PDF or DOCX resume."), { status: 400 });
  }

  const extension = file.originalname.toLowerCase().split(".").pop();
  let text;
  let pageCount = 1;

  if (extension === "pdf") {
    if (file.buffer.subarray(0, 5).toString() !== "%PDF-") {
      throw Object.assign(new Error("The uploaded file is not a valid PDF."), { status: 400 });
    }
    let pdfDocument;
    try {
      pdfDocument = await getDocument({
        data: new Uint8Array(file.buffer),
        useSystemFonts: true,
        isEvalSupported: false
      }).promise;
      if (pdfDocument.numPages > MAX_PDF_PAGES) {
        throw Object.assign(new Error(`PDFs with more than ${MAX_PDF_PAGES} pages are not supported.`), {
          status: 413
        });
      }
      const pages = [];
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const content = await page.getTextContent();
        let pageText = "";
        let previousY;
        for (const item of content.items) {
          if (!("str" in item) || !item.str.trim()) continue;
          const currentY = item.transform?.[5];
          if (pageText) {
            pageText +=
              Number.isFinite(currentY) &&
              Number.isFinite(previousY) &&
              Math.abs(currentY - previousY) > 2
                ? "\n"
                : " ";
          }
          pageText += item.str;
          if (Number.isFinite(currentY)) previousY = currentY;
        }
        pages.push(pageText);
      }
      text = pages.join("\n");
      pageCount = pdfDocument.numPages;
    } catch (error) {
      if (error.status) throw error;
      throw Object.assign(new Error("The PDF could not be read. Confirm it is not damaged or password-protected."), {
        status: 422
      });
    } finally {
      if (pdfDocument) await pdfDocument.destroy();
    }
  } else if (extension === "docx") {
    if (file.buffer.subarray(0, 2).toString() !== "PK") {
      throw Object.assign(new Error("The uploaded file is not a valid DOCX document."), { status: 400 });
    }
    let parsed;
    try {
      parsed = await mammoth.extractRawText({ buffer: file.buffer });
    } catch {
      throw Object.assign(new Error("The DOCX document could not be read. Confirm it is not damaged."), {
        status: 422
      });
    }
    text = parsed.value;
  } else {
    throw Object.assign(new Error("Only PDF and DOCX resumes are supported."), { status: 415 });
  }

  const normalizedText = String(text || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARACTERS);

  if (normalizedText.length < 40) {
    throw Object.assign(
      new Error("Not enough readable text was extracted. The resume may be scanned; OCR is not supported."),
      { status: 422 }
    );
  }

  return { text: normalizedText, pageCount };
}
