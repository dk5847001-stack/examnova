import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { ApiError } from "../utils/ApiError.js";

function normalizeExtractedText(text = "") {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildSections(normalizedText) {
  return normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 15)
    .slice(0, 12);
}

export const documentParserService = {
  async parseFile({ absolutePath, mimeType }) {
    const fileBuffer = await fs.readFile(absolutePath);

    if (mimeType === "application/pdf") {
      const parsed = await pdfParse(fileBuffer);
      const normalizedText = normalizeExtractedText(parsed.text || "");
      return {
        extractedText: parsed.text || "",
        normalizedText,
        parsedMetadata: {
          sections: buildSections(normalizedText),
          pageCount: parsed.numpages || 0,
          wordCount: normalizedText ? normalizedText.split(/\s+/).length : 0,
          characterCount: normalizedText.length,
        },
      };
    }

    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const parsed = await mammoth.extractRawText({ path: absolutePath });
      const normalizedText = normalizeExtractedText(parsed.value || "");
      return {
        extractedText: parsed.value || "",
        normalizedText,
        parsedMetadata: {
          sections: buildSections(normalizedText),
          pageCount: 0,
          wordCount: normalizedText ? normalizedText.split(/\s+/).length : 0,
          characterCount: normalizedText.length,
        },
      };
    }

    if (mimeType === "text/plain") {
      const rawText = fileBuffer.toString("utf8");
      const normalizedText = normalizeExtractedText(rawText);
      return {
        extractedText: rawText,
        normalizedText,
        parsedMetadata: {
          sections: buildSections(normalizedText),
          pageCount: 0,
          wordCount: normalizedText ? normalizedText.split(/\s+/).length : 0,
          characterCount: normalizedText.length,
        },
      };
    }

    throw new ApiError(415, `Unsupported file type for parsing: ${mimeType}`);
  },

  buildPreview(normalizedText = "") {
    return normalizedText.slice(0, 1200);
  },

  deriveTitle(originalName = "") {
    const derivedTitle = path.basename(originalName, path.extname(originalName)).replace(/[-_]/g, " ").trim();
    return derivedTitle || "Untitled document";
  },
};
