import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeString(value, { maxLength = 5000, collapseWhitespace = true } = {}) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  const normalized = collapseWhitespace ? trimmed.replace(/\s+/g, " ") : trimmed;
  return normalized.slice(0, maxLength);
}

export function normalizeOptionalString(value, options = {}) {
  return normalizeString(value, options);
}

export function normalizeEmail(value) {
  return normalizeString(value, { maxLength: 254 }).toLowerCase();
}

export function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  if (typeof value === "number") {
    return value === 1 ? true : value === 0 ? false : fallback;
  }
  return fallback;
}

export function normalizeStringArray(value, { maxItems = 20, itemMaxLength = 80 } = {}) {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return items
    .map((item) => normalizeString(item, { maxLength: itemMaxLength }))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function ensureRequiredString(value, field, options = {}) {
  const normalized = normalizeString(value, options);
  if (!normalized) {
    throw new ApiError(422, `${field} is required.`);
  }
  return normalized;
}

export function ensureEmail(value, field = "email") {
  const normalized = normalizeEmail(value);
  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    throw new ApiError(422, `${field} must be a valid email address.`);
  }
  return normalized;
}

export function ensureMinLength(value, field, minLength) {
  if (value.length < minLength) {
    throw new ApiError(422, `${field} must be at least ${minLength} characters long.`);
  }
  return value;
}

export function ensureMaxLength(value, field, maxLength) {
  if (value.length > maxLength) {
    throw new ApiError(422, `${field} must be at most ${maxLength} characters long.`);
  }
  return value;
}

export function ensureEnum(value, allowedValues, field) {
  if (!allowedValues.includes(value)) {
    throw new ApiError(422, `${field} must be one of: ${allowedValues.join(", ")}.`);
  }
  return value;
}

export function ensureObjectId(value, field) {
  const normalized = normalizeString(value, { maxLength: 64 });
  if (!mongoose.Types.ObjectId.isValid(normalized)) {
    throw new ApiError(422, `${field} must be a valid identifier.`);
  }
  return normalized;
}

export function ensureNumericAmount(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new ApiError(422, `${field} must be numeric.`);
  }
  if (numericValue < min || numericValue > max) {
    throw new ApiError(422, `${field} must be between ${min} and ${max}.`);
  }
  return Number(numericValue.toFixed(2));
}

export function ensureInteger(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue)) {
    throw new ApiError(422, `${field} must be an integer.`);
  }
  if (numericValue < min || numericValue > max) {
    throw new ApiError(422, `${field} must be between ${min} and ${max}.`);
  }
  return numericValue;
}

export function ensureOptionalDateTime(value, field) {
  const normalized = normalizeString(value, {
    maxLength: 80,
    collapseWhitespace: false,
  });

  if (!normalized) {
    return "";
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(422, `${field} must be a valid date and time.`);
  }

  return date.toISOString();
}

export function createValidator(requiredFields = []) {
  return function validator(req, _res, next) {
    try {
      const missingFields = requiredFields.filter((field) => {
        const value = req.body?.[field];
        return normalizeString(value) === "";
      });

      if (missingFields.length > 0) {
        throw new ApiError(422, "Validation failed", { missingFields });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function validateObjectIdParam(paramName = "id") {
  return function objectIdParamValidator(req, _res, next) {
    try {
      req.params = {
        ...(req.params || {}),
        [paramName]: ensureObjectId(req.params?.[paramName], paramName),
      };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
