import { ApiError } from "../utils/ApiError.js";
import {
  ensureNumericAmount,
  ensureObjectId,
  ensureRequiredString,
  normalizeOptionalString,
} from "./common.js";
import { normalizeAcademicTaxonomy, normalizeStudyMetadata } from "../utils/academicTaxonomy.js";

function normalizeTaxonomy(body) {
  return normalizeAcademicTaxonomy(body || {});
}

function normalizeVisibility(value, fallback = "draft") {
  const visibility = normalizeOptionalString(value, { maxLength: 20 }).toLowerCase() || fallback;
  if (!["draft", "published", "unlisted"].includes(visibility)) {
    throw new ApiError(422, "visibility must be draft, published, or unlisted.");
  }
  return visibility;
}

function buildSanitizedListingPayload(body, { requireGeneratedPdfId }) {
  const studyMetadata = normalizeStudyMetadata(body || {});

  return {
    ...(requireGeneratedPdfId
      ? { generatedPdfId: ensureObjectId(body?.generatedPdfId, "generatedPdfId") }
      : {}),
    title: ensureRequiredString(body?.title, "title", { maxLength: 140 }),
    description: normalizeOptionalString(body?.description, { maxLength: 1200 }),
    priceInr: ensureNumericAmount(body?.priceInr, "priceInr", { min: 4, max: 10 }),
    visibility: normalizeVisibility(body?.visibility),
    seoTitle: normalizeOptionalString(body?.seoTitle, { maxLength: 160 }),
    seoDescription: normalizeOptionalString(body?.seoDescription, { maxLength: 260 }),
    tags: studyMetadata.tags,
    studyMetadata: {
      examFocus: studyMetadata.examFocus,
      questionType: studyMetadata.questionType,
      difficultyLevel: studyMetadata.difficultyLevel,
      intendedAudience: studyMetadata.intendedAudience,
    },
    taxonomy: normalizeTaxonomy(body),
  };
}

export function validateMarketplaceListing(req, _res, next) {
  try {
    req.body = buildSanitizedListingPayload(req.body || {}, { requireGeneratedPdfId: true });
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateMarketplaceListingUpdate(req, _res, next) {
  try {
    req.body = buildSanitizedListingPayload(req.body || {}, { requireGeneratedPdfId: false });
    return next();
  } catch (error) {
    return next(error);
  }
}
