import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/index.js";
import { createSafeFilename } from "./file.js";

const runtimeRoot = process.cwd();
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function uniquePaths(values = []) {
  return Array.from(new Set(values.filter(Boolean).map((value) => path.resolve(value))));
}

function normalizeStorageKey(storageKey) {
  return String(storageKey || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
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

export function createStorageClient() {
  return {
    async upload(file) {
      const [uploadBaseDir] = getUploadBaseDirs();
      const targetDirectory = path.join(uploadBaseDir, file.ownerDirectory || "documents");
      await fs.mkdir(targetDirectory, { recursive: true });

      const filename = createSafeFilename(file.originalName);
      const absolutePath = path.join(targetDirectory, filename);
      await fs.writeFile(absolutePath, file.buffer);

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
      try {
        const absolutePath = await resolveExistingStoragePath(storageKey);
        await fs.rm(absolutePath, { force: true });
      } catch {
        const absolutePath = resolvePreferredStoragePath(storageKey);
        await fs.rm(absolutePath, { force: true });
      }
    },
    resolve(storageKey) {
      return resolvePreferredStoragePath(storageKey);
    },
    async resolveExisting(storageKey) {
      return resolveExistingStoragePath(storageKey);
    },
  };
}
