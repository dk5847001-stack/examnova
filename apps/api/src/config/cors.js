import { env } from "./env.js";

function normalizeOrigin(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

function createCorsError(origin) {
  const error = new Error("CORS origin is not allowed.");
  error.statusCode = 403;
  error.details = {
    code: "CORS_ORIGIN_BLOCKED",
  };
  return error;
}

export function createCorsOptions() {
  const allowedOrigins = new Set(env.corsAllowedOrigins.map(normalizeOrigin));

  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, normalizedOrigin);
      }

      return callback(createCorsError(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Request-Id",
      "X-Guest-Purchase-Token",
      "x-guest-purchase-token",
    ],
    exposedHeaders: ["Content-Disposition"],
    optionsSuccessStatus: 204,
    maxAge: 60 * 60 * 24,
  };
}
