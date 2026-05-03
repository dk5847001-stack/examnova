import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/index.js";
import { createSafeFilename } from "./file.js";

const runtimeRoot = process.cwd();
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const cloudinaryEnabled = Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);

function uniquePaths(values = []) {
  return Array.from(new Set(values.filter(Boolean).map((value) => path.resolve(value))));
}

function normalizeStorageKey(storageKey) {
  return String(storageKey || "").trim().replace(/\\/g, "/").replace(/^\/+/, "").slice(0, 300);
}

function isUnsafeStorageKey(storageKey) {
  const normalizedStorageKey = normalizeStorageKey(storageKey);

  return (
    !normalizedStorageKey ||
    normalizedStorageKey.includes("\0") ||
    normalizedStorageKey.includes("..") ||
    path.isAbsolute(normalizedStorageKey) ||
    /^[a-zA-Z]:/.test(normalizedStorageKey)
  );
}

function getConfiguredUploadDir() {
  return String(env.localUploadDir || "uploads").trim() || "uploads";
}

function getUploadBaseDirs() {
  const configuredUploadDir = getConfiguredUploadDir();

  if (path.isAbsolute(configuredUploadDir)) {
    return [path.resolve(configuredUploadDir)];
  }

  return uniquePaths([
    path.resolve(runtimeRoot, configuredUploadDir),
    path.resolve(packageRoot, configuredUploadDir),
    path.resolve(repoRoot, configuredUploadDir),
  ]);
}

function resolveWithinBase(baseDir, relativePath) {
  const absolutePath = path.resolve(baseDir, relativePath);
  const relativeFromBase = path.relative(path.resolve(baseDir), absolutePath);

  if (relativeFromBase.startsWith("..") || path.isAbsolute(relativeFromBase)) {
    return null;
  }

  return absolutePath;
}

function buildStorageCandidates(storageKey) {
  const normalizedStorageKey = normalizeStorageKey(storageKey);
  if (!normalizedStorageKey || isUnsafeStorageKey(normalizedStorageKey)) {
    return [];
  }

  const uploadBaseDirs = getUploadBaseDirs();
  const keyVariants = new Set([normalizedStorageKey]);

  if (normalizedStorageKey.startsWith("uploads/")) {
    keyVariants.add(normalizedStorageKey.slice("uploads/".length));
  }

  const absoluteCandidates = [];

  for (const baseDir of uploadBaseDirs) {
    for (const keyVariant of keyVariants) {
      const candidate = resolveWithinBase(baseDir, keyVariant);
      if (candidate) {
        absoluteCandidates.push(candidate);
      }
    }
  }

  return uniquePaths(absoluteCandidates);
}

function resolvePreferredStoragePath(storageKey) {
  const candidates = buildStorageCandidates(storageKey);
  if (!candidates.length) {
    throw new Error("Invalid storage path.");
  }
  return candidates[0];
}

async function resolveExistingStoragePath(storageKey) {
  const candidates = buildStorageCandidates(storageKey);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Keep checking fallback locations for legacy uploads.
    }
  }

  throw new Error(`Stored file was not found for key "${storageKey}".`);
}

function cloudinaryPublicIdFromKey(storageKey) {
  return normalizeStorageKey(storageKey);
}

function buildCloudinaryDeliveryUrl(storageKey) {
  const publicId = cloudinaryPublicIdFromKey(storageKey);
  if (!publicId) {
    throw new Error("Invalid storage path.");
  }

  const encodedPublicId = publicId
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://res.cloudinary.com/${env.cloudinaryCloudName}/raw/upload/${encodedPublicId}`;
}

function buildCloudinarySignature(params = {}) {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto.createHash("sha1").update(`${signatureBase}${env.cloudinaryApiSecret}`).digest("hex");
}

function guessContentType(storageKey, fallback = "application/octet-stream") {
  const extension = path.extname(String(storageKey || "")).toLowerCase();

  if (extension === ".pdf") {
    return "application/pdf";
  }
  if (extension === ".zip") {
    return "application/zip";
  }
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }
  if (extension === ".webp") {
    return "image/webp";
  }

  return fallback;
}

