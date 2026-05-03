import fs from "node:fs/promises";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { ApiError } from "./ApiError.js";

function normalizeBuyerName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function normalizePdfTitle(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 120);
}

function buildWatermarkText(buyerName, title) {
  const normalizedTitle = normalizePdfTitle(title);
  return normalizedTitle ? `${buyerName} • ${normalizedTitle}` : buyerName;
}

export async function personalizePdfDownload(absolutePath, { buyerName, title = "" } = {}) {
  const normalizedBuyerName = normalizeBuyerName(buyerName);

  if (!normalizedBuyerName) {
    throw new ApiError(400, "Buyer name is required to prepare this PDF download.");
  }

  let sourceBytes;

  if (Buffer.isBuffer(absolutePath)) {
    sourceBytes = absolutePath;
  } else {
    try {
      sourceBytes = await fs.readFile(absolutePath);
    } catch {
      throw new ApiError(404, "The PDF file is not available on the server.");
    }
  }

  let pdfDocument;

  try {
    pdfDocument = await PDFDocument.load(sourceBytes, {
      updateMetadata: false,
      ignoreEncryption: true,
    });
  } catch {
    throw new ApiError(500, "Unable to prepare a personalized PDF for this purchase.");
  }

  const accentColor = rgb(0.11, 0.24, 0.47);
  const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const watermarkText = buildWatermarkText(normalizedBuyerName, title);

  for (const page of pdfDocument.getPages()) {
    const { width, height } = page.getSize();
    const diagonalSize = Math.max(22, Math.min(44, width * 0.055));
    const cornerSize = Math.max(8, Math.min(12, width * 0.014));
    const footerSize = Math.max(8, Math.min(10, width * 0.013));
    const diagonalTextWidth = boldFont.widthOfTextAtSize(watermarkText, diagonalSize);
    const centerX = Math.max(22, (width - diagonalTextWidth) / 2);
    const centerY = Math.max(36, height * 0.42);
    const bottomRightTextWidth = regularFont.widthOfTextAtSize(normalizedBuyerName, cornerSize);
    const footerText = `Downloaded for ${normalizedBuyerName}`;
    const footerTextWidth = regularFont.widthOfTextAtSize(footerText, footerSize);

    page.drawText(watermarkText, {
      x: centerX,
      y: centerY,
      size: diagonalSize,
      font: boldFont,
      color: accentColor,
      opacity: 0.11,
      rotate: degrees(32),
    });

    page.drawText(normalizedBuyerName, {
      x: 22,
      y: Math.max(18, height - 26),
      size: cornerSize,
      font: regularFont,
      color: accentColor,
      opacity: 0.38,
    });

    page.drawText(normalizedBuyerName, {
      x: Math.max(22, width - bottomRightTextWidth - 22),
      y: 22,
      size: cornerSize,
      font: regularFont,
      color: accentColor,
      opacity: 0.34,
    });

    page.drawText(footerText, {
      x: Math.max(22, (width - footerTextWidth) / 2),
      y: 14,
      size: footerSize,
      font: regularFont,
      color: accentColor,
      opacity: 0.26,
    });
  }

  const personalizedBytes = await pdfDocument.save();
  return Buffer.from(personalizedBytes);
}
