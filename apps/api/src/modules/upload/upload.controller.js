import { sendSuccess } from "../../utils/apiResponse.js";
import { uploadService } from "./upload.service.js";

export const uploadController = {
  async createUpload(req, res) {
    const document = await uploadService.uploadDocument({
      file: req.file,
      userId: req.auth.userId,
      sourceCategory: req.body.sourceCategory,
      description: req.body.description,
      academicTaxonomy: req.body.academicTaxonomy,
      studyMetadata: req.body.studyMetadata,
    });

    return sendSuccess(res, { document }, "Document uploaded and parsed successfully.", 201);
  },
  async listUploads(req, res) {
    const documents = await uploadService.listDocumentsForUser(req.auth.userId);
    return sendSuccess(res, { documents }, "Documents fetched successfully.");
  },
  async getUpload(req, res) {
    const document = await uploadService.getDocumentForUser(req.params.id, req.auth.userId);
    return sendSuccess(res, { document }, "Document details fetched successfully.");
  },
  async archiveUpload(req, res) {
    const document = await uploadService.archiveDocument(req.params.id, req.auth.userId);
    return sendSuccess(res, { document }, "Document archived successfully.");
  },
  async retryParsing(req, res) {
    const document = await uploadService.retryParsing(req.params.id, req.auth.userId);
    return sendSuccess(res, { document }, "Document parsing retried successfully.");
  },
};
