import { API_PREFIX } from "../constants/app.constants.js";

function normalizeStorageKey(value) {
  const normalizedValue = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");

  if (
    !normalizedValue ||
    normalizedValue.includes("\0") ||
    normalizedValue.includes("..") ||
    /^[a-zA-Z]:/.test(normalizedValue)
  ) {
    return "";
  }

  return normalizedValue;
}

function getRequestOrigin(req) {
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req?.protocol || "http";
  const host = req?.get?.("host") || req?.headers?.host || "";

  if (!host) {
    return "";
  }

  return `${protocol}://${host}`;
}

export function buildPublicMediaUrl(req, storageKey, fallbackUrl = "") {
  const normalizedStorageKey = normalizeStorageKey(storageKey);
  if (!normalizedStorageKey) {
    return String(fallbackUrl || "").trim();
  }

  const mediaPath = `${API_PREFIX}/public/media?key=${encodeURIComponent(normalizedStorageKey)}`;
  const origin = getRequestOrigin(req);
  return origin ? `${origin}${mediaPath}` : mediaPath;
}
