import mongoose from "mongoose";
import { COLLECTION_NAMES } from "../constants/db.constants.js";
import {
  MARKETPLACE_COVER_SEALS,
  MARKETPLACE_LISTING_CATEGORIES,
} from "../constants/app.constants.js";
import {
  requiredAcademicTaxonomySchema,
  studyMetadataSchema,
} from "./schemas/academicSchemas.js";

const adminUploadedPdfSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketplaceListing", index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeInBytes: { type: Number, required: true },
    storageKey: { type: String, required: true },
    storageUrl: { type: String, default: "" },
    category: { type: String, enum: ["", ...MARKETPLACE_LISTING_CATEGORIES], default: "", index: true },
    priceInr: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    taxonomy: { type: requiredAcademicTaxonomySchema, required: true },
    studyMetadata: { type: studyMetadataSchema, default: () => ({}) },
    tags: [{ type: String, trim: true }],
    coverImageStorageKey: { type: String, default: "" },
    coverImageUrl: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    visibility: { type: String, default: "draft", index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    releaseAt: { type: Date, default: null, index: true },
    coverSeal: { type: String, enum: ["", ...MARKETPLACE_COVER_SEALS], default: "", index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAMES.ADMIN_UPLOADED_PDFS,
  },
);

adminUploadedPdfSchema.index({
  "taxonomy.university": 1,
  "taxonomy.branch": 1,
  "taxonomy.year": 1,
  "taxonomy.semester": 1,
  "taxonomy.subject": 1,
});
adminUploadedPdfSchema.index({ category: 1, createdAt: -1 });

export const AdminUploadedPdf =
  mongoose.models.AdminUploadedPdf ||
  mongoose.model("AdminUploadedPdf", adminUploadedPdfSchema);
