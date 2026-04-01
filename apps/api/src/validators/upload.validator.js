import { ApiError } from "../utils/ApiError.js";
import { normalizeOptionalString } from "./common.js";
import { normalizeAcademicTaxonomy, normalizeStudyMetadata } from "../utils/academicTaxonomy.js";

const allowedSourceCategories = new Set(["notes", "assignment", "question_bank", "study_material"]);

function looksLikePdf(buffer) {
  return buffer?.subarray?.(0, 4)?.toString?.("utf8") === "%PDF";
}

function looksLikeDocx(buffer) {
  return (
    buffer &&
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

function looksLikeText(buffer) {
  if (!buffer || !buffer.length) {
    return false;
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 512));
  let binaryBytes = 0;
  for (const byte of sample) {
    if (byte === 0) {
      return false;
    }
    if (byte < 9 || (byte > 13 && byte < 32)) {
      binaryBytes += 1;
    }
  }
  return binaryBytes / sample.length < 0.05;
}

export function validateUploadRequest(req, _res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, "Please choose a document to upload.");
    }
    if (!req.file.buffer?.length) {
      throw new ApiError(400, "Uploaded document is empty.");
    }

    const sourceCategory = normalizeOptionalString(req.body?.sourceCategory, { maxLength: 40 }) || "notes";
    if (!allowedSourceCategories.has(sourceCategory)) {
      throw new ApiError(422, "Invalid source category.");
    }

    const mimeType = req.file.mimetype;
    const isValidContent =
      (mimeType === "application/pdf" && looksLikePdf(req.file.buffer)) ||
      (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
        looksLikeDocx(req.file.buffer)
      ) ||
      (mimeType === "text/plain" && looksLikeText(req.file.buffer));

    if (!isValidContent) {
      throw new ApiError(415, "Uploaded file content does not match the declared file type.");
    }

    const studyMetadata = normalizeStudyMetadata(req.body || {});

    req.body = {
      sourceCategory,
      description: normalizeOptionalString(req.body?.description, {
        maxLength: 600,
        collapseWhitespace: false,
      }),
      academicTaxonomy: normalizeAcademicTaxonomy(req.body || {}),
      studyMetadata: {
        examFocus: studyMetadata.examFocus,
        questionType: studyMetadata.questionType,
        difficultyLevel: studyMetadata.difficultyLevel,
        intendedAudience: studyMetadata.intendedAudience,
        tags: studyMetadata.tags,
      },
    };

    return next();
  } catch (error) {
    return next(error);
  }
}
