import {
  AdminUploadedPdf,
  AuditLog,
  MarketplaceListing,
  UpcomingLockedPdf,
} from "../../models/index.js";
import { createStorageClient } from "../../lib/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { slugify } from "../../utils/slugify.js";
import { normalizeAcademicTaxonomy, normalizeStudyMetadata } from "../../utils/academicTaxonomy.js";

const storageClient = createStorageClient();
const ADMIN_UPLOAD_VISIBILITY = new Set(["draft", "published", "unlisted", "archived"]);
const UPCOMING_STATUS = new Set(["draft", "upcoming", "published", "archived", "cancelled"]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item).toLowerCase()).filter(Boolean).slice(0, 10);
  }

  return normalizeText(value)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);
}

function normalizeTaxonomy(payload) {
  return normalizeAcademicTaxonomy(payload || {});
}

function ensurePrice(priceInr) {
  const numericPrice = Number(priceInr);
  if (!Number.isFinite(numericPrice) || numericPrice < 4 || numericPrice > 10) {
    throw new ApiError(422, "priceInr must be between Rs. 4 and Rs. 10.");
  }
  return numericPrice;
}

function ensureVisibility(visibility) {
  const normalized = normalizeText(visibility || "draft").toLowerCase();
  if (!ADMIN_UPLOAD_VISIBILITY.has(normalized)) {
    throw new ApiError(422, "visibility must be draft, published, unlisted, or archived.");
  }
  return normalized;
}

function ensureUpcomingStatus(status) {
  const normalized = normalizeText(status || "draft").toLowerCase();
  if (!UPCOMING_STATUS.has(normalized)) {
    throw new ApiError(422, "status must be draft, upcoming, published, archived, or cancelled.");
  }
  return normalized;
}

