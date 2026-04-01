import crypto from "node:crypto";
import { env } from "../config/index.js";

function normalizeRequestId(value) {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  const sanitizedValue = String(normalizedValue || "")
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, "")
    .slice(0, 120);

  return sanitizedValue || crypto.randomUUID();
}

export function attachRequestContext(req, res, next) {
  const requestId = normalizeRequestId(req.headers[env.requestIdHeader]);

  req.context = {
    requestId,
    startedAt: new Date().toISOString(),
  };

  res.setHeader(env.requestIdHeader, requestId);
  next();
}
