import { sendSuccess } from "../../utils/apiResponse.js";
import { answerGenerationService } from "../ai/answerGeneration.service.js";
import { pdfGenerationService } from "./pdfGeneration.service.js";

export const pdfController = {
  async listPdfs(req, res) {
    const generations = await pdfGenerationService.listGenerations(req.auth.userId);
    return sendSuccess(res, { generations }, "Generated answer sets fetched successfully.");
  },
  async createPdfGeneration(req, res) {
    const generation = await answerGenerationService.generateAnswers({
      documentId: req.body.documentId,
      userId: req.auth.userId,
      prompt: req.body.prompt,
      questionIds: req.body.questionIds,
      forceRegenerate: req.body.forceRegenerate,
    });

    return sendSuccess(res, { generation }, "Answer generation completed successfully.", 201);
  },
  async getPdfGeneration(req, res) {
    const generation = await pdfGenerationService.getGeneration(req.auth.userId, req.params.id);
    return sendSuccess(res, { generation }, "Generated answer set fetched successfully.");
  },
  async getLatestForDocument(req, res) {
    const generation = await pdfGenerationService.getLatestGenerationForDocument(
      req.auth.userId,
      req.params.documentId,
    );
    return sendSuccess(res, { generation }, "Latest generation fetched successfully.");
  },
  async updateAnswerItems(req, res) {
    const generation = await answerGenerationService.updateAnswerItems(
      req.auth.userId,
      req.params.id,
      req.body.answerItems,
    );
    return sendSuccess(res, { generation }, "Generated answers updated successfully.");
  },
  async renderFinalPdf(req, res) {
    const generation = await pdfGenerationService.renderFinalPdf(req.auth.userId, req.params.id);
    return sendSuccess(res, { generation }, "Final PDF generated successfully.");
  },
  async downloadFinalPdf(req, res) {
    const file = await pdfGenerationService.getDownloadFile(req.auth.userId, req.params.id);
    res.type(file.contentType || "application/pdf");
    res.attachment(file.downloadName);
    return res.send(file.buffer);
  },
};
