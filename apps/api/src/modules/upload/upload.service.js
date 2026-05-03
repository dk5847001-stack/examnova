import { UploadedDocument } from "../../models/index.js";
import { createStorageClient, sha256Buffer } from "../../lib/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { documentParserService } from "../../services/documentParser.service.js";

const storageClient = createStorageClient();

function serializeDocument(document) {
  return {
    id: document._id.toString(),
    documentTitle: document.documentTitle,
    originalName: document.originalName,
    mimeType: document.mimeType,
    sizeInBytes: document.sizeInBytes,
    uploadStatus: document.uploadStatus,
    parsingStatus: document.parsingStatus,
    status: document.status,
    sourceCategory: document.sourceCategory,
    description: document.description || "",
    academicTaxonomy: document.academicTaxonomy || {},
    studyMetadata: document.studyMetadata || {},
    extractedTextPreview: document.extractedTextPreview || "",
    parsedMetadata: document.parsedMetadata || {},
    parsingError: document.parsingError || "",
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function parseAndPersist(document, sourceFile) {
  try {
    document.parsingStatus = "processing";
    document.parsingError = "";
    await document.save();

    const parsedOutput = await documentParserService.parseFile({
      buffer: Buffer.isBuffer(sourceFile) ? sourceFile : null,
      absolutePath: Buffer.isBuffer(sourceFile) ? "" : sourceFile,
      mimeType: document.mimeType,
    });

    document.extractedText = parsedOutput.extractedText;
    document.normalizedText = parsedOutput.normalizedText;
    document.extractedTextPreview = documentParserService.buildPreview(parsedOutput.normalizedText);
    document.parsedMetadata = parsedOutput.parsedMetadata;
    document.parsingSummary = {
      parsingCompleted: true,
      parserVersion: "phase-6",
    };
    document.parsingStatus = parsedOutput.normalizedText ? "completed" : "empty";
    document.lastParsedAt = new Date();
    await document.save();
  } catch (error) {
    document.parsingStatus = "failed";
    document.parsingError = error.message || "Unable to parse uploaded document.";
    document.parsingSummary = {
      parsingCompleted: false,
      parserVersion: "phase-6",
    };
    await document.save();
  }
}

export const uploadService = {
  async uploadDocument({ file, userId, sourceCategory, description, academicTaxonomy, studyMetadata }) {
    if (!file) {
      throw new ApiError(400, "A file upload is required.");
    }

    const checksum = sha256Buffer(file.buffer);
    const storedFile = await storageClient.upload({
      originalName: file.originalname,
      buffer: file.buffer,
      ownerDirectory: userId.toString(),
    });

    const document = await UploadedDocument.create({
      userId,
      originalName: file.originalname,
      documentTitle: documentParserService.deriveTitle(file.originalname),
      mimeType: file.mimetype,
      sizeInBytes: file.size,
      checksum,
      storageKey: storedFile.storageKey,
      storageUrl: storedFile.url,
      sourceCategory: sourceCategory || "notes",
      description: description || "",
      academicTaxonomy: academicTaxonomy || {},
      studyMetadata: studyMetadata || {},
      documentType: "study_material",
      uploadStatus: "uploaded",
      parsingStatus: "pending",
      status: "active",
    });

    await parseAndPersist(document, file.buffer);

    return serializeDocument(document);
  },

  async listDocumentsForUser(userId) {
    const documents = await UploadedDocument.find({
      userId,
      status: { $ne: "archived" },
    })
      .sort({ createdAt: -1 })
      .lean();

    return documents.map((document) => ({
      id: document._id.toString(),
      documentTitle: document.documentTitle,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeInBytes: document.sizeInBytes,
      uploadStatus: document.uploadStatus,
      parsingStatus: document.parsingStatus,
      status: document.status,
      sourceCategory: document.sourceCategory,
      description: document.description || "",
      academicTaxonomy: document.academicTaxonomy || {},
      studyMetadata: document.studyMetadata || {},
      extractedTextPreview: document.extractedTextPreview || "",
      parsedMetadata: document.parsedMetadata || {},
      parsingError: document.parsingError || "",
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    }));
  },

  async getDocumentForUser(documentId, userId) {
    const document = await UploadedDocument.findOne({
      _id: documentId,
      userId,
      status: { $ne: "archived" },
    });

    if (!document) {
      throw new ApiError(404, "Uploaded document not found.");
    }

    return {
      ...serializeDocument(document),
      extractedText: document.extractedText,
      normalizedText: document.normalizedText,
      storageKey: document.storageKey,
      lastParsedAt: document.lastParsedAt,
    };
  },

  async archiveDocument(documentId, userId) {
    const document = await UploadedDocument.findOne({
      _id: documentId,
      userId,
      status: { $ne: "archived" },
    });

    if (!document) {
      throw new ApiError(404, "Uploaded document not found.");
    }

    document.status = "archived";
    document.uploadStatus = "archived";
    await document.save();

    return serializeDocument(document);
  },

  async retryParsing(documentId, userId) {
    const document = await UploadedDocument.findOne({
      _id: documentId,
      userId,
      status: { $ne: "archived" },
    });

    if (!document) {
      throw new ApiError(404, "Uploaded document not found.");
    }

    try {
      const storedFile = await storageClient.read({
        storageKey: document.storageKey,
        storageUrl: document.storageUrl,
      });
      await parseAndPersist(document, storedFile.buffer);
    } catch {
      throw new ApiError(404, "The uploaded source file is missing on the server. Please upload the document again.");
    }

    return this.getDocumentForUser(documentId, userId);
  },
};