async function fetchCloudinaryBlob(storageKey, storageUrl = "") {
  const url = storageUrl || buildCloudinaryDeliveryUrl(storageKey);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Stored file was not found for key "${storageKey}".`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    buffer,
    contentType: response.headers.get("content-type") || guessContentType(storageKey),
    url,
  };
}

async function uploadToCloudinary(file) {
  const publicId = cloudinaryPublicIdFromKey(
    path.posix.join(
      normalizeStorageKey(file.ownerDirectory || "documents"),
      createSafeFilename(file.originalName),
    ),
  );
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = {
    public_id: publicId,
    timestamp,
    overwrite: "true",
  };
  const signature = buildCloudinarySignature(params);
  const form = new FormData();

  form.append("file", new Blob([file.buffer], { type: file.mimeType || guessContentType(publicId) }), file.originalName);
  form.append("api_key", env.cloudinaryApiKey);
  form.append("timestamp", timestamp);
  form.append("public_id", publicId);
  form.append("overwrite", "true");
  form.append("resource_type", "raw");
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/raw/upload`,
    {
      method: "POST",
      body: form,
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Unable to upload file to Cloudinary.");
  }

  return {
    storageKey: payload.public_id || publicId,
    url: payload.secure_url || payload.url || "",
    absolutePath: "",
  };
}

async function destroyFromCloudinary(storageKey) {
  const publicId = cloudinaryPublicIdFromKey(storageKey);
  if (!publicId) {
    throw new Error("Invalid storage path.");
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params = {
    public_id: publicId,
    timestamp,
    invalidate: "true",
  };
  const signature = buildCloudinarySignature(params);
  const form = new FormData();

  form.append("public_id", publicId);
  form.append("resource_type", "raw");
  form.append("invalidate", "true");
  form.append("api_key", env.cloudinaryApiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/raw/destroy`,
    {
      method: "POST",
      body: form,
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok && payload?.result !== "not found") {
    throw new Error(payload?.error?.message || "Unable to remove file from Cloudinary.");
  }
}

export function createStorageClient() {
  return {
    async upload(file) {
      if (cloudinaryEnabled) {
        return uploadToCloudinary(file);
      }

      const [uploadBaseDir] = getUploadBaseDirs();
      const targetDirectory = path.join(uploadBaseDir, file.ownerDirectory || "documents");
      await fs.mkdir(targetDirectory, { recursive: true });

      const filename = createSafeFilename(file.originalName);
      const absolutePath = path.join(targetDirectory, filename);
      await fs.writeFile(absolutePath, file.buffer, { mode: 0o600 });

      const relativePathFromUploadRoot = path.relative(uploadBaseDir, absolutePath).replace(/\\/g, "/");
      const configuredUploadDir = getConfiguredUploadDir();
      const storageKey = path.isAbsolute(configuredUploadDir)
        ? relativePathFromUploadRoot
        : path.posix.join(normalizeStorageKey(configuredUploadDir), relativePathFromUploadRoot);

      return {
        storageKey,
        url: "",
        absolutePath,
      };
    },
    async remove(storageKey) {
      if (cloudinaryEnabled) {
        try {
          await destroyFromCloudinary(storageKey);
        } catch {
          // Keep delete flows resilient if the remote file already disappeared.
        }
        return;
      }

      try {
        const absolutePath = await resolveExistingStoragePath(storageKey);
        await fs.rm(absolutePath, { force: true });
      } catch {
        const absolutePath = resolvePreferredStoragePath(storageKey);
        await fs.rm(absolutePath, { force: true });
      }
    },
    async read(storageRef) {
      const storageKey =
        typeof storageRef === "string" ? storageRef : storageRef?.storageKey || storageRef?.key || "";
      const storageUrl = typeof storageRef === "object" ? storageRef?.storageUrl || "" : "";

      if (!storageKey) {
        throw new Error("Invalid storage path.");
      }

      if (cloudinaryEnabled) {
        return fetchCloudinaryBlob(storageKey, storageUrl);
      }

      const absolutePath = await resolveExistingStoragePath(storageKey);
      const buffer = await fs.readFile(absolutePath);

      return {
        buffer,
        contentType: guessContentType(storageKey),
        absolutePath,
        url: "",
      };
    },
    resolve(storageKey) {
      if (cloudinaryEnabled) {
        return buildCloudinaryDeliveryUrl(storageKey);
      }

      return resolvePreferredStoragePath(storageKey);
    },
    async resolveExisting(storageKey) {
      if (cloudinaryEnabled) {
        const file = await fetchCloudinaryBlob(storageKey);
        return file.url;
      }

      return resolveExistingStoragePath(storageKey);
    },
  };
}
