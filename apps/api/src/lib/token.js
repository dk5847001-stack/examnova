import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/index.js";

const jwtVerifyOptions = {
  algorithms: ["HS256"],
};

function normalizeToken(token) {
  return typeof token === "string" ? token.trim() : "";
}

export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(normalizeToken(token), env.jwtAccessSecret, jwtVerifyOptions);
}

export function verifyRefreshToken(token) {
  return jwt.verify(normalizeToken(token), env.jwtRefreshSecret, jwtVerifyOptions);
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(normalizeToken(token)).digest("hex");
}
