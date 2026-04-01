import { createStorageClient, hashToken } from "../../lib/index.js";
import { AdminUploadedPdf, GeneratedPdf, MarketplaceListing, Purchase, ServiceListing } from "../../models/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { personalizePdfDownload } from "../../utils/pdfPersonalization.js";

const storageClient = createStorageClient();

function getPurchaseBuyerName(record) {
  return record?.downloadBuyerName || record?.guestBuyerName || record?.buyerId?.name || "";
}

function serializePurchase(record) {
  const isServicePurchase = Boolean(record?.serviceListingId);
  const service = isServicePurchase ? record.serviceListingId : null;

  return {
    id: record._id.toString(),
    buyerId: record.buyerId?._id?.toString?.() || record.buyerId?.toString?.() || null,
    buyerMode: record.buyerMode || "account",
    buyerName: getPurchaseBuyerName(record),
    downloadBuyerName: getPurchaseBuyerName(record),
    sellerId: record.sellerId?._id?.toString?.() || record.sellerId?.toString?.() || null,
    sellerName: record.sellerId?.sellerProfile?.displayName || record.sellerId?.name || "ExamNova Seller",
    listingId: record.listingId?._id?.toString?.() || record.listingId?.toString?.() || null,
    serviceListingId: service?._id?.toString?.() || record.serviceListingId?.toString?.() || null,
    generatedPdfId: record.generatedPdfId?._id?.toString?.() || record.generatedPdfId?.toString?.() || null,
    resourceKind: isServicePurchase ? "service" : "pdf",
    title: service?.title || record.listingId?.title || "Purchased PDF",
    slug: service?.slug || record.listingId?.slug || "",
    amountInr: record.amountInr,
    currency: record.currency || "INR",
    status: record.status,
    paymentStatus: record.paymentStatus || "paid",
    adminCommissionAmount: record.adminCommissionAmount || 0,
    sellerEarningAmount: record.sellerEarningAmount || 0,
    buyerAccessState: record.buyerAccessState || "granted",
    accessGrantedAt: record.accessGrantedAt,
    purchasedAt: record.createdAt,
    taxonomy: record.listingId?.taxonomy || null,
    studyMetadata: record.listingId?.studyMetadata || {},
    serviceDetails: service
      ? {
          category: service.category || "",
          shortDescription: service.shortDescription || "",
          demoUrl: service.demoUrl || "",
          repoUrl: service.repoUrl || "",
          techStack: service.techStack || [],
        }
      : null,
  };
}

async function findDownloadableListing(listingId) {
  return MarketplaceListing.findById(listingId)
    .populate("sourcePdfId")
    .populate("adminUploadId");
}

async function buildDirectSourceDownloadFile(purchase) {
  if (purchase?.adminUploadId) {
    const adminUpload = await AdminUploadedPdf.findById(purchase.adminUploadId);
    if (adminUpload?.storageKey) {
      const absolutePath = await storageClient.resolveExisting(adminUpload.storageKey);
      return {
        absolutePath,
        downloadName: adminUpload.originalName || "purchased-admin-pdf.pdf",
      };
    }
  }

  if (purchase?.generatedPdfId) {
    const generatedPdf = await GeneratedPdf.findById(purchase.generatedPdfId);
    if (generatedPdf?.storageKey) {
      const absolutePath = await storageClient.resolveExisting(generatedPdf.storageKey);
      return {
        absolutePath,
        downloadName: generatedPdf.pdfDownloadName || `${generatedPdf.title || "purchased-pdf"}.pdf`,
      };
    }
  }

  throw new ApiError(404, "Purchased PDF file is not available.");
}

async function buildPurchaseDownloadFile(listing) {
  const storageKey = listing?.sourceType === "admin_upload"
    ? listing?.adminUploadId?.storageKey
    : listing?.sourcePdfId?.storageKey;

  if (!storageKey) {
    throw new ApiError(404, "Purchased PDF file is not available.");
  }

  let absolutePath;

  try {
    absolutePath = await storageClient.resolveExisting(storageKey);
  } catch {
    throw new ApiError(
      404,
      listing?.sourceType === "admin_upload"
        ? "This purchased PDF file is missing on the server. Please re-upload the admin PDF and republish the listing."
        : "This purchased PDF file is missing on the server. Please regenerate the PDF and try again.",
    );
  }

  return {
    absolutePath,
    downloadName:
      (listing?.sourceType === "admin_upload"
        ? listing?.adminUploadId?.originalName
        : listing?.sourcePdfId?.pdfDownloadName) ||
      `${listing.title.replace(/\s+/g, "-").toLowerCase()}.pdf`,
  };
}

