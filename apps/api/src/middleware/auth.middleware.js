import { User } from "../models/index.js";
import { sendError } from "../utils/apiResponse.js";
import { verifyAccessToken } from "../lib/index.js";
import { PLATFORM_MODES } from "../constants/app.constants.js";
import {
  buildModeAccessErrorDetails,
  canAccessDeveloperFeatures,
  canAccessProfessionalFeatures,
  getAvailableAccountModes,
  getModeAccessSnapshot,
} from "../utils/userMode.js";

function getBearerToken(req) {
  const authorizationHeader = req.headers.authorization || "";
  if (!/^Bearer\s+/i.test(authorizationHeader)) {
    return null;
  }

  return authorizationHeader.replace(/^Bearer\s+/i, "").trim();
}

export async function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    req.auth = null;
    return sendError(res, "Authentication required.", 401);
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select("-passwordHash");

    if (!user) {
      return sendError(res, "User not found.", 401);
    }

    if (user.isBlocked || user.status === "blocked" || user.status === "suspended") {
      return sendError(res, "Your account is blocked.", 403);
    }

    if (!user.isEmailVerified || user.status === "pending_verification") {
      return sendError(res, "Please verify your account before accessing protected resources.", 403);
    }

    req.auth = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      mode: getModeAccessSnapshot(user).currentMode,
      availableModes: getAvailableAccountModes(user),
    };
    req.user = user;

    return next();
  } catch (_error) {
    req.auth = null;
    return sendError(res, "Invalid or expired access token.", 401);
  }
}

export function requireRole(_allowedRoles = []) {
  return function roleMiddleware(req, res, next) {
    req.auth = req.auth || null;

    if (!req.auth?.role || !_allowedRoles.includes(req.auth.role)) {
      return sendError(res, "You do not have permission to access this resource.", 403);
    }

    return next();
  };
}

export function requireProfessionalMode(req, res, next) {
  if (!req.user) {
    return sendError(res, "Authentication required.", 401);
  }

  if (canAccessProfessionalFeatures(req.user)) {
    return next();
  }

  return sendError(
    res,
    "Professional Mode is required to use the AI workflow and account PDF tools.",
    403,
    buildModeAccessErrorDetails(req.user, PLATFORM_MODES.PROFESSIONAL),
  );
}

export function requireDeveloperMode(req, res, next) {
  if (!req.user) {
    return sendError(res, "Authentication required.", 401);
  }

  if (canAccessDeveloperFeatures(req.user)) {
    return next();
  }

  const modeDetails = buildModeAccessErrorDetails(req.user, PLATFORM_MODES.DEVELOPER);
  const message = modeDetails.developerUnlocked
    ? "Switch to Developer Mode before publishing or selling PDFs publicly."
    : `Developer Mode is required to upload and sell PDFs publicly. Unlock it for Rs. ${modeDetails.developerUnlockAmountInr}.`;

  return sendError(res, message, 403, modeDetails);
}
