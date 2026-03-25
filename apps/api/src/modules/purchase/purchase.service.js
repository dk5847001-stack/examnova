import { createStorageClient } from "../../lib/index.js";
import { MarketplaceListing, Purchase } from "../../models/index.js";
import { ApiError } from "../../utils/ApiError.js";

const storageClient = createStorageClient();

function serializePurchase(record) {
  return {
    id: record._id.toString(),
    buyerId: record.buyerId?.toString?.() || null,
    sellerId: record.sellerId?._id?.toString?.() || record.sellerId?.toString?.() || null,
    sellerName: record.sellerId?.sellerProfile?.displayName || record.sellerId?.name || "ExamNova Seller",
    listingId: record.listingId?._id?.toString?.() || record.listingId?.toString?.() || null,
    generatedPdfId: record.generatedPdfId?._id?.toString?.() || record.generatedPdfId?.toString?.() || null,
    title: record.listingId?.title || "Purchased PDF",
    slug: record.listingId?.slug || "",
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
    }).populate("listingId");

    if (!purchase) {
      throw new ApiError(404, "Purchased PDF not found in your library.");
    }

    const listing = await MarketplaceListing.findById(purchase.listingId?._id || purchase.listingId)
      .populate("sourcePdfId")
      .populate("adminUploadId");

    const storageKey = listing?.sourceType === "admin_upload"
      ? listing?.adminUploadId?.storageKey
      : listing?.sourcePdfId?.storageKey;

    if (!storageKey) {
      throw new ApiError(404, "Purchased PDF file is not available.");
    }

    return {
      absolutePath: storageClient.resolve(storageKey),
      downloadName:
        (listing?.sourceType === "admin_upload"
          ? listing?.adminUploadId?.originalName
          : listing?.sourcePdfId?.pdfDownloadName) ||
        `${listing.title.replace(/\s+/g, "-").toLowerCase()}.pdf`,
    };
  },
};
