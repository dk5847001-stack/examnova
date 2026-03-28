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

const marketplaceListingSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sourcePdfId: { type: mongoose.Schema.Types.ObjectId, ref: "GeneratedPdf" },
    adminUploadId: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUploadedPdf" },
    sourceType: { type: String, default: "generated_pdf", index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    category: { type: String, enum: ["", ...MARKETPLACE_LISTING_CATEGORIES], default: "", index: true },
    priceInr: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    visibility: { type: String, default: "draft", index: true },
    approvalStatus: { type: String, default: "approved", index: true },
    moderationStatus: { type: String, default: "clear", index: true },
    isPublished: { type: Boolean, default: false, index: true },
    taxonomy: { type: requiredAcademicTaxonomySchema, required: true },
    studyMetadata: { type: studyMetadataSchema, default: () => ({}) },
    coverImageStorageKey: { type: String, default: "" },
    coverImageUrl: { type: String },
    previewImages: [{ type: String }],
    tags: [{ type: String }],
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    searchText: { type: String, default: "", index: true },
    viewCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    releaseAt: { type: Date, default: null, index: true },
    coverSeal: { type: String, enum: ["", ...MARKETPLACE_COVER_SEALS], default: "", index: true },
    publishedAt: { type: Date },
    isFeatured: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAMES.MARKETPLACE_LISTINGS,
  },
);

marketplaceListingSchema.index({
  "taxonomy.university": 1,
  "taxonomy.branch": 1,
  "taxonomy.year": 1,
  "taxonomy.semester": 1,
  "taxonomy.subject": 1,
});
marketplaceListingSchema.index(
  { sellerId: 1, sourcePdfId: 1 },
  {
    unique: true,
    partialFilterExpression: { sourcePdfId: { $exists: true, $type: "objectId" } },
  },
);
marketplaceListingSchema.index(
  { sellerId: 1, adminUploadId: 1 },
  {
    unique: true,
    partialFilterExpression: { adminUploadId: { $exists: true, $type: "objectId" } },
  },
);
marketplaceListingSchema.index({ isPublished: 1, publishedAt: -1 });
marketplaceListingSchema.index({ isPublished: 1, releaseAt: 1 });
marketplaceListingSchema.index({ priceInr: 1, publishedAt: -1 });
marketplaceListingSchema.index({ category: 1, isPublished: 1, publishedAt: -1 });

export const MarketplaceListing =
  mongoose.models.MarketplaceListing ||
  mongoose.model("MarketplaceListing", marketplaceListingSchema);
