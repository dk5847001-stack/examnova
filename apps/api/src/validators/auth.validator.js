import { ApiError } from "../utils/ApiError.js";
import {
  ensureEmail,
  ensureEnum,
  ensureMinLength,
  ensureRequiredString,
  normalizeString,
} from "./common.js";

const otpPurposes = ["email_verification", "password_reset"];

function validatePassword(password, field = "password") {
  const normalized = ensureRequiredString(password, field, { maxLength: 128, collapseWhitespace: false });
  ensureMinLength(normalized, field, 8);
  return normalized;
}

export function validateSignup(req, _res, next) {
  try {
    req.body = {
      name: ensureRequiredString(req.body?.name, "name", { maxLength: 80 }),
      email: ensureEmail(req.body?.email),
      password: validatePassword(req.body?.password),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateLogin(req, _res, next) {
  try {
    req.body = {
      email: ensureEmail(req.body?.email),
      password: validatePassword(req.body?.password),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateVerifyOtp(req, _res, next) {
  try {
    const otp = ensureRequiredString(req.body?.otp, "otp", { maxLength: 12, collapseWhitespace: false });
    if (!/^\d{4,8}$/.test(otp)) {
      throw new ApiError(422, "otp must be a 4 to 8 digit code.");
    }

    req.body = {
      email: ensureEmail(req.body?.email),
      otp,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateForgotPassword(req, _res, next) {
  try {
    req.body = {
      email: ensureEmail(req.body?.email),
      purpose: normalizeString(req.body?.purpose, { maxLength: 40 }),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateResendOtp(req, _res, next) {
  try {
    const purpose =
      normalizeString(req.body?.purpose, { maxLength: 40 }) || "email_verification";

    req.body = {
      email: ensureEmail(req.body?.email),
      purpose: ensureEnum(purpose, otpPurposes, "purpose"),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateResetPassword(req, _res, next) {
  try {
    const otp = ensureRequiredString(req.body?.otp, "otp", { maxLength: 12, collapseWhitespace: false });
    if (!/^\d{4,8}$/.test(otp)) {
      throw new ApiError(422, "otp must be a 4 to 8 digit code.");
    }

    req.body = {
      email: ensureEmail(req.body?.email),
      otp,
      password: validatePassword(req.body?.password),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}
