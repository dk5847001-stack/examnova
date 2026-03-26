import mongoose from "mongoose";
import { COLLECTION_NAMES } from "../constants/db.constants.js";
import { requiredAcademicTaxonomySchema } from "./schemas/academicSchemas.js";

const upcomingLockedPdfSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adminUploadId: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUploadedPdf", default: null },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketplaceListing", default: null },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String, default: "" },
    taxonomy: { type: requiredAcademicTaxonomySchema, required: true },
    tags: [{ type: String, trim: true }],
    coverImageUrl: { type: String, default: "" },
    isFeatured: { type: Boolean, default: false, index: true },
    visibilityStartAt: { type: Date },
    expectedReleaseAt: { type: Date },
    publishedAt: { type: Date, default: null },
    visibility: { type: Boolean, default: true, index: true },
    status: { type: String, default: "draft", index: true },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAMES.UPCOMING_LOCKED_PDFS,
  },
);

upcomingLockedPdfSchema.index({
  status: 1,
  visibility: 1,
  "taxonomy.university": 1,
  "taxonomy.branch": 1,
  "taxonomy.year": 1,
  "taxonomy.semester": 1,
  "taxonomy.subject": 1,
});

export const UpcomingLockedPdf =
  mongoose.models.UpcomingLockedPdf ||
  mongoose.model("UpcomingLockedPdf", upcomingLockedPdfSchema);
