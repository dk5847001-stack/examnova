import mongoose from "mongoose";
import { COLLECTION_NAMES } from "../constants/db.constants.js";
import {
  optionalAcademicTaxonomySchema,
  studyMetadataSchema,
} from "./schemas/academicSchemas.js";

const uploadedDocumentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, required: true, trim: true },
    documentTitle: { type: String, default: "", trim: true },
    mimeType: { type: String, required: true, index: true },
    sizeInBytes: { type: Number, required: true },
    checksum: { type: String, index: true },
    storageKey: { type: String, required: true },
    storageUrl: { type: String },
    documentType: { type: String, default: "study_material" },
    sourceCategory: { type: String, default: "notes", index: true },
    description: { type: String, default: "" },
    academicTaxonomy: { type: optionalAcademicTaxonomySchema, default: () => ({}) },
    studyMetadata: { type: studyMetadataSchema, default: () => ({}) },
    uploadStatus: { type: String, default: "uploaded", index: true },
    parsingStatus: { type: String, default: "pending", index: true },
    status: { type: String, default: "active", index: true },
    extractedText: { type: String, default: "" },
    normalizedText: { type: String, default: "" },
    extractedTextPreview: { type: String, default: "" },
    parsedMetadata: {
      sections: { type: [String], default: [] },
      pageCount: { type: Number, default: 0 },
      wordCount: { type: Number, default: 0 },
      characterCount: { type: Number, default: 0 },
    },
    parsingError: { type: String, default: "" },
    lastParsedAt: { type: Date },
    detectionStatus: { type: String, default: "idle", index: true },
    detectionPrompt: { type: String, default: "" },
    detectionLastRunAt: { type: Date },
    detectionError: { type: String, default: "" },
    parsingSummary: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAMES.UPLOADED_DOCUMENTS,
  },
);

uploadedDocumentSchema.index({ userId: 1, createdAt: -1 });
uploadedDocumentSchema.index({ userId: 1, parsingStatus: 1, status: 1 });

export const UploadedDocument =
  mongoose.models.UploadedDocument || mongoose.model("UploadedDocument", uploadedDocumentSchema);
