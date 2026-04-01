import { env } from "../../config/index.js";
import { getModeAccessSnapshot } from "../../utils/userMode.js";

export function sanitizeUser(user) {
  return {
    id: user._id?.toString?.() || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isBlocked: Boolean(user.isBlocked || user.status === "blocked"),
    status: user.status,
    modeAccess: getModeAccessSnapshot(user),
    createdAt: user.createdAt,
  };
}

export function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    priority: "high",
    secure: env.isProduction || env.refreshTokenCookieSecure || env.refreshTokenCookieSameSite === "none",
    sameSite: env.refreshTokenCookieSameSite,
    path: "/api/v1/auth",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  };
}
