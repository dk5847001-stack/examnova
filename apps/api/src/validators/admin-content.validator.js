import { ApiError } from "../utils/ApiError.js";
import {
  ensureNumericAmount,
  ensureObjectId,
  ensureRequiredString,
  normalizeBoolean,
  normalizeOptionalString,
} from "./common.js";
import { normalizeAcademicTaxonomy, normalizeStudyMetadata } from "../utils/academicTaxonomy.js";

function validateTaxonomy(body) {
  return normalizeAcademicTaxonomy(body || {});
}

function validatePrice(priceInr) {
  return ensureNumericAmount(priceInr, "priceInr", { min: 4, max: 10 });
}

function looksLikePdf(buffer) {
  return buffer?.subarray?.(0, 4)?.toString?.("utf8") === "%PDF";
}

function buildSanitizedPayload(body) {
  const studyMetadata = normalizeStudyMetadata(body || {});

  return {
    title: ensureRequiredString(body?.title, "title", { maxLength: 140 }),
    description: normalizeOptionalString(body?.description, { maxLength: 1200 }),
    priceInr: validatePrice(body?.priceInr),
    visibility: normalizeOptionalString(body?.visibility, { maxLength: 20 }).toLowerCase() || "draft",
    tags: studyMetadata.tags,
    studyMetadata: {
      examFocus: studyMetadata.examFocus,
      questionType: studyMetadata.questionType,
      difficultyLevel: studyMetadata.difficultyLevel,
      intendedAudience: studyMetadata.intendedAudience,
    },
    coverImageUrl: normalizeOptionalString(body?.coverImageUrl, { maxLength: 400 }),
    seoTitle: normalizeOptionalString(body?.seoTitle, { maxLength: 160 }),
    seoDescription: normalizeOptionalString(body?.seoDescription, { maxLength: 260 }),
    isFeatured: normalizeBoolean(body?.isFeatured, false),
    taxonomy: validateTaxonomy(body),
  };
}

export function validateAdminUploadCreate(req, _res, next) {
  try {
    if (!req.file) {
      throw new ApiError(422, "A PDF file is required.");
    }
    if (!looksLikePdf(req.file.buffer)) {
      throw new ApiError(415, "Uploaded admin file content is not a valid PDF.");
    }
    req.body = buildSanitizedPayload(req.body || {});
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateAdminUploadUpdate(req, _res, next) {
  try {
    req.body = buildSanitizedPayload(req.body || {});
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateUpcomingLockedCreate(req, _res, next) {
  try {
    req.body = {
      title: ensureRequiredString(req.body?.title, "title", { maxLength: 140 }),
      summary: normalizeOptionalString(req.body?.summary, { maxLength: 1200 }),
      adminUploadId: req.body?.adminUploadId ? ensureObjectId(req.body.adminUploadId, "adminUploadId") : "",
      tags: normalizeStudyMetadata(req.body || {}).tags,
      coverImageUrl: normalizeOptionalString(req.body?.coverImageUrl, { maxLength: 400 }),
      isFeatured: normalizeBoolean(req.body?.isFeatured, false),
      visibility: req.body?.visibility === undefined ? true : normalizeBoolean(req.body?.visibility, true),
      visibilityStartAt: normalizeOptionalString(req.body?.visibilityStartAt, { maxLength: 40 }),
      expectedReleaseAt: normalizeOptionalString(req.body?.expectedReleaseAt, { maxLength: 40 }),
      status: normalizeOptionalString(req.body?.status, { maxLength: 20 }).toLowerCase() || "upcoming",
      taxonomy: validateTaxonomy(req.body),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateUpcomingLockedUpdate(req, _res, next) {
  return validateUpcomingLockedCreate(req, _res, next);
}

export function validateUpcomingLockedAction(req, _res, next) {
  try {
    const action = normalizeOptionalString(req.body?.action, { maxLength: 20 }).toLowerCase();
    const allowedActions = new Set(["schedule", "publish", "archive", "cancel"]);
    if (!allowedActions.has(action)) {
      throw new ApiError(422, "action must be one of schedule, publish, archive, or cancel.");
    }

    req.body = { action };
    return next();
  } catch (error) {
    return next(error);
  }
}
