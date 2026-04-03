import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_UPDATES_DIR = path.resolve(__dirname, "../../content/platform-updates");

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizeUpdateEntry(entry, fallbackId) {
  return {
    id: String(entry?.id || fallbackId).trim(),
    title: String(entry?.title || "Untitled update").trim(),
    summary: String(entry?.summary || "").trim(),
    area: String(entry?.area || "backend").trim(),
    status: String(entry?.status || "shipped").trim(),
    publishedAt: String(entry?.publishedAt || new Date().toISOString()).trim(),
    tags: normalizeStringList(entry?.tags),
  };
}

function sortUpdatesDescending(left, right) {
  const leftTimestamp = Number(new Date(left.publishedAt || 0));
  const rightTimestamp = Number(new Date(right.publishedAt || 0));

  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  return right.id.localeCompare(left.id);
}

export const publicUpdatesService = {
  async listPlatformUpdates() {
    let fileNames = [];

    try {
      fileNames = await fs.readdir(PLATFORM_UPDATES_DIR);
    } catch (error) {
      if (error?.code === "ENOENT") {
        return [];
      }

      throw error;
    }

    const items = await Promise.all(
      fileNames
        .filter((fileName) => fileName.endsWith(".json"))
        .sort((left, right) => left.localeCompare(right))
        .map(async (fileName) => {
          const filePath = path.join(PLATFORM_UPDATES_DIR, fileName);
          const rawContent = await fs.readFile(filePath, "utf8");
          const parsedContent = JSON.parse(rawContent);
          const fallbackId = fileName.replace(/\.json$/i, "");

          return normalizeUpdateEntry(parsedContent, fallbackId);
        }),
    );

    return items.sort(sortUpdatesDescending);
  },
};
