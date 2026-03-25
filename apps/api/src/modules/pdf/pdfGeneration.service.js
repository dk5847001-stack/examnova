import path from "node:path";
import { GeneratedPdf } from "../../models/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { createStorageClient } from "../../lib/storage.client.js";
import { pdfContentPreparationService } from "./pdfContentPreparation.service.js";
import { pdfRendererService } from "./pdfRenderer.service.js";

const storageClient = createStorageClient();

function serializeGeneration(record) {
  return {
    id: record._id.toString(),
    title: record.title,
    sourceDocumentId: record.sourceDocumentId?.toString?.() || null,
    generationPrompt: record.generationPrompt || "",
    generationStatus: record.generationStatus,
    failureReason: record.failureReason || "",
    pdfGenerationStatus: record.pdfGenerationStatus || "idle",
    pdfFailureReason: record.pdfFailureReason || "",
    pdfGenerationStartedAt: record.pdfGenerationStartedAt || null,
    pdfGeneratedAt: record.pdfGeneratedAt || null,
    pdfFileName: record.pdfFileName || "",
    pdfSlug: record.pdfSlug || "",
    pdfDownloadName: record.pdfDownloadName || "",
    renderVersion: record.renderVersion || "compact-v1",
    pageCount: record.pageCount || 0,
    storageKey: record.storageKey || "",
    storageUrl: record.storageUrl || "",
    downloadUnlocked: Boolean(record.downloadUnlocked),
    isPaid: Boolean(record.isPaid),
    priceInr: record.priceInr || 4,
    listedInMarketplace: Boolean(record.listedInMarketplace),
    answerSetAcceptedAt: record.answerSetAcceptedAt || null,
    answerItems: (record.answerItems || []).map((item) => ({
      questionId: item.questionId?.toString?.() || item.questionId,
      order: item.order,
      questionText: item.questionText,
      answerText: item.answerText,
      answerSummary: item.answerSummary,
      inferredQuestionType: item.inferredQuestionType,
      figureRequired: item.figureRequired,
      figureType: item.figureType,
      figureInstructions: item.figureInstructions,
      figureMetadata: item.figureMetadata,
      estimatedPageWeight: item.estimatedPageWeight,
      userEdited: item.userEdited,
    })),
    generationSummary: record.generationSummary || {},
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function findOwnedGeneration(userId, generationId) {
  const generation = await GeneratedPdf.findOne({ _id: generationId, userId });
  if (!generation) {
    throw new ApiError(404, "Generated answer set not found.");
  }
  return generation;
}

export const pdfGenerationService = {
  serializeGeneration,

  async listGenerations(userId) {
    const generations = await GeneratedPdf.find({ userId }).sort({ updatedAt: -1 });
    return generations.map(serializeGeneration);
  },

  async getGeneration(userId, generationId) {
    const generation = await findOwnedGeneration(userId, generationId);
    return serializeGeneration(generation);
  },

  async getLatestGenerationForDocument(userId, documentId) {
    const generation = await GeneratedPdf.findOne({
      sourceDocumentId: documentId,
      userId,
    }).sort({ createdAt: -1 });

    return generation ? serializeGeneration(generation) : null;
  },

  async renderFinalPdf(userId, generationId) {
    const generation = await findOwnedGeneration(userId, generationId);

    if (generation.generationStatus !== "completed" || !(generation.answerItems || []).length) {
      throw new ApiError(400, "Generate answers before creating the final PDF.");
    }

    if (generation.pdfGenerationStatus === "processing") {
      throw new ApiError(409, "PDF generation is already in progress.");
    }

    generation.pdfGenerationStatus = "processing";
    generation.pdfFailureReason = "";
    generation.pdfGenerationStartedAt = new Date();
    generation.answerSetAcceptedAt = new Date();
    await generation.save();

    try {
      const preparedContent = pdfContentPreparationService.prepare(generation);
      const renderedPdf = await pdfRendererService.render(preparedContent);
      const baseName = `${preparedContent.slug || "exam-notes"}-${generation._id.toString().slice(-6)}.pdf`;

      if (generation.storageKey) {
        await storageClient.remove(generation.storageKey);
      }

      const uploadResult = await storageClient.upload({
        ownerDirectory: path.join("generated-pdfs", userId.toString()),
        originalName: baseName,
        buffer: renderedPdf.buffer,
      });

      generation.storageKey = uploadResult.storageKey;
      generation.storageUrl = uploadResult.url;
      generation.pageCount = renderedPdf.pageCount;
      generation.pdfFileName = baseName;
      generation.pdfDownloadName = baseName;
      generation.pdfSlug = preparedContent.slug;
      generation.renderVersion = preparedContent.layoutVersion;
      generation.pdfGeneratedAt = new Date();
      generation.pdfGenerationStatus = "completed";
      generation.status = "pdf_ready";
      generation.generationSummary = {
        ...(generation.generationSummary || {}),
        finalPdf: {
          totalQuestions: preparedContent.stats.totalQuestions,
          figureCount: preparedContent.stats.figureCount,
          estimatedWeight: preparedContent.stats.estimatedWeight,
          pageCount: renderedPdf.pageCount,
        },
      };
      await generation.save();

      return serializeGeneration(generation);
    } catch (error) {
      generation.pdfGenerationStatus = "failed";
      generation.pdfFailureReason = error.message || "Final PDF rendering failed.";
      await generation.save();
      throw error;
    }
  },

  async getDownloadFile(userId, generationId) {
    const generation = await findOwnedGeneration(userId, generationId);

    if (generation.pdfGenerationStatus !== "completed" || !generation.storageKey) {
      throw new ApiError(404, "Final PDF is not available yet.");
    }

    if (!generation.downloadUnlocked && !generation.isPaid) {
      throw new ApiError(403, "PDF download is locked until payment is completed.");
    }

    let absolutePath;

    try {
      absolutePath = await storageClient.resolveExisting(generation.storageKey);
    } catch {
      throw new ApiError(404, "Final PDF file is missing on the server. Please render the PDF again.");
    }

    return {
      absolutePath,
      downloadName: generation.pdfDownloadName || generation.pdfFileName || "examnova-notes.pdf",
    };
  },
};
