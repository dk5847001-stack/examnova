import {
  APP_NAME,
  MARKETPLACE_SPLIT,
  PAYMENT_STATUS,
  PURCHASE_TYPES,
} from "../../constants/app.constants.js";
import {
  GeneratedPdf,
  MarketplaceListing,
  Payment,
  Purchase,
  WalletTransaction,
} from "../../models/index.js";
import { env } from "../../config/index.js";
import { createPaymentClient } from "../../lib/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { notificationService } from "../../services/notification.service.js";
import { pdfGenerationService } from "../pdf/pdfGeneration.service.js";
import { purchaseService } from "../purchase/purchase.service.js";

const PRIVATE_PDF_PRICE = 4;
let paymentClientInstance = null;

function getMissingPaymentEnvVars() {
  const missing = [];

  if (!env.razorpayKeyId) {
    missing.push("RAZORPAY_KEY_ID");
  }
  if (!env.razorpayKeySecret) {
    missing.push("RAZORPAY_KEY_SECRET");
  }

  return missing;
}

function createPaymentConfigurationError() {
  const missingEnvVars = getMissingPaymentEnvVars();

  return new ApiError(
    503,
    "Payment checkout is temporarily unavailable because Razorpay is not configured on the backend.",
    {
      code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
      provider: "razorpay",
      missingEnvVars,
    },
  );
}

function extractProviderErrorMessage(error) {
  const providerMessage =
    error?.error?.description ||
    error?.description ||
    error?.error?.message ||
    error?.message ||
    "";

  return typeof providerMessage === "string" ? providerMessage.trim() : "";
}

function getPaymentClient() {
  if (getMissingPaymentEnvVars().length > 0) {
    throw createPaymentConfigurationError();
  }

  if (!paymentClientInstance) {
    try {
      paymentClientInstance = createPaymentClient();
    } catch (_error) {
      throw createPaymentConfigurationError();
    }
  }
  return paymentClientInstance;
}

function buildCheckoutPayload(paymentClient, { amountInr, currency, orderId, description, notes }) {
  return {
    key: paymentClient.getPublicConfig().keyId,
    amount: amountInr * 100,
    currency,
    orderId,
    name: APP_NAME,
    description,
    prefill: {},
    notes,
  };
}

async function createProviderOrder({ entityId, amountInr, notes, userMessage, contextType }) {
  const paymentClient = getPaymentClient();

  try {
    const order = contextType === PURCHASE_TYPES.MARKETPLACE
      ? await paymentClient.createMarketplaceOrder({
        listingId: entityId,
        amountInr,
        notes,
      })
      : await paymentClient.createPrivatePdfOrder({
        generationId: entityId,
        amountInr,
        notes,
      });

    return { order, paymentClient };
  } catch (error) {
    throw new ApiError(502, userMessage, {
      code: "PAYMENT_ORDER_CREATION_FAILED",
      provider: "razorpay",
      providerMessage: extractProviderErrorMessage(error) || null,
    });
  }
}

