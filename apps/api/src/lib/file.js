import crypto from "node:crypto";
import path from "node:path";

export function getFileExtension(filename = "") {
  return path.extname(filename).toLowerCase();
}

export function createSafeFilename(filename = "") {
  const extension = getFileExtension(filename).replace(/[^a-z0-9.]/g, "").slice(0, 12);
  const baseName = path.basename(filename, extension).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 50);
  const uniqueSuffix = crypto.randomBytes(8).toString("hex");
  return `${baseName || "document"}-${uniqueSuffix}${extension}`;
}

export function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
