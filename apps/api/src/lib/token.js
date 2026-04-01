import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/index.js";

const jwtVerifyOptions = {
  algorithms: ["HS256"],
};

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
  return jwt.verify(token, env.jwtAccessSecret, jwtVerifyOptions);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret, jwtVerifyOptions);
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