function serializePayment(record) {
  return {
    id: record._id.toString(),
    userId: record.userId?.toString?.() || String(record.userId),
    purpose: record.purpose,
    contextType: record.contextType || "private_pdf",
    generatedPdfId: record.generatedPdfId?.toString?.() || null,
    listingId: record.listingId?.toString?.() || null,
    sellerId: record.sellerId?.toString?.() || null,
    amountInr: record.amountInr,
    currency: record.currency,
    provider: record.provider,
    status: record.status,
    unlockStatus: record.unlockStatus || "locked",
    razorpayOrderId: record.razorpayOrderId || "",
    razorpayPaymentId: record.razorpayPaymentId || "",
    orderReceipt: record.orderReceipt || "",
    verifiedAt: record.verifiedAt || null,
    buyerAccessGranted: Boolean(record.buyerAccessGranted),
    adminCommissionAmount: record.adminCommissionAmount || 0,
    sellerEarningAmount: record.sellerEarningAmount || 0,
    failedAt: record.failedAt || null,
    failureReason: record.failureReason || "",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function calculateMarketplaceSplit(amountInr) {
  const sellerEarningAmount = Number(
    ((amountInr * MARKETPLACE_SPLIT.SELLER_PERCENT) / 100).toFixed(2),
  );
  const adminCommissionAmount = Number((amountInr - sellerEarningAmount).toFixed(2));
  return { sellerEarningAmount, adminCommissionAmount };
}

async function findOwnedGeneration(userId, generationId) {
  const generation = await GeneratedPdf.findOne({ _id: generationId, userId });
  if (!generation) {
    throw new ApiError(404, "Generated PDF not found.");
  }
  return generation;
}

async function findPendingPaymentForOrder(orderId) {
  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) {
    throw new ApiError(404, "Payment order was not found.");
  }
  return payment;
}

async function ensureUniqueVerifiedPaymentId(paymentId, currentPaymentId) {
  const existing = await Payment.findOne({
    razorpayPaymentId: paymentId,
    _id: { $ne: currentPaymentId },
  }).select("_id status razorpayOrderId");

  if (existing) {
    throw new ApiError(409, "This payment has already been processed.");
  }
}

async function findPurchasableListing(listingId) {
  const listing = await MarketplaceListing.findOne({
    _id: listingId,
    isPublished: true,
    visibility: "published",
    approvalStatus: "approved",
    moderationStatus: { $ne: "blocked" },
  })
    .populate("sourcePdfId")
    .populate("adminUploadId");

  if (!listing) {
    throw new ApiError(404, "Marketplace listing is not available for purchase.");
  }

  const storageKey =
    listing.sourceType === "admin_upload"
      ? listing.adminUploadId?.storageKey
      : listing.sourcePdfId?.storageKey;

  if (!storageKey) {
    throw new ApiError(400, "Marketplace listing does not have a valid PDF file.");
  }

  return listing;
}

export const paymentService = {
  async createPrivatePdfOrder(userId, generationId) {
    const generation = await findOwnedGeneration(userId, generationId);

    if (generation.pdfGenerationStatus !== "completed" || !generation.storageKey) {
      throw new ApiError(400, "Generate the final PDF before starting payment.");
    }

    if (generation.downloadUnlocked || generation.isPaid) {
      return {
        alreadyUnlocked: true,
        generation: pdfGenerationService.serializeGeneration(generation),
        payment: null,
        checkout: null,
      };
    }

    const existingPendingPayment = await Payment.findOne({
      userId,
      generatedPdfId: generation._id,
      status: PAYMENT_STATUS.PENDING,
    }).sort({ createdAt: -1 });

    if (existingPendingPayment?.razorpayOrderId) {
      const paymentClient = getPaymentClient();

      return {
        alreadyUnlocked: false,
        generation: pdfGenerationService.serializeGeneration(generation),
        payment: serializePayment(existingPendingPayment),
        checkout: buildCheckoutPayload(paymentClient, {
          amountInr: existingPendingPayment.amountInr,
          currency: existingPendingPayment.currency,
          orderId: existingPendingPayment.razorpayOrderId,
          description: `Private PDF unlock for ${generation.title}`,
          notes: {
            contextType: PURCHASE_TYPES.PRIVATE_PDF,
            generatedPdfId: generation._id.toString(),
          },
        }),
      };
    }

    const { order, paymentClient } = await createProviderOrder({
      entityId: generation._id,
      amountInr: PRIVATE_PDF_PRICE,
      contextType: PURCHASE_TYPES.PRIVATE_PDF,
      notes: {
        contextType: PURCHASE_TYPES.PRIVATE_PDF,
        generatedPdfId: generation._id.toString(),
        userId: userId.toString(),
      },
      userMessage:
        "Unable to start the private PDF payment right now. Please try again in a moment.",
    });

    const payment = await Payment.create({
      userId,
      purpose: PURCHASE_TYPES.PRIVATE_PDF,
      contextType: PURCHASE_TYPES.PRIVATE_PDF,
      targetId: generation._id,
      generatedPdfId: generation._id,
      amountInr: PRIVATE_PDF_PRICE,
      currency: order.currency || "INR",
      provider: "razorpay",
      status: PAYMENT_STATUS.PENDING,
      unlockStatus: "locked",
      razorpayOrderId: order.id,
      orderReceipt: order.receipt || "",
    });

    return {
      alreadyUnlocked: false,
      generation: pdfGenerationService.serializeGeneration(generation),
      payment: serializePayment(payment),
      checkout: buildCheckoutPayload(paymentClient, {
        amountInr: PRIVATE_PDF_PRICE,
        currency: order.currency || "INR",
        orderId: order.id,
        description: `Private PDF unlock for ${generation.title}`,
        notes: {
          contextType: PURCHASE_TYPES.PRIVATE_PDF,
          generatedPdfId: generation._id.toString(),
        },
      }),
    };
  },

  async verifyPrivatePdfPayment(userId, payload) {
    const payment = await findPendingPaymentForOrder(payload.orderId);

    if (String(payment.userId) !== String(userId)) {
      throw new ApiError(403, "You cannot verify payment for another user's PDF.");
    }

    const generation = await findOwnedGeneration(userId, payment.generatedPdfId);

    if (payment.status === PAYMENT_STATUS.PAID && generation.downloadUnlocked) {
      return {
        payment: serializePayment(payment),
        generation: pdfGenerationService.serializeGeneration(generation),
      };
    }

    if (payment.status !== PAYMENT_STATUS.PENDING) {
      throw new ApiError(409, "This payment order is no longer pending verification.");
    }

    const signatureIsValid = getPaymentClient().verifySignature({
      orderId: payload.orderId,
      paymentId: payload.paymentId,
      signature: payload.signature,
    });

    if (!signatureIsValid) {
      payment.status = PAYMENT_STATUS.FAILED;
      payment.failedAt = new Date();
      payment.failureReason = "Razorpay signature verification failed.";
      payment.verificationPayload = payload;
      await payment.save();
      await notificationService.notifyAdmins({
        type: "admin_alert",
        title: "Private PDF payment verification failed",
        message: "A private PDF payment failed signature verification and may need review.",
        actionUrl: "/admin/commerce",
        metadata: {
          paymentId: payment._id.toString(),
          userId: userId.toString(),
        },
      });
      throw new ApiError(400, "Payment verification failed.");
    }

    await ensureUniqueVerifiedPaymentId(payload.paymentId, payment._id);

    payment.status = PAYMENT_STATUS.PAID;
    payment.unlockStatus = "unlocked";
    payment.razorpayPaymentId = payload.paymentId;
    payment.razorpaySignature = payload.signature;
    payment.verifiedAt = new Date();
    payment.failureReason = "";
    payment.verificationPayload = payload;
    await payment.save();

    generation.downloadUnlocked = true;
    generation.isPaid = true;
    await generation.save();

    await notificationService.create({
      userId,
      type: "private_pdf_unlocked",
      title: "Private PDF unlocked",
      message: `Your private PDF "${generation.title}" is now unlocked for download.`,
      actionUrl: `/app/generated-pdfs/${generation._id.toString()}`,
      metadata: {
        generationId: generation._id.toString(),
        paymentId: payment._id.toString(),
      },
    });

    return {
      payment: serializePayment(payment),
      generation: pdfGenerationService.serializeGeneration(generation),
    };
  },

  async getPrivatePdfPaymentStatus(userId, generationId) {
    const generation = await findOwnedGeneration(userId, generationId);
    const payment = await Payment.findOne({
      userId,
      generatedPdfId: generation._id,
    }).sort({ updatedAt: -1 });

    return {
      generation: pdfGenerationService.serializeGeneration(generation),
      payment: payment ? serializePayment(payment) : null,
    };
  },

  async createMarketplaceOrder(userId, listingId) {
    const listing = await findPurchasableListing(listingId);

    if (String(listing.sellerId) === String(userId)) {
      throw new ApiError(400, "You cannot buy your own marketplace listing.");
    }

    const existingPurchase = await Purchase.findOne({
      buyerId: userId,
      listingId: listing._id,
      status: "completed",
      buyerAccessState: "granted",
    })
      .populate("listingId", "title slug taxonomy studyMetadata priceInr")
      .populate("sellerId", "name sellerProfile");

    if (existingPurchase) {
      return {
        alreadyOwned: true,
        purchase: purchaseService.serializePurchase(existingPurchase),
        payment: null,
        checkout: null,
      };
    }

    const existingPendingPayment = await Payment.findOne({
      userId,
      listingId: listing._id,
      status: PAYMENT_STATUS.PENDING,
    }).sort({ createdAt: -1 });

    if (existingPendingPayment?.razorpayOrderId) {
      const paymentClient = getPaymentClient();

      return {
        alreadyOwned: false,
        purchase: null,
        payment: serializePayment(existingPendingPayment),
        checkout: buildCheckoutPayload(paymentClient, {
          amountInr: existingPendingPayment.amountInr,
          currency: existingPendingPayment.currency,
          orderId: existingPendingPayment.razorpayOrderId,
          description: `Marketplace purchase for ${listing.title}`,
          notes: {
            contextType: PURCHASE_TYPES.MARKETPLACE,
            listingId: listing._id.toString(),
          },
        }),
      };
    }

    const { order, paymentClient } = await createProviderOrder({
      entityId: listing._id,
      amountInr: listing.priceInr,
      contextType: PURCHASE_TYPES.MARKETPLACE,
      notes: {
        contextType: PURCHASE_TYPES.MARKETPLACE,
        listingId: listing._id.toString(),
        buyerId: userId.toString(),
      },
      userMessage:
        "Unable to start the marketplace payment right now. Please try again in a moment.",
    });

    const payment = await Payment.create({
      userId,
      purpose: PURCHASE_TYPES.MARKETPLACE,
      contextType: PURCHASE_TYPES.MARKETPLACE,
      targetId: listing._id,
      listingId: listing._id,
      generatedPdfId: listing.sourcePdfId?._id || null,
      adminUploadId: listing.adminUploadId?._id || null,
      sellerId: listing.sellerId,
      amountInr: listing.priceInr,
      currency: order.currency || "INR",
      provider: "razorpay",
      status: PAYMENT_STATUS.PENDING,
      unlockStatus: "locked",
      razorpayOrderId: order.id,
      orderReceipt: order.receipt || "",
    });

    return {
      alreadyOwned: false,
      purchase: null,
      payment: serializePayment(payment),
      checkout: buildCheckoutPayload(paymentClient, {
        amountInr: listing.priceInr,
        currency: order.currency || "INR",
        orderId: order.id,
        description: `Marketplace purchase for ${listing.title}`,
        notes: {
          contextType: PURCHASE_TYPES.MARKETPLACE,
          listingId: listing._id.toString(),
        },
      }),
    };
  },

  async verifyMarketplacePayment(userId, payload) {
    const payment = await findPendingPaymentForOrder(payload.orderId);

    if (String(payment.userId) !== String(userId)) {
      throw new ApiError(403, "You cannot verify another user's marketplace payment.");
    }

    const listing = await findPurchasableListing(payment.listingId);

    const existingPurchase = await Purchase.findOne({
      buyerId: userId,
      listingId: listing._id,
      status: "completed",
      buyerAccessState: "granted",
    })
      .populate("listingId", "title slug taxonomy studyMetadata priceInr")
      .populate("sellerId", "name sellerProfile");

    if (existingPurchase && payment.status === PAYMENT_STATUS.PAID) {
      return {
        payment: serializePayment(payment),
        purchase: purchaseService.serializePurchase(existingPurchase),
      };
    }

    if (payment.status !== PAYMENT_STATUS.PENDING && !existingPurchase) {
      throw new ApiError(409, "This marketplace payment is no longer pending verification.");
    }

    const signatureIsValid = getPaymentClient().verifySignature({
      orderId: payload.orderId,
      paymentId: payload.paymentId,
      signature: payload.signature,
    });

    if (!signatureIsValid) {
      payment.status = PAYMENT_STATUS.FAILED;
      payment.failedAt = new Date();
      payment.failureReason = "Razorpay signature verification failed.";
      payment.verificationPayload = payload;
      await payment.save();
      await notificationService.notifyAdmins({
        type: "admin_alert",
        title: "Marketplace payment verification failed",
        message: "A marketplace payment failed signature verification and may indicate repeated payment issues.",
        actionUrl: "/admin/commerce",
        metadata: {
          paymentId: payment._id.toString(),
          listingId: payment.listingId?.toString?.() || null,
          userId: userId.toString(),
        },
      });
      throw new ApiError(400, "Marketplace payment verification failed.");
    }

    await ensureUniqueVerifiedPaymentId(payload.paymentId, payment._id);

    const split = calculateMarketplaceSplit(payment.amountInr);
    let purchase = existingPurchase;

    if (!purchase) {
      purchase = await Purchase.create({
        buyerId: userId,
        sellerId: listing.sellerId,
        purchaseType: PURCHASE_TYPES.MARKETPLACE,
        targetId: listing._id,
        listingId: listing._id,
        generatedPdfId: listing.sourcePdfId?._id || null,
        adminUploadId: listing.adminUploadId?._id || null,
        paymentId: payment._id,
        amountInr: payment.amountInr,
        currency: payment.currency,
        paymentStatus: PAYMENT_STATUS.PAID,
        status: "completed",
        adminCommissionAmount: split.adminCommissionAmount,
        sellerEarningAmount: split.sellerEarningAmount,
        buyerAccessState: "granted",
        accessGrantedAt: new Date(),
      });
    }

    const existingSellerCredit = await WalletTransaction.findOne({
      userId: listing.sellerId,
      sourceType: PURCHASE_TYPES.MARKETPLACE,
      sourceId: purchase._id,
      type: "marketplace_sale_credit",
    });

    if (!existingSellerCredit) {
      const summaryRows = await WalletTransaction.aggregate([
        { $match: { userId: listing.sellerId } },
        {
          $group: {
            _id: null,
            credits: {
              $sum: { $cond: [{ $eq: ["$direction", "credit"] }, "$amountInr", 0] },
            },
            debits: {
              $sum: { $cond: [{ $eq: ["$direction", "debit"] }, "$amountInr", 0] },
            },
          },
        },
      ]);
      const summary = summaryRows[0] || { credits: 0, debits: 0 };
      const balanceAfter = summary.credits - summary.debits + split.sellerEarningAmount;

      await WalletTransaction.create({
        userId: listing.sellerId,
        type: "marketplace_sale_credit",
        direction: "credit",
        amountInr: split.sellerEarningAmount,
        sourceType: PURCHASE_TYPES.MARKETPLACE,
        sourceId: purchase._id,
        balanceAfter,
        note: `Marketplace sale credit for ${listing.title}`,
      });
    }

    payment.status = PAYMENT_STATUS.PAID;
    payment.unlockStatus = "unlocked";
    payment.buyerAccessGranted = true;
    payment.razorpayPaymentId = payload.paymentId;
    payment.razorpaySignature = payload.signature;
    payment.verifiedAt = new Date();
    payment.failureReason = "";
    payment.verificationPayload = payload;
    payment.purchaseId = purchase._id;
    payment.adminCommissionAmount = split.adminCommissionAmount;
    payment.sellerEarningAmount = split.sellerEarningAmount;
    await payment.save();

    listing.salesCount = (listing.salesCount || 0) + (existingPurchase ? 0 : 1);
    await listing.save();

    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate("listingId", "title slug taxonomy studyMetadata priceInr")
      .populate("sellerId", "name sellerProfile");

    await notificationService.create({
      userId,
      type: "purchase_success",
      title: "Marketplace purchase completed",
      message: `You now own "${listing.title}" in your purchased PDF library.`,
      actionUrl: "/app/purchased-pdfs",
      metadata: {
        purchaseId: purchase._id.toString(),
        listingId: listing._id.toString(),
      },
    });
    await notificationService.create({
      userId: listing.sellerId,
      type: "sale_credit_received",
      title: "Marketplace sale credited",
      message: `A sale for "${listing.title}" added Rs. ${split.sellerEarningAmount} to your wallet.`,
      actionUrl: "/app/wallet",
      metadata: {
        purchaseId: purchase._id.toString(),
        listingId: listing._id.toString(),
        amountInr: split.sellerEarningAmount,
      },
    });

    return {
      payment: serializePayment(payment),
      purchase: purchaseService.serializePurchase(populatedPurchase),
    };
  },
};
