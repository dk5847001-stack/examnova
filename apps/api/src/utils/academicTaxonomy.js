import { ApiError } from "./ApiError.js";
import {
  CONTROLLED_ACADEMIC_OPTIONS,
  DEFAULT_UNIVERSITY,
  STUDY_METADATA_OPTIONS,
  findCanonicalOption,
} from "../../../../packages/shared/src/academicTaxonomy.js";
import {
  ensureRequiredString,
  normalizeOptionalString,
  normalizeStringArray,
} from "../validators/common.js";

function ensureControlledChoice(value, field, options, { required = true, fallback = "" } = {}) {
  const normalized = normalizeOptionalString(value, {
    maxLength: 120,
    collapseWhitespace: false,
  });

  if (!normalized) {
    if (required) {
      if (fallback) {
        return fallback;
      }
      throw new ApiError(422, `${field} is required.`);
    }
    return "";
  }

  const matched = findCanonicalOption(normalized, options);
  if (!matched) {
    throw new ApiError(422, `${field} must be one of: ${options.join(", ")}.`);
  }

  return matched;
}

export function normalizeControlledFilterValue(value, field) {
  const normalized = normalizeOptionalString(value, {
    maxLength: 120,
    collapseWhitespace: false,
  });

  if (!normalized) {
    return "";
  }

  const options = CONTROLLED_ACADEMIC_OPTIONS[field];
  if (!options) {
    return normalized;
  }

  return findCanonicalOption(normalized, options) || "";
}

export function normalizeAcademicTaxonomy(payload = {}, { requireSubject = true } = {}) {
  return {
    university: ensureControlledChoice(
      payload.university,
      "university",
      CONTROLLED_ACADEMIC_OPTIONS.university,
      { required: true, fallback: DEFAULT_UNIVERSITY },
    ),
    branch: ensureControlledChoice(payload.branch, "branch", CONTROLLED_ACADEMIC_OPTIONS.branch),
    year: ensureControlledChoice(payload.year, "year", CONTROLLED_ACADEMIC_OPTIONS.year),
    semester: ensureControlledChoice(payload.semester, "semester", CONTROLLED_ACADEMIC_OPTIONS.semester),
    subject: requireSubject
      ? ensureRequiredString(payload.subject, "subject", { maxLength: 120 })
      : normalizeOptionalString(payload.subject, { maxLength: 120 }),
  };
}

export function normalizeAcademicProfile(payload = {}) {
  const hasAcademicInput = [payload.university, payload.branch, payload.year, payload.semester]
    .some((value) => normalizeOptionalString(value, { maxLength: 120 }));

  if (!hasAcademicInput) {
    return {
      university: "",
      branch: "",
      year: "",
      semester: "",
    };
  }

  return {
    university: ensureControlledChoice(
      payload.university || DEFAULT_UNIVERSITY,
      "university",
      CONTROLLED_ACADEMIC_OPTIONS.university,
      { required: true, fallback: DEFAULT_UNIVERSITY },
    ),
    branch: ensureControlledChoice(payload.branch, "branch", CONTROLLED_ACADEMIC_OPTIONS.branch),
    year: ensureControlledChoice(payload.year, "year", CONTROLLED_ACADEMIC_OPTIONS.year),
    semester: ensureControlledChoice(payload.semester, "semester", CONTROLLED_ACADEMIC_OPTIONS.semester),
  };
}

export function normalizeStudyMetadata(payload = {}, { allowBlank = true } = {}) {
  const normalizeOptionalControlledChoice = (value, field, options) =>
    ensureControlledChoice(value, field, options, { required: !allowBlank });

  return {
    examFocus: normalizeOptionalControlledChoice(
      payload.examFocus,
      "examFocus",
      STUDY_METADATA_OPTIONS.examFocus,
    ),
    questionType: normalizeOptionalControlledChoice(
      payload.questionType,
      "questionType",
      STUDY_METADATA_OPTIONS.questionType,
    ),
    difficultyLevel: normalizeOptionalControlledChoice(
      payload.difficultyLevel,
      "difficultyLevel",
      STUDY_METADATA_OPTIONS.difficultyLevel,
    ),
    intendedAudience: normalizeOptionalControlledChoice(
      payload.intendedAudience,
      "intendedAudience",
      STUDY_METADATA_OPTIONS.intendedAudience,
    ),
    tags: normalizeStringArray(payload.tags, { maxItems: 10, itemMaxLength: 40 }),
  };
}
