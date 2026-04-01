import crypto from "node:crypto";
import mongoose from "mongoose";
import {
  APP_NAME,
  DEVELOPER_MODE_UNLOCK_PRICE,
  MARKETPLACE_SPLIT,
  PAYMENT_CONTEXT_TYPES,
  PAYMENT_PURPOSES,
  PAYMENT_STATUS,
  PURCHASE_TYPES,
} from "../../constants/app.constants.js";
import {
  GeneratedPdf,
  MarketplaceListing,
  Payment,
  Purchase,
  ServiceListing,
  User,
  WalletTransaction,
} from "../../models/index.js";
import { env } from "../../config/index.js";
import { createPaymentClient, hashToken } from "../../lib/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { notificationService } from "../../services/notification.service.js";
import { pdfGenerationService } from "../pdf/pdfGeneration.service.js";
import { purchaseService } from "../purchase/purchase.service.js";
import { getModeAccessSnapshot, isDeveloperUnlocked } from "../../utils/userMode.js";
import { ensureReleasedOrThrow } from "../../utils/marketplaceAvailability.js";
import { createMarketplaceReceiptDownload } from "../../utils/paymentReceipt.js";

const PRIVATE_PDF_PRICE = 4;
const GUEST_PURCHASE_ACCESS_TTL_MS = 1000 * 60 * 60 * 24 * 365;
const PENDING_PAYMENT_REUSE_WINDOW_MS = 15 * 60 * 1000;
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

function buildCheckoutPayload(paymentClient, { amountInr, currency, orderId, description, notes, prefill = {} }) {
  return {
    key: paymentClient.getPublicConfig().keyId,
    amount: amountInr * 100,
    currency,
    orderId,
    name: APP_NAME,
    description,
    prefill,
    notes,
  };
}

