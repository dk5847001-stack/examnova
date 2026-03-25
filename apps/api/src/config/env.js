import dotenv from "dotenv";

dotenv.config();

const allowedNodeEnvs = new Set(["development", "test", "production"]);
const allowedSameSiteValues = new Set(["lax", "strict", "none"]);

function stripWrappingQuotes(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    return "";
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getEnv(name, fallback = "") {
  const value = stripWrappingQuotes(process.env[name]);

  if (value === "") {
    return typeof fallback === "string" ? stripWrappingQuotes(fallback) : fallback;
  }

  return value;
}

function normalizeUrl(value) {
  const sanitizedValue = stripWrappingQuotes(value);

  if (!sanitizedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(sanitizedValue);
    const normalizedPath = parsedUrl.pathname.replace(/\/+$/, "");
    return `${parsedUrl.origin}${normalizedPath === "/" ? "" : normalizedPath}`;
  } catch {
    return sanitizedValue.replace(/\/+$/, "");
  }
}

function normalizeOrigin(value) {
  const sanitizedValue = stripWrappingQuotes(value);

  if (!sanitizedValue) {
    return "";
  }

  try {
    return new URL(sanitizedValue).origin;
  } catch {
    return sanitizedValue.replace(/\/+$/, "");
  }
}

function getNumber(name, fallback) {
  const value = Number(getEnv(name, fallback));
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be a valid number.`);
  }
  return value;
}

function getBoolean(name, fallback = false) {
  const value = getEnv(name);

  if (value === "") {
    return fallback;
  }

  return String(value).toLowerCase() === "true";
}

function getSameSite(name, fallback = "lax") {
  const value = String(getEnv(name, fallback)).toLowerCase();

  if (!allowedSameSiteValues.has(value)) {
    throw new Error(
      `Environment variable ${name} must be one of: ${Array.from(allowedSameSiteValues).join(", ")}.`,
    );
  }

  return value;
}

function getRequiredEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getStringList(name, fallback) {
  return String(getEnv(name, fallback) || "")
    .split(/[\r\n,]+/)
    .map((value) => stripWrappingQuotes(value.replace(/^\[/, "").replace(/\]$/, "")))
    .filter(Boolean);
}

function getNormalizedOriginList(name, fallback = "") {
  return Array.from(new Set(getStringList(name, fallback).map(normalizeOrigin).filter(Boolean)));
}

const nodeEnv = getEnv("NODE_ENV", "development");

if (!allowedNodeEnvs.has(nodeEnv)) {
  throw new Error(`NODE_ENV must be one of: ${Array.from(allowedNodeEnvs).join(", ")}`);
}

const webAppUrl = normalizeUrl(getEnv("WEB_APP_URL", "http://localhost:5173"));
const publicSiteUrl = normalizeUrl(getEnv("PUBLIC_SITE_URL", "http://localhost:5173"));
const apiBaseUrl = normalizeUrl(getEnv("API_BASE_URL", "http://localhost:4000"));
const defaultCorsAllowedOrigins = [
  normalizeOrigin(webAppUrl),
  normalizeOrigin(publicSiteUrl),
  "https://examnovaai.onrender.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);
const corsAllowedOrigins = Array.from(
  new Set([
    ...defaultCorsAllowedOrigins,
    ...getNormalizedOriginList("CORS_ALLOWED_ORIGINS", ""),
  ]),
);

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  isDevelopment: nodeEnv === "development",
  port: getNumber("PORT", 4000),
  webAppUrl,
  publicSiteUrl,
  apiBaseUrl,
  corsAllowedOrigins,
  mongodbUri: getRequiredEnv("MONGODB_URI"),
  jwtAccessSecret: getRequiredEnv("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: getRequiredEnv("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: getEnv("JWT_ACCESS_EXPIRES_IN", "15m"),
  jwtRefreshExpiresIn: getEnv("JWT_REFRESH_EXPIRES_IN", "30d"),
  refreshTokenCookieName: getEnv("REFRESH_TOKEN_COOKIE_NAME", "examnova_refresh"),
  refreshTokenCookieSecure: getBoolean("REFRESH_TOKEN_COOKIE_SECURE", false),
  refreshTokenCookieSameSite: getSameSite(
    "REFRESH_TOKEN_COOKIE_SAME_SITE",
    nodeEnv === "production" ? "none" : "lax",
  ),
  otpTtlMinutes: getNumber("OTP_TTL_MINUTES", 10),
  otpResendCooldownSeconds: getNumber("OTP_RESEND_COOLDOWN_SECONDS", 60),
  otpMaxAttempts: getNumber("OTP_MAX_ATTEMPTS", 5),
  resetPasswordTtlMinutes: getNumber("RESET_PASSWORD_TTL_MINUTES", 15),
  brevoApiKey: getEnv("BREVO_API_KEY", ""),
  brevoSenderEmail: getEnv("BREVO_SENDER_EMAIL", ""),
  brevoSenderName: getEnv("BREVO_SENDER_NAME", "ExamNova AI"),
  razorpayKeyId: getEnv("RAZORPAY_KEY_ID", ""),
  razorpayKeySecret: getEnv("RAZORPAY_KEY_SECRET", ""),
  razorpayWebhookSecret: getEnv("RAZORPAY_WEBHOOK_SECRET", ""),
  aiProvider: getEnv("AI_PROVIDER", "openai"),
  aiApiKey: getEnv("AI_API_KEY", ""),
  aiModel: getEnv("AI_MODEL", "gpt-5.4"),
  maxUploadSizeMb: getNumber("MAX_UPLOAD_SIZE_MB", 25),
  allowedUploadMimeTypes: getStringList(
    "ALLOWED_UPLOAD_MIME_TYPES",
    "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain",
  ),
  fileStorageDisk: getEnv("FILE_STORAGE_DISK", "local"),
  fileStorageBucket: getEnv("FILE_STORAGE_BUCKET", "examnova-assets"),
  localUploadDir: getEnv("LOCAL_UPLOAD_DIR", "uploads"),
  logLevel: getEnv("LOG_LEVEL", "info"),
  trustProxy: getBoolean("TRUST_PROXY", false),
  requestIdHeader: getEnv("REQUEST_ID_HEADER", "x-request-id"),
};