function buildSearchText({ title, description, taxonomy, studyMetadata, tags }) {
  return [
    title,
    description,
    taxonomy?.subject,
    taxonomy?.semester,
    taxonomy?.branch,
    taxonomy?.university,
    studyMetadata?.examFocus,
    studyMetadata?.questionType,
    studyMetadata?.difficultyLevel,
    studyMetadata?.intendedAudience,
    ...(tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

async function buildUniqueListingSlug(baseText, excludeId = null) {
  const baseSlug = slugify(baseText) || `admin-pdf-${Date.now()}`;
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await MarketplaceListing.findOne({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).select("_id");

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

async function buildUniqueUpcomingSlug(baseText, excludeId = null) {
  const baseSlug = slugify(baseText) || `upcoming-pdf-${Date.now()}`;
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await UpcomingLockedPdf.findOne({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).select("_id");

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}

function serializeAdminUpload(record) {
  return {
    id: record._id.toString(),
    adminId: record.adminId?._id?.toString?.() || record.adminId?.toString?.() || null,
    adminName: record.adminId?.name || "ExamNova Admin",
    listingId: record.listingId?._id?.toString?.() || record.listingId?.toString?.() || null,
    title: record.title,
    description: record.description || "",
    originalName: record.originalName,
    mimeType: record.mimeType,
    sizeInBytes: record.sizeInBytes,
    priceInr: record.priceInr,
    currency: record.currency || "INR",
    taxonomy: record.taxonomy,
    studyMetadata: record.studyMetadata || {},
    tags: record.tags || [],
    coverImageUrl: record.coverImageUrl || "",
    seoTitle: record.seoTitle || "",
    seoDescription: record.seoDescription || "",
    visibility: record.visibility,
    isFeatured: Boolean(record.isFeatured),
    publishedAt: record.publishedAt || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function serializeUpcoming(record) {
  return {
    id: record._id.toString(),
    adminId: record.adminId?._id?.toString?.() || record.adminId?.toString?.() || null,
    adminName: record.adminId?.name || "ExamNova Admin",
    adminUploadId: record.adminUploadId?._id?.toString?.() || record.adminUploadId?.toString?.() || null,
    listingId: record.listingId?._id?.toString?.() || record.listingId?.toString?.() || null,
    title: record.title,
    slug: record.slug,
    summary: record.summary || "",
    taxonomy: record.taxonomy,
    tags: record.tags || [],
    coverImageUrl: record.coverImageUrl || "",
    isFeatured: Boolean(record.isFeatured),
    visibility: Boolean(record.visibility),
    visibilityStartAt: record.visibilityStartAt || null,
    expectedReleaseAt: record.expectedReleaseAt || null,
    publishedAt: record.publishedAt || null,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function syncListingFromAdminUpload(record) {
  const visibility = ensureVisibility(record.visibility);
  const slug = await buildUniqueListingSlug(
    `${record.title}-${record.taxonomy.subject}-${record.taxonomy.semester}`,
    record.listingId,
  );

  const listingPayload = {
    sellerId: record.adminId,
    adminUploadId: record._id,
    sourceType: "admin_upload",
    title: record.title,
    slug,
    description: record.description || "",
    priceInr: record.priceInr,
    currency: record.currency || "INR",
    visibility,
    approvalStatus: "approved",
    moderationStatus: "clear",
    isPublished: visibility === "published",
    taxonomy: record.taxonomy,
    studyMetadata: record.studyMetadata || {},
    coverImageUrl: record.coverImageUrl || "",
    tags: record.tags || [],
    seoTitle: record.seoTitle || record.title,
    seoDescription: record.seoDescription || (record.description || "").slice(0, 150),
    searchText: buildSearchText({
      title: record.title,
      description: record.description,
      taxonomy: record.taxonomy,
      studyMetadata: record.studyMetadata,
      tags: record.tags,
    }),
    publishedAt: visibility === "published" ? record.publishedAt || new Date() : null,
    isFeatured: Boolean(record.isFeatured),
  };

  let listing;
  if (record.listingId) {
    listing = await MarketplaceListing.findByIdAndUpdate(record.listingId, listingPayload, { new: true });
  } else {
    listing = await MarketplaceListing.create(listingPayload);
    record.listingId = listing._id;
  }

  record.publishedAt = visibility === "published" ? record.publishedAt || new Date() : null;
  await record.save();

  return listing;
}

async function createAuditLog(action, actor, req, targetType, targetId, after) {
  await AuditLog.create({
    actorId: actor?._id || actor?.id || null,
    actorRole: actor?.role || "",
    action,
    entityType: targetType,
    entityId: targetId,
    requestId: req?.context?.requestId || "",
    ipAddress: req?.ip || req?.headers?.["x-forwarded-for"] || "",
    after,
  });
}

export const adminContentService = {
  async listAdminUploads() {
    const items = await AdminUploadedPdf.find()
      .populate("adminId", "name")
      .sort({ createdAt: -1 });

    return items.map(serializeAdminUpload);
  },

  async createAdminUpload({ actor, payload, file, req }) {
    if (!file) {
      throw new ApiError(422, "A PDF file is required.");
    }

    const taxonomy = payload.taxonomy || normalizeTaxonomy(payload);
    const visibility = ensureVisibility(payload.visibility);
    const uploadedFile = await storageClient.upload({
      originalName: file.originalname,
      buffer: file.buffer,
      ownerDirectory: "admin-content",
    });

    const record = await AdminUploadedPdf.create({
      adminId: actor.id || actor._id,
      title: normalizeText(payload.title),
      description: normalizeText(payload.description),
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeInBytes: file.size,
      storageKey: uploadedFile.storageKey,
      storageUrl: uploadedFile.url,
      priceInr: ensurePrice(payload.priceInr),
      currency: "INR",
      taxonomy,
      studyMetadata: payload.studyMetadata || normalizeStudyMetadata(payload),
      tags: normalizeTags(payload.tags),
      coverImageUrl: normalizeText(payload.coverImageUrl),
      seoTitle: normalizeText(payload.seoTitle),
      seoDescription: normalizeText(payload.seoDescription),
      visibility,
      isFeatured: normalizeBoolean(payload.isFeatured),
      publishedAt: visibility === "published" ? new Date() : null,
    });

    await syncListingFromAdminUpload(record);
    await createAuditLog("admin_upload_created", actor, req, "AdminUploadedPdf", record._id.toString(), {
      title: record.title,
      visibility: record.visibility,
    });

    const populated = await AdminUploadedPdf.findById(record._id).populate("adminId", "name");
    return serializeAdminUpload(populated);
  },

  async updateAdminUpload(uploadId, actor, payload, req) {
    const record = await AdminUploadedPdf.findById(uploadId).populate("adminId", "name");
    if (!record) {
      throw new ApiError(404, "Admin-uploaded PDF not found.");
    }

    record.title = normalizeText(payload.title);
    record.description = normalizeText(payload.description);
    record.priceInr = ensurePrice(payload.priceInr);
    record.taxonomy = payload.taxonomy || normalizeTaxonomy(payload);
    record.studyMetadata = payload.studyMetadata || normalizeStudyMetadata(payload);
    record.tags = Array.isArray(payload.tags) ? payload.tags : normalizeTags(payload.tags);
    record.coverImageUrl = normalizeText(payload.coverImageUrl);
    record.seoTitle = normalizeText(payload.seoTitle);
    record.seoDescription = normalizeText(payload.seoDescription);
    record.visibility = ensureVisibility(payload.visibility || record.visibility);
    record.isFeatured = normalizeBoolean(payload.isFeatured);
    record.publishedAt = record.visibility === "published" ? record.publishedAt || new Date() : null;
    await record.save();

    await syncListingFromAdminUpload(record);
    await createAuditLog("admin_upload_updated", actor, req, "AdminUploadedPdf", record._id.toString(), {
      title: record.title,
      visibility: record.visibility,
    });

    return serializeAdminUpload(record);
  },

  async listUpcomingItems(query = {}) {
    const conditions = {};
    if (query.mode === "public") {
      conditions.visibility = true;
      conditions.status = "upcoming";
      conditions.$or = [
        { visibilityStartAt: null },
        { visibilityStartAt: { $lte: new Date() } },
      ];
    }

    ["university", "branch", "year", "semester", "subject"].forEach((key) => {
      const value = normalizeText(query[key]);
      if (value) {
        conditions[`taxonomy.${key}`] = value;
      }
    });

    const items = await UpcomingLockedPdf.find(conditions)
      .populate("adminId", "name")
      .sort({ isFeatured: -1, expectedReleaseAt: 1, createdAt: -1 });

    const highlightedSemester = normalizeText(query.currentSemester || query.semester);

    return items.map((item) => ({
      ...serializeUpcoming(item),
      semesterMatch: highlightedSemester
        ? normalizeText(item.taxonomy?.semester).toLowerCase() === highlightedSemester.toLowerCase()
        : false,
    }));
  },

  async getUpcomingDetail(slug) {
    const item = await UpcomingLockedPdf.findOne({
      slug,
      visibility: true,
      status: "upcoming",
      $or: [{ visibilityStartAt: null }, { visibilityStartAt: { $lte: new Date() } }],
    }).populate("adminId", "name");

    if (!item) {
      throw new ApiError(404, "Upcoming locked PDF not found.");
    }

    return serializeUpcoming(item);
  },

  async createUpcomingItem(actor, payload, req) {
    const taxonomy = payload.taxonomy || normalizeTaxonomy(payload);
    const adminUploadId = normalizeText(payload.adminUploadId);
    let linkedUpload = null;
    let linkedListingId = null;

    if (adminUploadId) {
      linkedUpload = await AdminUploadedPdf.findById(adminUploadId);
      if (!linkedUpload) {
        throw new ApiError(404, "Linked admin upload was not found.");
      }
      linkedListingId = linkedUpload.listingId || null;
    }

    const title = normalizeText(payload.title);
    const item = await UpcomingLockedPdf.create({
      adminId: actor.id || actor._id,
      adminUploadId: linkedUpload?._id || null,
      listingId: linkedListingId,
      title,
      slug: await buildUniqueUpcomingSlug(`${title}-${taxonomy.subject}-${taxonomy.semester}`),
      summary: normalizeText(payload.summary),
      taxonomy,
      tags: Array.isArray(payload.tags) ? payload.tags : normalizeTags(payload.tags),
      coverImageUrl: normalizeText(payload.coverImageUrl) || linkedUpload?.coverImageUrl || "",
      isFeatured: normalizeBoolean(payload.isFeatured),
      visibility: payload.visibility === undefined ? true : normalizeBoolean(payload.visibility),
      visibilityStartAt: payload.visibilityStartAt ? new Date(payload.visibilityStartAt) : null,
      expectedReleaseAt: payload.expectedReleaseAt ? new Date(payload.expectedReleaseAt) : null,
      status: ensureUpcomingStatus(payload.status || "upcoming"),
    });

    if (item.status === "published") {
      item.publishedAt = new Date();
      item.visibility = false;
      if (item.listingId) {
        await MarketplaceListing.findByIdAndUpdate(item.listingId, {
          visibility: "published",
          isPublished: true,
          publishedAt: item.publishedAt,
        });
      }
      if (item.adminUploadId) {
        await AdminUploadedPdf.findByIdAndUpdate(item.adminUploadId, {
          visibility: "published",
          publishedAt: item.publishedAt,
        });
      }
      await item.save();
    }

    await createAuditLog("upcoming_locked_created", actor, req, "UpcomingLockedPdf", item._id.toString(), {
      title: item.title,
      status: item.status,
    });

    const populated = await UpcomingLockedPdf.findById(item._id).populate("adminId", "name");
    return serializeUpcoming(populated);
  },

  async updateUpcomingItem(itemId, actor, payload, req) {
    const item = await UpcomingLockedPdf.findById(itemId).populate("adminId", "name");
    if (!item) {
      throw new ApiError(404, "Upcoming locked PDF not found.");
    }

    const taxonomy = payload.taxonomy || normalizeTaxonomy(payload);
    const title = normalizeText(payload.title);
    item.title = title;
    item.slug = await buildUniqueUpcomingSlug(`${title}-${taxonomy.subject}-${taxonomy.semester}`, item._id);
    item.summary = normalizeText(payload.summary);
    item.taxonomy = taxonomy;
    item.tags = Array.isArray(payload.tags) ? payload.tags : normalizeTags(payload.tags);
    item.coverImageUrl = normalizeText(payload.coverImageUrl);
    item.isFeatured = normalizeBoolean(payload.isFeatured);
    item.visibility = payload.visibility === undefined ? item.visibility : normalizeBoolean(payload.visibility);
    item.visibilityStartAt = payload.visibilityStartAt ? new Date(payload.visibilityStartAt) : null;
    item.expectedReleaseAt = payload.expectedReleaseAt ? new Date(payload.expectedReleaseAt) : null;
    item.status = ensureUpcomingStatus(payload.status || item.status);

    const adminUploadId = normalizeText(payload.adminUploadId);
    if (adminUploadId) {
      const linkedUpload = await AdminUploadedPdf.findById(adminUploadId);
      if (!linkedUpload) {
        throw new ApiError(404, "Linked admin upload was not found.");
      }
      item.adminUploadId = linkedUpload._id;
      item.listingId = linkedUpload.listingId || null;
    }

    if (item.status === "published") {
      item.publishedAt = item.publishedAt || new Date();
      item.visibility = false;
      if (item.listingId) {
        await MarketplaceListing.findByIdAndUpdate(item.listingId, {
          visibility: "published",
          isPublished: true,
          publishedAt: item.publishedAt,
        });
      }
      if (item.adminUploadId) {
        await AdminUploadedPdf.findByIdAndUpdate(item.adminUploadId, {
          visibility: "published",
          publishedAt: item.publishedAt,
        });
      }
    }

    await item.save();
    await createAuditLog("upcoming_locked_updated", actor, req, "UpcomingLockedPdf", item._id.toString(), {
      title: item.title,
      status: item.status,
    });

    return serializeUpcoming(item);
  },

  async updateUpcomingStatus(itemId, actor, action, req) {
    const item = await UpcomingLockedPdf.findById(itemId).populate("adminId", "name");
    if (!item) {
      throw new ApiError(404, "Upcoming locked PDF not found.");
    }

    if (action === "schedule") {
      item.status = "upcoming";
    }
    if (action === "archive") {
      item.status = "archived";
      item.visibility = false;
      if (item.listingId) {
        await MarketplaceListing.findByIdAndUpdate(item.listingId, {
          visibility: "unlisted",
          isPublished: false,
        });
      }
      if (item.adminUploadId) {
        await AdminUploadedPdf.findByIdAndUpdate(item.adminUploadId, {
          visibility: "unlisted",
        });
      }
    }
    if (action === "cancel") {
      item.status = "cancelled";
      item.visibility = false;
      if (item.listingId) {
        await MarketplaceListing.findByIdAndUpdate(item.listingId, {
          visibility: "unlisted",
          isPublished: false,
        });
      }
      if (item.adminUploadId) {
        await AdminUploadedPdf.findByIdAndUpdate(item.adminUploadId, {
          visibility: "unlisted",
        });
      }
    }
    if (action === "publish") {
      item.status = "published";
      item.publishedAt = new Date();
      item.visibility = false;

      if (item.listingId) {
        await MarketplaceListing.findByIdAndUpdate(item.listingId, {
          visibility: "published",
          isPublished: true,
          publishedAt: new Date(),
        });
      }
      if (item.adminUploadId) {
        await AdminUploadedPdf.findByIdAndUpdate(item.adminUploadId, {
          visibility: "published",
          publishedAt: new Date(),
        });
      }
    }

    await item.save();
    await createAuditLog("upcoming_locked_status_updated", actor, req, "UpcomingLockedPdf", item._id.toString(), {
      action,
      status: item.status,
    });

    return serializeUpcoming(item);
  },
};