async function createProviderOrder({ entityId, amountInr, notes, userMessage, contextType }) {
  const paymentClient = getPaymentClient();

  try {
    const order =
      contextType === PAYMENT_CONTEXT_TYPES.MARKETPLACE || contextType === PAYMENT_CONTEXT_TYPES.SERVICE_ASSET
        ? await paymentClient.createMarketplaceOrder({
          listingId: entityId,
          amountInr,
          notes,
        })
        : contextType === PAYMENT_CONTEXT_TYPES.ACCOUNT_MODE
          ? await paymentClient.createAccountUpgradeOrder({
            userId: entityId,
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
    userId: record.userId?._id?.toString?.() || record.userId?.toString?.() || null,
    buyerMode: record.buyerMode || "account",
    buyerName: record.guestBuyerName || record.userId?.name || "",
    downloadBuyerName: record.downloadBuyerName || record.guestBuyerName || record.userId?.name || "",
    purpose: record.purpose,
    contextType: record.contextType || "private_pdf",
    generatedPdfId: record.generatedPdfId?._id?.toString?.() || record.generatedPdfId?.toString?.() || null,
    listingId: record.listingId?._id?.toString?.() || record.listingId?.toString?.() || null,
    serviceListingId: record.serviceListingId?._id?.toString?.() || record.serviceListingId?.toString?.() || null,
    sellerId: record.sellerId?._id?.toString?.() || record.sellerId?.toString?.() || null,
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

function calculateMarketplaceSplit(listing, amountInr) {
  const numericAmount = Number(amountInr || 0);

  if (listing?.sourceType !== "generated_pdf") {
    return {
      qualifiesForSellerWallet: false,
      sellerSharePercent: 0,
      adminSharePercent: 100,
      sellerEarningAmount: 0,
      adminCommissionAmount: Number(numericAmount.toFixed(2)),
    };
  }

  const sellerEarningAmount = Number(
    ((numericAmount * MARKETPLACE_SPLIT.SELLER_PERCENT) / 100).toFixed(2),
  );
  const adminCommissionAmount = Number((numericAmount - sellerEarningAmount).toFixed(2));
  return {
    qualifiesForSellerWallet: sellerEarningAmount > 0,
    sellerSharePercent: MARKETPLACE_SPLIT.SELLER_PERCENT,
    adminSharePercent: MARKETPLACE_SPLIT.ADMIN_PERCENT,
    sellerEarningAmount,
    adminCommissionAmount,
  };
}

async function findOwnedGeneration(userId, generationId) {
  const generation = await GeneratedPdf.findOne({ _id: generationId, userId });
  if (!generation) {
    throw new ApiError(404, "Generated PDF not found.");
  }
  return generation;
}

async function findAccountUpgradeUser(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User account not found.");
  }

  if (user.isBlocked || user.status === "blocked" || user.status === "suspended") {
    throw new ApiError(403, "Your account is blocked. Please contact support.");
  }

  return user;
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

  ensureReleasedOrThrow(listing);

  return listing;
}

async function findPurchasableService(serviceId) {
  const service = await ServiceListing.findOne({
    _id: serviceId,
    isDeleted: { $ne: true },
    visibility: "published",
  });

  if (!service) {
    throw new ApiError(404, "Website service is not available for purchase.");
  }

  if (!service.zipStorageKey) {
    throw new ApiError(400, "Website service does not have a downloadable ZIP package.");
  }

  return service;
}

function normalizeBuyerName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function isReusablePendingPayment(payment) {
  return Boolean(
    payment?.razorpayOrderId &&
    payment?.createdAt &&
    Date.now() - new Date(payment.createdAt).getTime() <= PENDING_PAYMENT_REUSE_WINDOW_MS,
  );
}

function getCurrentServicePrice(service) {
  const basePrice = Number(service?.priceInr || 0);
  const offerPrice = Number(service?.offerPriceInr || 0);
  return offerPrice > 0 && offerPrice < basePrice ? offerPrice : basePrice;
}

async function issueGuestPurchaseAccess(purchase) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  purchase.guestAccessTokenHash = hashToken(rawToken);
  purchase.guestAccessExpiresAt = new Date(Date.now() + GUEST_PURCHASE_ACCESS_TTL_MS);
  await purchase.save();

  return {
    purchaseId: purchase._id.toString(),
    token: rawToken,
    expiresAt: purchase.guestAccessExpiresAt,
    downloadPath: `/library/guest/${purchase._id.toString()}/download`,
    buyerName: purchase.downloadBuyerName || purchase.guestBuyerName || "",
  };
}

async function ensureSellerCredit(listing, purchase, split) {
  if (!split.qualifiesForSellerWallet || !listing?.sellerId) {
    return;
  }

  const existingSellerCredit = await WalletTransaction.findOne({
    userId: listing.sellerId,
    sourceType: PURCHASE_TYPES.MARKETPLACE,
    sourceId: purchase._id,
    type: "marketplace_sale_credit",
  });

  if (existingSellerCredit) {
    return;
  }

  const summaryRows = await WalletTransaction.aggregate([
    { $match: { userId: listing.sellerId, status: "posted" } },
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
    metadata: {
      listingId: listing._id?.toString?.() || String(listing._id || ""),
      listingTitle: listing.title,
      grossAmountInr: purchase.amountInr,
      sellerSharePercent: split.sellerSharePercent,
      adminSharePercent: split.adminSharePercent,
      sourceType: listing.sourceType || "generated_pdf",
    },
  });
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

    if (isReusablePendingPayment(existingPendingPayment)) {
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
    if (
      payment.purpose !== PAYMENT_PURPOSES.PRIVATE_PDF ||
      payment.contextType !== PAYMENT_CONTEXT_TYPES.PRIVATE_PDF
    ) {
      throw new ApiError(400, "This payment order is not for a private PDF unlock.");
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

  async createDeveloperModeUnlockOrder(userId) {
    const user = await findAccountUpgradeUser(userId);

    if (isDeveloperUnlocked(user)) {
      return {
        alreadyUnlocked: true,
        modeAccess: getModeAccessSnapshot(user),
        payment: null,
        checkout: null,
      };
    }

    const existingPendingPayment = await Payment.findOne({
      userId,
      purpose: PAYMENT_PURPOSES.DEVELOPER_MODE_UNLOCK,
      status: PAYMENT_STATUS.PENDING,
    }).sort({ createdAt: -1 });

    if (isReusablePendingPayment(existingPendingPayment)) {
      const paymentClient = getPaymentClient();

      return {
        alreadyUnlocked: false,
        modeAccess: getModeAccessSnapshot(user),
        payment: serializePayment(existingPendingPayment),
        checkout: buildCheckoutPayload(paymentClient, {
          amountInr: existingPendingPayment.amountInr,
          currency: existingPendingPayment.currency,
          orderId: existingPendingPayment.razorpayOrderId,
          description: "Developer Mode unlock for public selling access",
          notes: {
            contextType: PAYMENT_CONTEXT_TYPES.ACCOUNT_MODE,
            upgradeTarget: PAYMENT_PURPOSES.DEVELOPER_MODE_UNLOCK,
            userId: user._id.toString(),
          },
          prefill: {
            name: user.name,
            email: user.email,
          },
        }),
      };
    }

    const { order, paymentClient } = await createProviderOrder({
      entityId: user._id,
      amountInr: DEVELOPER_MODE_UNLOCK_PRICE,
      contextType: PAYMENT_CONTEXT_TYPES.ACCOUNT_MODE,
      notes: {
        contextType: PAYMENT_CONTEXT_TYPES.ACCOUNT_MODE,
        upgradeTarget: PAYMENT_PURPOSES.DEVELOPER_MODE_UNLOCK,
        userId: user._id.toString(),
      },
      userMessage:
        "Unable to start the Developer Mode unlock payment right now. Please try again in a moment.",
    });

    const payment = await Payment.create({
      userId,
      purpose: PAYMENT_PURPOSES.DEVELOPER_MODE_UNLOCK,
      contextType: PAYMENT_CONTEXT_TYPES.ACCOUNT_MODE,
      targetId: user._id,
      amountInr: DEVELOPER_MODE_UNLOCK_PRICE,
      currency: order.currency || "INR",
      provider: "razorpay",
      status: PAYMENT_STATUS.PENDING,
      unlockStatus: "locked",
      razorpayOrderId: order.id,
      orderReceipt: order.receipt || "",
    });

    return {
      alreadyUnlocked: false,
      modeAccess: getModeAccessSnapshot(user),
      payment: serializePayment(payment),
      checkout: buildCheckoutPayload(paymentClient, {
        amountInr: DEVELOPER_MODE_UNLOCK_PRICE,
        currency: order.currency || "INR",
        orderId: order.id,
        description: "Developer Mode unlock for public selling access",
        notes: {
          contextType: PAYMENT_CONTEXT_TYPES.ACCOUNT_MODE,
          upgradeTarget: PAYMENT_PURPOSES.DEVELOPER_MODE_UNLOCK,
          userId: user._id.toString(),
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
      }),
    };
  },

  async verifyDeveloperModeUnlockPayment(userId, payload) {
    const payment = await findPendingPaymentForOrder(payload.orderId);

    if (String(payment.userId) !== String(userId)) {
      throw new ApiError(403, "You cannot verify another user's Developer Mode payment.");
    }

    if (payment.purpose !== PAYMENT_PURPOSES.DEVELOPER_MODE_UNLOCK) {
      throw new ApiError(400, "This payment order is not for Developer Mode unlock.");
    }

    const user = await findAccountUpgradeUser(userId);

    if (payment.status === PAYMENT_STATUS.PAID && isDeveloperUnlocked(user)) {
      return {
        payment: serializePayment(payment),
        modeAccess: getModeAccessSnapshot(user),
      };
    }

    if (payment.status !== PAYMENT_STATUS.PENDING) {
      throw new ApiError(409, "This Developer Mode payment is no longer pending verification.");
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
        title: "Developer Mode payment verification failed",
        message: "A Developer Mode unlock payment failed signature verification and may need review.",
        actionUrl: "/admin/commerce",
        metadata: {
          paymentId: payment._id.toString(),
          userId: userId.toString(),
          purpose: PAYMENT_PURPOSES.DEVELOPER_MODE_UNLOCK,
        },
      });
      throw new ApiError(400, "Developer Mode payment verification failed.");
    }

    await ensureUniqueVerifiedPaymentId(payload.paymentId, payment._id);

    payment.status = PAYMENT_STATUS.PAID;
    payment.unlockStatus = "unlocked";
    payment.buyerAccessGranted = true;
    payment.razorpayPaymentId = payload.paymentId;
    payment.razorpaySignature = payload.signature;
    payment.verifiedAt = new Date();
    payment.failureReason = "";
    payment.verificationPayload = payload;
    await payment.save();

    user.modeAccess = {
      ...(user.modeAccess || {}),
      currentMode: "developer",
      developerUnlockedAt: user.modeAccess?.developerUnlockedAt || new Date(),
      developerUnlockPaymentId: payment._id,
      developerUnlockAmountInr:
        Number(user.modeAccess?.developerUnlockAmountInr) || DEVELOPER_MODE_UNLOCK_PRICE,
    };
    await user.save();

    await notificationService.create({
      userId,
      type: "developer_mode_unlocked",
      title: "Developer Mode unlocked",
      message: "Your account can now publish and sell PDFs publicly on the ExamNova marketplace.",
      actionUrl: "/app/listed-pdfs",
      metadata: {
        paymentId: payment._id.toString(),
        mode: "developer",
      },
    });
    await notificationService.notifyAdmins({
      type: "admin_alert",
      title: "Developer Mode unlocked",
      message: `${user.name} unlocked Developer Mode and can now publish marketplace PDFs.`,
      actionUrl: "/admin/users",
      metadata: {
        userId: user._id.toString(),
        paymentId: payment._id.toString(),
      },
    });

    return {
      payment: serializePayment(payment),
      modeAccess: getModeAccessSnapshot(user),
    };
  },

  async createMarketplaceOrder(userId, listingId, fullName) {
    const listing = await findPurchasableListing(listingId);
    const downloadBuyerName = normalizeBuyerName(fullName);

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
      if (downloadBuyerName && existingPurchase.downloadBuyerName !== downloadBuyerName) {
        existingPurchase.downloadBuyerName = downloadBuyerName;
        await existingPurchase.save();
      }

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

    if (isReusablePendingPayment(existingPendingPayment)) {
      if (downloadBuyerName && existingPendingPayment.downloadBuyerName !== downloadBuyerName) {
        existingPendingPayment.downloadBuyerName = downloadBuyerName;
        await existingPendingPayment.save();
      }

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
          prefill: {
            name: downloadBuyerName,
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
        prefill: {
          name: downloadBuyerName,
        },
      }),
    };
  },

  async createPublicMarketplaceOrder(listingId, fullName) {
    const listing = await findPurchasableListing(listingId);
    const guestBuyerName = normalizeBuyerName(fullName);
    const guestIdentityId = new mongoose.Types.ObjectId();

    const existingPendingPayment = await Payment.findOne({
      buyerMode: "guest",
      guestBuyerName,
      listingId: listing._id,
      status: PAYMENT_STATUS.PENDING,
    }).sort({ createdAt: -1 });

    if (isReusablePendingPayment(existingPendingPayment)) {
      if (existingPendingPayment.downloadBuyerName !== guestBuyerName) {
        existingPendingPayment.downloadBuyerName = guestBuyerName;
        await existingPendingPayment.save();
      }

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
          prefill: {
            name: guestBuyerName,
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
        guestBuyerName,
      },
      userMessage:
        "Unable to start the public marketplace payment right now. Please try again in a moment.",
    });

    const payment = await Payment.create({
      userId: guestIdentityId,
      buyerMode: "guest",
      guestBuyerName,
      downloadBuyerName: guestBuyerName,
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
        prefill: {
          name: guestBuyerName,
        },
      }),
    };
  },

  async createServiceOrder(userId, serviceId, fullName) {
    const service = await findPurchasableService(serviceId);
    const downloadBuyerName = normalizeBuyerName(fullName);
    const currentPrice = getCurrentServicePrice(service);

    const existingPurchase = await Purchase.findOne({
      buyerId: userId,
      serviceListingId: service._id,
      purchaseType: PURCHASE_TYPES.SERVICE_ASSET,
      status: "completed",
      buyerAccessState: "granted",
    })
      .populate("serviceListingId", "title slug category shortDescription demoUrl repoUrl techStack")
      .populate("sellerId", "name sellerProfile");

    if (existingPurchase) {
      if (downloadBuyerName && existingPurchase.downloadBuyerName !== downloadBuyerName) {
        existingPurchase.downloadBuyerName = downloadBuyerName;
        await existingPurchase.save();
      }

      return {
        alreadyOwned: true,
        purchase: purchaseService.serializePurchase(existingPurchase),
        payment: null,
        checkout: null,
      };
    }

    const existingPendingPayment = await Payment.findOne({
      userId,
      serviceListingId: service._id,
      status: PAYMENT_STATUS.PENDING,
    }).sort({ createdAt: -1 });

    if (isReusablePendingPayment(existingPendingPayment)) {
      if (downloadBuyerName && existingPendingPayment.downloadBuyerName !== downloadBuyerName) {
        existingPendingPayment.downloadBuyerName = downloadBuyerName;
        await existingPendingPayment.save();
      }

      const paymentClient = getPaymentClient();

      return {
        alreadyOwned: false,
        purchase: null,
        payment: serializePayment(existingPendingPayment),
        checkout: buildCheckoutPayload(paymentClient, {
          amountInr: existingPendingPayment.amountInr,
          currency: existingPendingPayment.currency,
          orderId: existingPendingPayment.razorpayOrderId,
          description: `Website service purchase for ${service.title}`,
          notes: {
            contextType: PURCHASE_TYPES.SERVICE_ASSET,
            serviceId: service._id.toString(),
          },
          prefill: {
            name: downloadBuyerName,
          },
        }),
      };
    }

    const { order, paymentClient } = await createProviderOrder({
      entityId: service._id,
      amountInr: currentPrice,
      contextType: PAYMENT_CONTEXT_TYPES.SERVICE_ASSET,
      notes: {
        contextType: PURCHASE_TYPES.SERVICE_ASSET,
        serviceId: service._id.toString(),
        buyerId: userId.toString(),
      },
      userMessage: "Unable to start the website service payment right now. Please try again in a moment.",
    });

    const payment = await Payment.create({
      userId,
      purpose: PAYMENT_PURPOSES.SERVICE_ASSET,
      contextType: PAYMENT_CONTEXT_TYPES.SERVICE_ASSET,
      targetId: service._id,
      serviceListingId: service._id,
      sellerId: service.adminId,
      amountInr: currentPrice,
      currency: order.currency || "INR",
      provider: "razorpay",
      status: PAYMENT_STATUS.PENDING,
      unlockStatus: "locked",
      razorpayOrderId: order.id,
      orderReceipt: order.receipt || "",
      downloadBuyerName,
    });

    return {
      alreadyOwned: false,
      purchase: null,
      payment: serializePayment(payment),
      checkout: buildCheckoutPayload(paymentClient, {
        amountInr: currentPrice,
        currency: order.currency || "INR",
        orderId: order.id,
        description: `Website service purchase for ${service.title}`,
        notes: {
          contextType: PURCHASE_TYPES.SERVICE_ASSET,
          serviceId: service._id.toString(),
        },
        prefill: {
          name: downloadBuyerName,
        },
      }),
    };
  },

  async createPublicServiceOrder(serviceId, fullName) {
    const service = await findPurchasableService(serviceId);
    const guestBuyerName = normalizeBuyerName(fullName);
    const guestIdentityId = new mongoose.Types.ObjectId();
    const currentPrice = getCurrentServicePrice(service);

    const existingPendingPayment = await Payment.findOne({
      buyerMode: "guest",
      guestBuyerName,
      serviceListingId: service._id,
      status: PAYMENT_STATUS.PENDING,
    }).sort({ createdAt: -1 });

    if (isReusablePendingPayment(existingPendingPayment)) {
      if (existingPendingPayment.downloadBuyerName !== guestBuyerName) {
        existingPendingPayment.downloadBuyerName = guestBuyerName;
        await existingPendingPayment.save();
      }

      const paymentClient = getPaymentClient();

      return {
        alreadyOwned: false,
        purchase: null,
        payment: serializePayment(existingPendingPayment),
        checkout: buildCheckoutPayload(paymentClient, {
          amountInr: existingPendingPayment.amountInr,
          currency: existingPendingPayment.currency,
          orderId: existingPendingPayment.razorpayOrderId,
          description: `Website service purchase for ${service.title}`,
          notes: {
            contextType: PURCHASE_TYPES.SERVICE_ASSET,
            serviceId: service._id.toString(),
          },
          prefill: {
            name: guestBuyerName,
          },
        }),
      };
    }

    const { order, paymentClient } = await createProviderOrder({
      entityId: service._id,
      amountInr: currentPrice,
      contextType: PAYMENT_CONTEXT_TYPES.SERVICE_ASSET,
      notes: {
        contextType: PURCHASE_TYPES.SERVICE_ASSET,
        serviceId: service._id.toString(),
        guestBuyerName,
      },
      userMessage: "Unable to start the public website service payment right now. Please try again in a moment.",
    });

    const payment = await Payment.create({
      userId: guestIdentityId,
      buyerMode: "guest",
      guestBuyerName,
      downloadBuyerName: guestBuyerName,
      purpose: PAYMENT_PURPOSES.SERVICE_ASSET,
      contextType: PAYMENT_CONTEXT_TYPES.SERVICE_ASSET,
      targetId: service._id,
      serviceListingId: service._id,
      sellerId: service.adminId,
      amountInr: currentPrice,
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
        amountInr: currentPrice,
        currency: order.currency || "INR",
        orderId: order.id,
        description: `Website service purchase for ${service.title}`,
        notes: {
          contextType: PURCHASE_TYPES.SERVICE_ASSET,
          serviceId: service._id.toString(),
        },
        prefill: {
          name: guestBuyerName,
        },
      }),
    };
  },

  async verifyMarketplacePayment(userId, payload) {
    const payment = await findPendingPaymentForOrder(payload.orderId);

    if (String(payment.userId) !== String(userId)) {
      throw new ApiError(403, "You cannot verify another user's marketplace payment.");
    }
    if (
      payment.purpose !== PAYMENT_PURPOSES.MARKETPLACE ||
      payment.contextType !== PAYMENT_CONTEXT_TYPES.MARKETPLACE
    ) {
      throw new ApiError(400, "This payment order is not for a marketplace purchase.");
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
      const receipt = await createMarketplaceReceiptDownload({
        buyerName: existingPurchase.downloadBuyerName || payment.downloadBuyerName,
        listing,
        payment,
        purchase: existingPurchase,
      });

      return {
        payment: serializePayment(payment),
        purchase: purchaseService.serializePurchase(existingPurchase),
        receipt,
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

    const split = calculateMarketplaceSplit(listing, payment.amountInr);
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
        downloadBuyerName: payment.downloadBuyerName || payment.guestBuyerName || "",
        adminCommissionAmount: split.adminCommissionAmount,
        sellerEarningAmount: split.sellerEarningAmount,
        buyerAccessState: "granted",
        accessGrantedAt: new Date(),
      });
    } else if (
      (payment.downloadBuyerName || payment.guestBuyerName) &&
      purchase.downloadBuyerName !== (payment.downloadBuyerName || payment.guestBuyerName)
    ) {
      purchase.downloadBuyerName = payment.downloadBuyerName || payment.guestBuyerName || "";
      await purchase.save();
    }

    await ensureSellerCredit(listing, purchase, split);

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
    if (split.qualifiesForSellerWallet) {
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
          sellerSharePercent: split.sellerSharePercent,
        },
      });
    }

    const receipt = await createMarketplaceReceiptDownload({
      buyerName: populatedPurchase.downloadBuyerName || payment.downloadBuyerName,
      listing,
      payment,
      purchase: populatedPurchase,
    });

    return {
      payment: serializePayment(payment),
      purchase: purchaseService.serializePurchase(populatedPurchase),
      receipt,
    };
  },

  async verifyPublicMarketplacePayment(payload) {
    const payment = await findPendingPaymentForOrder(payload.orderId);

    if (payment.buyerMode !== "guest") {
      throw new ApiError(403, "This payment order belongs to an authenticated account.");
    }
    if (
      payment.purpose !== PAYMENT_PURPOSES.MARKETPLACE ||
      payment.contextType !== PAYMENT_CONTEXT_TYPES.MARKETPLACE
    ) {
      throw new ApiError(400, "This payment order is not for a marketplace purchase.");
    }

    const listing = await findPurchasableListing(payment.listingId);

    let purchase = await Purchase.findOne({
      paymentId: payment._id,
      status: "completed",
      buyerAccessState: "granted",
    })
      .populate("listingId", "title slug taxonomy studyMetadata priceInr")
      .populate("sellerId", "name sellerProfile");

    if (purchase && payment.status === PAYMENT_STATUS.PAID) {
      const guestAccess = await issueGuestPurchaseAccess(purchase);
      const receipt = await createMarketplaceReceiptDownload({
        buyerName: purchase.downloadBuyerName || payment.downloadBuyerName || payment.guestBuyerName,
        listing,
        payment,
        purchase,
      });
      return {
        payment: serializePayment(payment),
        purchase: purchaseService.serializePurchase(purchase),
        guestAccess,
        receipt,
      };
    }

    if (payment.status !== PAYMENT_STATUS.PENDING && !purchase) {
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
        title: "Guest marketplace payment verification failed",
        message: "A guest marketplace payment failed signature verification and may need review.",
        actionUrl: "/admin/commerce",
        metadata: {
          paymentId: payment._id.toString(),
          listingId: payment.listingId?.toString?.() || null,
          guestBuyerName: payment.guestBuyerName || "",
        },
      });
      throw new ApiError(400, "Marketplace payment verification failed.");
    }

    await ensureUniqueVerifiedPaymentId(payload.paymentId, payment._id);

    const split = calculateMarketplaceSplit(listing, payment.amountInr);
    const isNewPurchase = !purchase;

    if (!purchase) {
      purchase = await Purchase.create({
        buyerId: payment.userId || new mongoose.Types.ObjectId(),
        buyerMode: "guest",
        guestBuyerName: payment.guestBuyerName,
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
        downloadBuyerName: payment.downloadBuyerName || "",
        adminCommissionAmount: split.adminCommissionAmount,
        sellerEarningAmount: split.sellerEarningAmount,
        buyerAccessState: "granted",
        accessGrantedAt: new Date(),
      });
    } else if (payment.downloadBuyerName && purchase.downloadBuyerName !== payment.downloadBuyerName) {
      purchase.downloadBuyerName = payment.downloadBuyerName;
      await purchase.save();
    }

    await ensureSellerCredit(listing, purchase, split);

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

    listing.salesCount = (listing.salesCount || 0) + (isNewPurchase ? 1 : 0);
    await listing.save();

    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate("listingId", "title slug taxonomy studyMetadata priceInr")
      .populate("sellerId", "name sellerProfile");

    const guestAccess = await issueGuestPurchaseAccess(populatedPurchase);

    if (split.qualifiesForSellerWallet) {
      await notificationService.create({
        userId: listing.sellerId,
        type: "sale_credit_received",
        title: "Marketplace sale credited",
        message: `A guest sale for "${listing.title}" added Rs. ${split.sellerEarningAmount} to your wallet.`,
        actionUrl: "/app/wallet",
        metadata: {
          purchaseId: purchase._id.toString(),
          listingId: listing._id.toString(),
          amountInr: split.sellerEarningAmount,
          buyerMode: "guest",
          sellerSharePercent: split.sellerSharePercent,
        },
      });
    }

    const receipt = await createMarketplaceReceiptDownload({
      buyerName: populatedPurchase.downloadBuyerName || payment.downloadBuyerName || payment.guestBuyerName,
      listing,
      payment,
      purchase: populatedPurchase,
    });

    return {
      payment: serializePayment(payment),
      purchase: purchaseService.serializePurchase(populatedPurchase),
      guestAccess,
      receipt,
    };
  },

  async verifyServicePayment(userId, payload) {
    const payment = await findPendingPaymentForOrder(payload.orderId);

    if (String(payment.userId) !== String(userId)) {
      throw new ApiError(403, "You cannot verify another user's website service payment.");
    }
    if (
      payment.purpose !== PAYMENT_PURPOSES.SERVICE_ASSET ||
      payment.contextType !== PAYMENT_CONTEXT_TYPES.SERVICE_ASSET
    ) {
      throw new ApiError(400, "This payment order is not for a website service purchase.");
    }

    const service = await findPurchasableService(payment.serviceListingId);

    const existingPurchase = await Purchase.findOne({
      buyerId: userId,
      serviceListingId: service._id,
      purchaseType: PURCHASE_TYPES.SERVICE_ASSET,
      status: "completed",
      buyerAccessState: "granted",
    })
      .populate("serviceListingId", "title slug category shortDescription demoUrl repoUrl techStack")
      .populate("sellerId", "name sellerProfile");

    if (existingPurchase && payment.status === PAYMENT_STATUS.PAID) {
      return {
        payment: serializePayment(payment),
        purchase: purchaseService.serializePurchase(existingPurchase),
      };
    }

    if (payment.status !== PAYMENT_STATUS.PENDING && !existingPurchase) {
      throw new ApiError(409, "This website service payment is no longer pending verification.");
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
        title: "Website service payment verification failed",
        message: "A website service payment failed signature verification and may need review.",
        actionUrl: "/admin/commerce",
        metadata: {
          paymentId: payment._id.toString(),
          serviceId: payment.serviceListingId?.toString?.() || null,
          userId: userId.toString(),
        },
      });
      throw new ApiError(400, "Website service payment verification failed.");
    }

    await ensureUniqueVerifiedPaymentId(payload.paymentId, payment._id);

    const split = calculateMarketplaceSplit({ sourceType: "service_asset" }, payment.amountInr);
    let purchase = existingPurchase;

    if (!purchase) {
      purchase = await Purchase.create({
        buyerId: userId,
        sellerId: service.adminId,
        purchaseType: PURCHASE_TYPES.SERVICE_ASSET,
        targetId: service._id,
        serviceListingId: service._id,
        paymentId: payment._id,
        amountInr: payment.amountInr,
        currency: payment.currency,
        paymentStatus: PAYMENT_STATUS.PAID,
        status: "completed",
        downloadBuyerName: payment.downloadBuyerName || payment.guestBuyerName || "",
        adminCommissionAmount: split.adminCommissionAmount,
        sellerEarningAmount: split.sellerEarningAmount,
        buyerAccessState: "granted",
        accessGrantedAt: new Date(),
      });
    } else if (
      (payment.downloadBuyerName || payment.guestBuyerName) &&
      purchase.downloadBuyerName !== (payment.downloadBuyerName || payment.guestBuyerName)
    ) {
      purchase.downloadBuyerName = payment.downloadBuyerName || payment.guestBuyerName || "";
      await purchase.save();
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

    service.salesCount = (service.salesCount || 0) + (existingPurchase ? 0 : 1);
    await service.save();

    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate("serviceListingId", "title slug category shortDescription demoUrl repoUrl techStack")
      .populate("sellerId", "name sellerProfile");

    await notificationService.create({
      userId,
      type: "service_purchase_success",
      title: "Website service purchase completed",
      message: `You now own "${service.title}" with ZIP download access.`,
      actionUrl: "/app/purchased-pdfs",
      metadata: {
        purchaseId: purchase._id.toString(),
        serviceId: service._id.toString(),
      },
    });

    return {
      payment: serializePayment(payment),
      purchase: purchaseService.serializePurchase(populatedPurchase),
    };
  },

  async verifyPublicServicePayment(payload) {
    const payment = await findPendingPaymentForOrder(payload.orderId);

    if (payment.buyerMode !== "guest") {
      throw new ApiError(403, "This payment order belongs to an authenticated account.");
    }
    if (
      payment.purpose !== PAYMENT_PURPOSES.SERVICE_ASSET ||
      payment.contextType !== PAYMENT_CONTEXT_TYPES.SERVICE_ASSET
    ) {
      throw new ApiError(400, "This payment order is not for a website service purchase.");
    }

    const service = await findPurchasableService(payment.serviceListingId);

    let purchase = await Purchase.findOne({
      paymentId: payment._id,
      status: "completed",
      buyerAccessState: "granted",
    })
      .populate("serviceListingId", "title slug category shortDescription demoUrl repoUrl techStack")
      .populate("sellerId", "name sellerProfile");

    if (purchase && payment.status === PAYMENT_STATUS.PAID) {
      const guestAccess = await issueGuestPurchaseAccess(purchase);
      return {
        payment: serializePayment(payment),
        purchase: purchaseService.serializePurchase(purchase),
        guestAccess,
      };
    }

    if (payment.status !== PAYMENT_STATUS.PENDING && !purchase) {
      throw new ApiError(409, "This website service payment is no longer pending verification.");
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
        title: "Guest website service payment verification failed",
        message: "A guest website service payment failed signature verification and may need review.",
        actionUrl: "/admin/commerce",
        metadata: {
          paymentId: payment._id.toString(),
          serviceId: payment.serviceListingId?.toString?.() || null,
          guestBuyerName: payment.guestBuyerName || "",
        },
      });
      throw new ApiError(400, "Website service payment verification failed.");
    }

    await ensureUniqueVerifiedPaymentId(payload.paymentId, payment._id);

    const split = calculateMarketplaceSplit({ sourceType: "service_asset" }, payment.amountInr);
    const isNewPurchase = !purchase;

    if (!purchase) {
      purchase = await Purchase.create({
        buyerId: payment.userId || new mongoose.Types.ObjectId(),
        buyerMode: "guest",
        guestBuyerName: payment.guestBuyerName,
        sellerId: service.adminId,
        purchaseType: PURCHASE_TYPES.SERVICE_ASSET,
        targetId: service._id,
        serviceListingId: service._id,
        paymentId: payment._id,
        amountInr: payment.amountInr,
        currency: payment.currency,
        paymentStatus: PAYMENT_STATUS.PAID,
        status: "completed",
        downloadBuyerName: payment.downloadBuyerName || "",
        adminCommissionAmount: split.adminCommissionAmount,
        sellerEarningAmount: split.sellerEarningAmount,
        buyerAccessState: "granted",
        accessGrantedAt: new Date(),
      });
    } else if (payment.downloadBuyerName && purchase.downloadBuyerName !== payment.downloadBuyerName) {
      purchase.downloadBuyerName = payment.downloadBuyerName;
      await purchase.save();
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

    service.salesCount = (service.salesCount || 0) + (isNewPurchase ? 1 : 0);
    await service.save();

    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate("serviceListingId", "title slug category shortDescription demoUrl repoUrl techStack")
      .populate("sellerId", "name sellerProfile");

    const guestAccess = await issueGuestPurchaseAccess(populatedPurchase);

    return {
      payment: serializePayment(payment),
      purchase: purchaseService.serializePurchase(populatedPurchase),
      guestAccess,
    };
  },
};
