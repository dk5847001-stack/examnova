import { sendError } from "../utils/apiResponse.js";

const store = new Map();

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim().slice(0, 120);
  }
  return String(req.ip || req.socket?.remoteAddress || "unknown").trim().slice(0, 120);
}

function cleanupBucket(now) {
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

function normalizeIdentity(value) {
  if (typeof value === "string" || typeof value === "number") {
    const normalizedValue = String(value).trim();
    return normalizedValue.slice(0, 160) || "anonymous";
  }

  return "anonymous";
}

function setRateLimitHeaders(res, maxRequests, remainingRequests, resetAt) {
  res.setHeader("X-RateLimit-Limit", String(maxRequests));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(remainingRequests, 0)));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
}

export function createRateLimiter({
  keyPrefix = "global",
  windowMs = 60 * 1000,
  maxRequests = 60,
  message = "Too many requests. Please try again later.",
  keyResolver = null,
} = {}) {
  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    if (store.size > 5000) {
      cleanupBucket(now);
    }

    const identity = normalizeIdentity(keyResolver
      ? keyResolver(req)
      : req.auth?.userId || req.body?.email || getClientIp(req));
    const storageKey = `${keyPrefix}:${identity}`;

    const existing = store.get(storageKey);
    if (!existing || existing.resetAt <= now) {
      const bucket = { count: 1, resetAt: now + windowMs };
      store.set(storageKey, bucket);
      setRateLimitHeaders(res, maxRequests, maxRequests - 1, bucket.resetAt);
      return next();
    }

    existing.count += 1;
    setRateLimitHeaders(res, maxRequests, maxRequests - existing.count, existing.resetAt);
    if (existing.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(Math.max(retryAfterSeconds, 1)));
      return sendError(res, message, 429, {
        retryAfterSeconds: Math.max(retryAfterSeconds, 1),
        rateLimitKey: keyPrefix,
      });
    }

    return next();
  };
}

export const rateLimitPlaceholder = createRateLimiter();
export const authRateLimiter = createRateLimiter({
  keyPrefix: "auth",
  windowMs: 15 * 60 * 1000,
  maxRequests: 8,
  message: "Too many authentication attempts. Please wait before trying again.",
  keyResolver: (req) => req.body?.email || getClientIp(req),
});
export const uploadRateLimiter = createRateLimiter({
  keyPrefix: "upload",
  windowMs: 10 * 60 * 1000,
  maxRequests: 12,
  message: "Too many upload attempts. Please slow down and try again shortly.",
  keyResolver: (req) => req.auth?.userId || getClientIp(req),
});
export const aiActionRateLimiter = createRateLimiter({
  keyPrefix: "ai",
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  message: "Too many AI requests. Please wait a moment before trying again.",
  keyResolver: (req) => req.auth?.userId || getClientIp(req),
});
export const paymentRateLimiter = createRateLimiter({
  keyPrefix: "payment",
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  message: "Too many payment attempts. Please wait before retrying.",
  keyResolver: (req) => req.auth?.userId || getClientIp(req),
});
export const adminActionRateLimiter = createRateLimiter({
  keyPrefix: "admin",
  windowMs: 5 * 60 * 1000,
  maxRequests: 80,
  message: "Too many admin actions in a short time. Please retry shortly.",
  keyResolver: (req) => req.auth?.userId || getClientIp(req),
});
