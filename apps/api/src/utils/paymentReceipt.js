import fs from "node:fs";
import { fileURLToPath } from "node:url";

import PDFDocument from "pdfkit";

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

const RECEIPT_SHAYARI_IMAGE_PATH = fileURLToPath(
  new URL("../assets/receipt/receipt-shayari-hi.png", import.meta.url),
);

function formatCurrency(amountInr) {
  return CURRENCY_FORMATTER.format(Number(amountInr || 0));
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  try {
    return DATE_TIME_FORMATTER.format(new Date(value));
  } catch {
    return "-";
  }
}

function sanitizeFilenameSegment(value) {
  return String(value || "receipt")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "receipt";
}

function createPdfBuffer(builder) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: 42,
      info: {
        Title: "ExamNova Marketplace Payment Slip",
        Author: "ExamNova AI",
        Subject: "Marketplace payment receipt",
      },
    });

    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    builder(document);
    document.end();
  });
}

function drawMetaCard(document, x, y, width, label, value) {
  document
    .save()
    .roundedRect(x, y, width, 58, 16)
    .fillAndStroke("#F4F8FF", "#D9E7FF")
    .restore();

  document
    .fillColor("#5A75A8")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(label.toUpperCase(), x + 14, y + 12, { width: width - 28 });

  document
    .fillColor("#122346")
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(String(value || "-"), x + 14, y + 28, { width: width - 28 });
}

function drawFittedAmount(document, value, x, y, width) {
  const textValue = String(value || "-");
  let fontSize = 24;

  document.font("Helvetica-Bold");

  while (fontSize > 15) {
    document.fontSize(fontSize);
    if (document.widthOfString(textValue) <= width) {
      break;
    }
    fontSize -= 1;
  }

  document
    .fillColor("#168A63")
    .fontSize(fontSize)
    .font("Helvetica-Bold")
    .text(textValue, x, y, {
      width,
      align: "right",
    });
}

function drawShayariBand(document, x, y, width) {
  document
    .save()
    .roundedRect(x, y, width, 84, 22)
    .fillAndStroke("#FFF9EE", "#FFE3B6")
    .restore();

  document
    .fillColor("#C17A00")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("EXAM SHAYARI", x + 20, y + 12, { characterSpacing: 1.2 });

  if (fs.existsSync(RECEIPT_SHAYARI_IMAGE_PATH)) {
    document.image(RECEIPT_SHAYARI_IMAGE_PATH, x + 20, y + 26, {
      width: width - 40,
    });
    return;
  }

  document
    .fillColor("#193154")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Padhai ka mood bana, receipt bhi saath lai.", x + 20, y + 34, {
      width: width - 40,
      align: "center",
    });
  document
    .fillColor("#1F63FF")
    .fontSize(11)
    .font("Helvetica")
    .text("PDF mil gayi, ab tension gayi bhai.", x + 20, y + 52, {
      width: width - 40,
      align: "center",
    });
}

export async function createMarketplaceReceiptDownload({
  buyerName,
  listing,
  payment,
  purchase,
}) {
  const title = listing?.title || "Marketplace PDF";
  const fileName = `${sanitizeFilenameSegment(title)}-payment-slip.pdf`;
  const amount = formatCurrency(payment?.amountInr ?? purchase?.amountInr ?? listing?.priceInr ?? 0);
  const paymentId = payment?.razorpayPaymentId || payment?.razorpayOrderId || payment?._id?.toString?.() || "-";
  const orderId = payment?.razorpayOrderId || payment?.orderReceipt || "-";
  const purchaseId = purchase?._id?.toString?.() || payment?.purchaseId?.toString?.() || "-";
  const verifiedAt = payment?.verifiedAt || purchase?.accessGrantedAt || new Date();
  const customerName = String(
    buyerName ||
      purchase?.downloadBuyerName ||
      payment?.downloadBuyerName ||
      payment?.guestBuyerName ||
      "ExamNova Buyer",
  ).trim();

  const buffer = await createPdfBuffer((document) => {
    document.rect(0, 0, document.page.width, 165).fill("#0E2A53");
    document
      .fillColor("#6FE8FF")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("EXAMNOVA AI", 42, 34, { characterSpacing: 2.2 });
    document
      .fillColor("#FFFFFF")
      .fontSize(26)
      .font("Helvetica-Bold")
      .text("Marketplace Payment Slip", 42, 56);
    document
      .fillColor("#BFD3F8")
      .fontSize(11)
      .font("Helvetica")
      .text("Secure Razorpay payment verified. Keep this slip with your personalized PDF download.", 42, 92, {
        width: 320,
        lineGap: 2,
      });

    document
      .roundedRect(420, 36, 132, 82, 20)
      .fill("#163B73");
    document
      .fillColor("#9FD7FF")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("STATUS", 448, 56);
    document
      .fillColor("#FFFFFF")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("PAID", 448, 76);

    document
      .fillColor("#5A75A8")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("PURCHASED PDF", 42, 190);
    document
      .fillColor("#122346")
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(title, 42, 208, { width: 510, lineGap: 4 });

    document
      .save()
      .roundedRect(42, 266, 510, 110, 26)
      .fillAndStroke("#FFFFFF", "#D7E7FF")
      .restore();

    document
      .fillColor("#6A83AF")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("BUYER NAME", 66, 290);
    document
      .fillColor("#142C57")
      .fontSize(22)
      .font("Helvetica-Bold")
      .text(customerName, 66, 308, { width: 286 });

    document
      .fillColor("#6A83AF")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("TOTAL PAID", 364, 290, {
        width: 160,
        align: "right",
      });
    drawFittedAmount(document, amount, 350, 308, 174);

    drawMetaCard(document, 42, 402, 246, "Verified at", formatDateTime(verifiedAt));
    drawMetaCard(document, 306, 402, 246, "Payment ID", paymentId);
    drawMetaCard(document, 42, 476, 246, "Order ID", orderId);
    drawMetaCard(document, 306, 476, 246, "Purchase ID", purchaseId);

    document
      .save()
      .roundedRect(42, 564, 510, 124, 26)
      .fillAndStroke("#F8FBFF", "#DCE9FF")
      .restore();

    document
      .fillColor("#4B6697")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("WHAT THIS SLIP CONFIRMS", 62, 586);

    const points = [
      "Payment was verified successfully through secure Razorpay checkout.",
      "The selected PDF is now unlocked for the buyer tied to this transaction.",
      "The entered full name is embedded multiple times inside the downloaded PDF.",
      "Use this slip and the payment ID for any future support request.",
    ];

    points.forEach((point, index) => {
      const rowY = 610 + index * 20;
      document
        .fillColor("#1F63FF")
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("*", 66, rowY);
      document
        .fillColor("#193154")
        .fontSize(11.5)
        .font("Helvetica")
        .text(point, 82, rowY - 1, { width: 440 });
    });

    drawShayariBand(document, 42, 706, 510);

    document
      .fillColor("#6B7FA3")
      .fontSize(9.5)
      .font("Helvetica")
      .text(
        "Generated automatically by ExamNova AI marketplace checkout. This slip is for purchase reference and support only.",
        42,
        802,
        {
          width: 510,
          align: "center",
        },
      );
  });

  return {
    fileName,
    mimeType: "application/pdf",
    contentBase64: buffer.toString("base64"),
  };
}
