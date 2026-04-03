const frontendUpdateModules = import.meta.glob("../../content/frontend-updates/*.json", {
  eager: true,
});

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizeUpdate(entry, fallbackId) {
  return {
    id: String(entry?.id || fallbackId).trim(),
    title: String(entry?.title || "Untitled update").trim(),
    summary: String(entry?.summary || "").trim(),
    area: String(entry?.area || "frontend").trim(),
    status: String(entry?.status || "live").trim(),
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

export function getFrontendUpdates() {
  return Object.entries(frontendUpdateModules)
    .map(([modulePath, moduleValue]) => {
      const fileName = modulePath.split("/").pop() || "frontend-update";
      const fallbackId = fileName.replace(/\.json$/i, "");
      const entry = moduleValue?.default ?? moduleValue;

      return normalizeUpdate(entry, fallbackId);
    })
    .sort(sortUpdatesDescending);
}
