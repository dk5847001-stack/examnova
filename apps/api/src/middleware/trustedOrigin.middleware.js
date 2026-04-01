import { env } from "../config/index.js";
import { sendError } from "../utils/apiResponse.js";

function getOriginFromReferer(refererHeader) {
  const normalizedReferer = String(refererHeader || "").trim().slice(0, 2048);

  if (!normalizedReferer) {
    return "";
  }

  try {
    return new URL(normalizedReferer).origin;
  } catch {
    return "";
  }
}

function getRequestOrigin(req) {
  const originHeader = String(req.headers.origin || "").trim().slice(0, 300);
  if (originHeader) {
    return originHeader;
  }

  return getOriginFromReferer(req.headers.referer);
}

export function requireTrustedOrigin(req, res, next) {
  const requestOrigin = getRequestOrigin(req);
  const trustedOrigins = new Set(env.corsAllowedOrigins);

  if (!requestOrigin || !trustedOrigins.has(requestOrigin)) {
    return sendError(res, "This request origin is not allowed.", 403, {
      code: "UNTRUSTED_ORIGIN",
    });
  }

  return next();
}