async function buildServiceDownloadFile(service) {
  if (!service?.zipStorageKey) {
    throw new ApiError(404, "Purchased website ZIP file is not available.");
  }

  let absolutePath;

  try {
    absolutePath = await storageClient.resolveExisting(service.zipStorageKey);
  } catch {
    throw new ApiError(404, "This purchased website ZIP file is missing on the server. Please re-upload it.");
  }

  return {
    absolutePath,
    downloadName: service.zipFileName || `${service.title.replace(/\s+/g, "-").toLowerCase()}.zip`,
    contentType: service.zipMimeType || "application/zip",
  };
}

async function buildPersonalizedDownloadFile(file, purchase, listing) {
  const buyerName = getPurchaseBuyerName(purchase);

  if (!buyerName) {
    throw new ApiError(400, "Buyer name is missing for this PDF download.");
  }

  const personalizedBuffer = await personalizePdfDownload(file.absolutePath, {
    buyerName,
    title: listing?.title || purchase?.listingId?.title || purchase?.title || file.downloadName,
  });

  return {
    ...file,
    buffer: personalizedBuffer,
    contentType: "application/pdf",
  };
}

export const purchaseService = {
  serializePurchase,

  async listBuyerPurchases(userId) {
    const purchases = await Purchase.find({
      buyerId: userId,
      status: "completed",
      buyerAccessState: "granted",
    })
      .populate("listingId", "title slug taxonomy studyMetadata priceInr")
      .populate("serviceListingId", "title slug category shortDescription demoUrl repoUrl techStack")
      .populate("buyerId", "name")
      .populate("sellerId", "name sellerProfile")
      .sort({ createdAt: -1 });

    return purchases.map(serializePurchase);
  },

  async getBuyerPurchase(userId, purchaseId) {
    const purchase = await Purchase.findOne({
      _id: purchaseId,
      buyerId: userId,
      status: "completed",
      buyerAccessState: "granted",
    })
      .populate("listingId", "title slug taxonomy studyMetadata priceInr sourcePdfId")
      .populate("serviceListingId", "title slug category shortDescription demoUrl repoUrl techStack")
      .populate("buyerId", "name")
      .populate("sellerId", "name sellerProfile");

    if (!purchase) {
      throw new ApiError(404, "Purchased PDF not found in your library.");
    }

    return serializePurchase(purchase);
  },

  async getPurchaseDownload(userId, purchaseId) {
    const purchase = await Purchase.findOne({
      _id: purchaseId,
      buyerId: userId,
      status: "completed",
      buyerAccessState: "granted",
    })
      .populate("listingId")
      .populate("serviceListingId")
      .populate("buyerId", "name");

    if (!purchase) {
      throw new ApiError(404, "Purchased PDF not found in your library.");
    }

    if (purchase.serviceListingId) {
      const service = await ServiceListing.findById(
        purchase.serviceListingId?._id || purchase.serviceListingId,
      );
      return buildServiceDownloadFile(service);
    }

    const listing = await findDownloadableListing(purchase.listingId?._id || purchase.listingId);

    if (listing) {
      const file = await buildPurchaseDownloadFile(listing);
      return buildPersonalizedDownloadFile(file, purchase, listing);
    }

    const file = await buildDirectSourceDownloadFile(purchase);
    return buildPersonalizedDownloadFile(file, purchase, purchase.listingId);
  },

  async getGuestPurchaseDownload(purchaseId, guestToken) {
    const normalizedToken = String(guestToken || "").trim();
    if (!normalizedToken) {
      throw new ApiError(401, "Guest download token is required.");
    }

    const purchase = await Purchase.findOne({
      _id: purchaseId,
      buyerMode: "guest",
      status: "completed",
      buyerAccessState: "granted",
    })
      .populate("listingId")
      .populate("serviceListingId");

    if (!purchase) {
      throw new ApiError(404, "Guest purchase not found.");
    }

    if (!purchase.guestAccessTokenHash || !purchase.guestAccessExpiresAt) {
      throw new ApiError(403, "Guest download access is not active for this purchase.");
    }

    if (purchase.guestAccessExpiresAt.getTime() < Date.now()) {
      purchase.guestAccessTokenHash = "";
      purchase.guestAccessExpiresAt = null;
      await purchase.save();
      throw new ApiError(403, "Guest download access has expired. Please use the latest purchase success screen.");
    }

    if (hashToken(normalizedToken) !== purchase.guestAccessTokenHash) {
      throw new ApiError(403, "Guest download token is invalid.");
    }

    if (purchase.serviceListingId) {
      const service = await ServiceListing.findById(
        purchase.serviceListingId?._id || purchase.serviceListingId,
      );
      return buildServiceDownloadFile(service);
    }

    const listing = await findDownloadableListing(purchase.listingId?._id || purchase.listingId);

    if (listing) {
      const file = await buildPurchaseDownloadFile(listing);
      return buildPersonalizedDownloadFile(file, purchase, listing);
    }

    const file = await buildDirectSourceDownloadFile(purchase);
    return buildPersonalizedDownloadFile(file, purchase, purchase.listingId);
  },
};
