import { GeneratedPdf, MarketplaceListing } from "../../models/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { slugify } from "../../utils/slugify.js";
import {
  normalizeAcademicTaxonomy,
  normalizeControlledFilterValue,
  normalizeStudyMetadata,
} from "../../utils/academicTaxonomy.js";

const MIN_PRICE = 4;
const MAX_PRICE = 10;
const ALLOWED_VISIBILITY = new Set(["draft", "published", "unlisted"]);
const ALLOWED_SORTS = new Set(["latest", "price_asc", "price_desc", "popularity"]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) => normalizeText(tag).toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

function buildSearchText(payload) {
  return [
    payload.title,
    payload.description,
    payload.taxonomy?.subject,
    payload.taxonomy?.branch,
    payload.taxonomy?.university,
    payload.studyMetadata?.examFocus,
    payload.studyMetadata?.questionType,
    payload.studyMetadata?.difficultyLevel,
    payload.studyMetadata?.intendedAudience,
    ...(payload.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

async function buildUniqueSlug(baseText, excludeId = null) {
  const baseSlug = slugify(baseText) || `pdf-${Date.now()}`;
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

function ensurePrice(priceInr) {
  const numericPrice = Number(priceInr);
  if (!Number.isFinite(numericPrice) || numericPrice < MIN_PRICE || numericPrice > MAX_PRICE) {
    throw new ApiError(422, `Marketplace price must be between Rs. ${MIN_PRICE} and Rs. ${MAX_PRICE}.`);
  }
  return numericPrice;
}

function ensureVisibility(visibility) {
  const normalized = normalizeText(visibility || "draft").toLowerCase();
  if (!ALLOWED_VISIBILITY.has(normalized)) {
    throw new ApiError(422, "visibility must be one of draft, published, or unlisted.");
  }
  return normalized;
}

function normalizeTaxonomy(payload) {
  if (payload?.taxonomy) {
    return payload.taxonomy;
  }
  return normalizeAcademicTaxonomy(payload || {});
}

function serializeListing(record) {
  return {
    id: record._id.toString(),
    sellerId: record.sellerId?._id?.toString?.() || record.sellerId?.toString?.() || null,
    sellerName: record.sellerId?.sellerProfile?.displayName || record.sellerId?.name || "ExamNova Seller",
    sellerRole: record.sellerId?.role || "student",
    sellerSourceLabel: record.sourceType === "admin_upload" ? "ExamNova Admin" : "Student Seller",
    sourcePdfId: record.sourcePdfId?._id?.toString?.() || record.sourcePdfId?.toString?.() || null,
    adminUploadId: record.adminUploadId?._id?.toString?.() || record.adminUploadId?.toString?.() || null,
    sourceType: record.sourceType || "generated_pdf",
    title: record.title,
    slug: record.slug,
    description: record.description || "",
    priceInr: record.priceInr,
    currency: record.currency || "INR",
    visibility: record.visibility,
    approvalStatus: record.approvalStatus || "approved",
    moderationStatus: record.moderationStatus || "clear",
    isPublished: Boolean(record.isPublished),
    taxonomy: record.taxonomy,
    studyMetadata: record.studyMetadata || {},
    coverImageUrl: record.coverImageUrl || "",
    previewImages: record.previewImages || [],
    tags: record.tags || [],
    seoTitle: record.seoTitle || "",
    seoDescription: record.seoDescription || "",
    viewCount: record.viewCount || 0,
    salesCount: record.salesCount || 0,
    isFeatured: Boolean(record.isFeatured),
    publishedAt: record.publishedAt || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function ensureEligibleGeneratedPdf(userId, generatedPdfId) {
  const generation = await GeneratedPdf.findOne({ _id: generatedPdfId, userId }).populate(
    "sourceDocumentId",
    "documentTitle academicTaxonomy studyMetadata",
  );
  if (!generation) {
    throw new ApiError(404, "Eligible generated PDF was not found.");
  }

  if (generation.pdfGenerationStatus !== "completed" || !generation.storageKey) {
    throw new ApiError(400, "Only finalized generated PDFs can be listed publicly.");
  }

  return generation;
}

export const marketplaceService = {
  async listEligibleGeneratedPdfs(userId) {
    const generations = await GeneratedPdf.find({
      userId,
      pdfGenerationStatus: "completed",
      storageKey: { $exists: true, $ne: "" },
      listedInMarketplace: false,
    })
      .populate("sourceDocumentId", "documentTitle academicTaxonomy studyMetadata")
      .sort({ updatedAt: -1 });

    return generations.map((generation) => ({
      id: generation._id.toString(),
      title: generation.title,
      sourceDocumentTitle: generation.sourceDocumentId?.documentTitle || "",
      pageCount: generation.pageCount || 0,
      pdfGeneratedAt: generation.pdfGeneratedAt || null,
      listedInMarketplace: Boolean(generation.listedInMarketplace),
      questionCount: generation.answerItems?.length || 0,
      taxonomy: generation.sourceDocumentId?.academicTaxonomy || {},
      studyMetadata: generation.sourceDocumentId?.studyMetadata || {},
      suggestedListingTitle: String(generation.title || "")
        .replace(/\s*-\s*answer draft$/i, "")
        .trim(),
    }));
  },

  async createListing(userId, payload) {
    const generation = await ensureEligibleGeneratedPdf(userId, payload.generatedPdfId);

    const existing = await MarketplaceListing.findOne({
      sellerId: userId,
      sourcePdfId: generation._id,
    });
    if (existing) {
      throw new ApiError(409, "This generated PDF already has a marketplace listing. Edit the existing listing instead.");
    }

    const taxonomy = normalizeTaxonomy(payload);
    const visibility = ensureVisibility(payload.visibility);
    const title = normalizeText(payload.title) || generation.title;
    const description = normalizeText(payload.description);
    const tags = normalizeTags(payload.tags);
    const studyMetadata = payload.studyMetadata || normalizeStudyMetadata(payload || {});
    const slug = await buildUniqueSlug(`${title}-${taxonomy.subject}-${taxonomy.semester}`);

    const listing = await MarketplaceListing.create({
      sellerId: userId,
      sourcePdfId: generation._id,
      sourceType: "generated_pdf",
      title,
      slug,
      description,
      priceInr: ensurePrice(payload.priceInr),
      currency: "INR",
      visibility,
      approvalStatus: "approved",
      moderationStatus: "clear",
      isPublished: visibility === "published",
      taxonomy,
      studyMetadata,
      tags,
      seoTitle: normalizeText(payload.seoTitle) || title,
      seoDescription: normalizeText(payload.seoDescription) || description.slice(0, 150),
      searchText: buildSearchText({ title, description, taxonomy, studyMetadata, tags }),
      publishedAt: visibility === "published" ? new Date() : null,
    });

    generation.listedInMarketplace = true;
    await generation.save();

    const populated = await MarketplaceListing.findById(listing._id).populate("sellerId", "name role sellerProfile");
    return serializeListing(populated);
  },

  async updateListing(userId, listingId, payload) {
    const listing = await MarketplaceListing.findOne({ _id: listingId, sellerId: userId }).populate(
      "sellerId",
      "name role sellerProfile",
    );

    if (!listing) {
      throw new ApiError(404, "Marketplace listing not found.");
    }

    const taxonomy = normalizeTaxonomy(payload);
    const visibility = ensureVisibility(payload.visibility || listing.visibility);
    const title = normalizeText(payload.title) || listing.title;
    const description = normalizeText(payload.description);
    const tags = normalizeTags(payload.tags);
    const studyMetadata = payload.studyMetadata || normalizeStudyMetadata(payload || {}) || listing.studyMetadata || {};

    listing.title = title;
    listing.description = description;
    listing.priceInr = ensurePrice(payload.priceInr);
    listing.visibility = visibility;
    listing.isPublished = visibility === "published";
    listing.taxonomy = taxonomy;
    listing.studyMetadata = studyMetadata;
    listing.tags = tags;
    listing.seoTitle = normalizeText(payload.seoTitle) || title;
    listing.seoDescription = normalizeText(payload.seoDescription) || description.slice(0, 150);
    listing.searchText = buildSearchText({ title, description, taxonomy, tags, studyMetadata });
    listing.slug = await buildUniqueSlug(`${title}-${taxonomy.subject}-${taxonomy.semester}`, listing._id);
    listing.publishedAt = visibility === "published" ? listing.publishedAt || new Date() : null;
    await listing.save();

    return serializeListing(listing);
  },

  async listMyListings(userId) {
    const listings = await MarketplaceListing.find({ sellerId: userId })
      .populate("sellerId", "name role sellerProfile")
      .sort({ updatedAt: -1 });

    return listings.map(serializeListing);
  },

  async getPublicListings(filters) {
    const page = Math.max(Number(filters.page) || 1, 1);
    const limit = Math.min(Math.max(Number(filters.limit) || 12, 1), 24);
    const query = {
      isPublished: true,
      approvalStatus: "approved",
      moderationStatus: { $ne: "blocked" },
      visibility: "published",
    };

    const search = normalizeText(filters.search).toLowerCase();
    if (search) {
      query.searchText = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
    }

    ["university", "branch", "year", "semester"].forEach((key) => {
      const value = normalizeControlledFilterValue(filters[key], key);
      if (value) {
        query[`taxonomy.${key}`] = value;
      }
    });
    const subject = normalizeText(filters.subject);
    if (subject) {
      query["taxonomy.subject"] = subject;
    }

    const sortKey = ALLOWED_SORTS.has(filters.sort) ? filters.sort : "latest";
    const sort =
      sortKey === "price_asc"
        ? { isFeatured: -1, priceInr: 1, publishedAt: -1 }
        : sortKey === "price_desc"
          ? { isFeatured: -1, priceInr: -1, publishedAt: -1 }
          : sortKey === "popularity"
            ? { isFeatured: -1, viewCount: -1, publishedAt: -1 }
            : { isFeatured: -1, publishedAt: -1 };

    const [items, total] = await Promise.all([
      MarketplaceListing.find(query)
        .populate("sellerId", "name role sellerProfile")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      MarketplaceListing.countDocuments(query),
    ]);

    return {
      items: items.map(serializeListing),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
      filters: {
        search,
        university: normalizeControlledFilterValue(filters.university, "university"),
        branch: normalizeControlledFilterValue(filters.branch, "branch"),
        year: normalizeControlledFilterValue(filters.year, "year"),
        semester: normalizeControlledFilterValue(filters.semester, "semester"),
        subject,
        sort: sortKey,
      },
    };
  },

  async getPublicListingDetail(slug) {
    const listing = await MarketplaceListing.findOne({
      slug,
      isPublished: true,
      approvalStatus: "approved",
      moderationStatus: { $ne: "blocked" },
      visibility: "published",
    }).populate("sellerId", "name role sellerProfile");

    if (!listing) {
      throw new ApiError(404, "Marketplace listing not found.");
    }

    listing.viewCount += 1;
    await listing.save();

    const related = await MarketplaceListing.find({
      _id: { $ne: listing._id },
      isPublished: true,
      visibility: "published",
      approvalStatus: "approved",
      "taxonomy.subject": listing.taxonomy.subject,
    })
      .populate("sellerId", "name role sellerProfile")
      .sort({ publishedAt: -1 })
      .limit(4);

    return {
      listing: serializeListing(listing),
      relatedListings: related.map(serializeListing),
    };
  },
};
