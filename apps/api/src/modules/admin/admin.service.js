import {
  AdminUploadedPdf,
  AuditLog,
  GeneratedPdf,
  MarketplaceListing,
  Payment,
  Purchase,
  UpcomingLockedPdf,
  User,
  WalletTransaction,
  WithdrawalRequest,
} from "../../models/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { MARKETPLACE_COVER_SEALS } from "../../constants/app.constants.js";
import { walletService } from "../wallet/wallet.service.js";
import { notificationService } from "../../services/notification.service.js";
import { getModeAccessSnapshot } from "../../utils/userMode.js";
import {
  normalizeCoverSeal,
  normalizeReleaseAt,
} from "../../utils/marketplaceAvailability.js";

function toSearchRegex(value) {
  return new RegExp(String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

function buildListingSearchText(listing) {
  return [
    listing.title,
    listing.description,
    String(listing.category || "").replace(/_/g, " "),
    listing.taxonomy?.subject,
    listing.taxonomy?.semester,
    listing.taxonomy?.branch,
    listing.taxonomy?.university,
    listing.studyMetadata?.examFocus,
    listing.studyMetadata?.questionType,
    listing.studyMetadata?.difficultyLevel,
    listing.studyMetadata?.intendedAudience,
    ...(listing.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    isEmailVerified: Boolean(user.isEmailVerified),
    isBlocked: Boolean(user.isBlocked),
    blockedReason: user.blockedReason || "",
    phone: user.phone || "",
    academicProfile: user.academicProfile || {},
    sellerProfile: user.sellerProfile || {},
    modeAccess: getModeAccessSnapshot(user),
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function serializeListing(listing) {
  return {
    id: listing._id.toString(),
    title: listing.title,
    slug: listing.slug,
    sellerId: listing.sellerId?._id?.toString?.() || listing.sellerId?.toString?.() || null,
    sellerName: listing.sellerId?.sellerProfile?.displayName || listing.sellerId?.name || "ExamNova Seller",
    sourcePdfId: listing.sourcePdfId?._id?.toString?.() || listing.sourcePdfId?.toString?.() || null,
    priceInr: listing.priceInr,
    sourceType: listing.sourceType || "generated_pdf",
    adminUploadId: listing.adminUploadId?._id?.toString?.() || listing.adminUploadId?.toString?.() || null,
    category: listing.category || "",
    visibility: listing.visibility,
    approvalStatus: listing.approvalStatus,
    moderationStatus: listing.moderationStatus,
    isPublished: Boolean(listing.isPublished),
    salesCount: listing.salesCount || 0,
    viewCount: listing.viewCount || 0,
    coverSeal: listing.coverSeal || "",
    releaseAt: listing.releaseAt || null,
    taxonomy: listing.taxonomy,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    publishedAt: listing.publishedAt || null,
  };
}

function serializePayment(payment) {
  return {
    id: payment._id.toString(),
    userId: payment.userId?._id?.toString?.() || payment.userId?.toString?.() || null,
    userName: payment.userId?.name || payment.guestBuyerName || "",
    buyerMode: payment.buyerMode || "account",
    sellerId: payment.sellerId?._id?.toString?.() || payment.sellerId?.toString?.() || null,
    sellerName: payment.sellerId?.name || "",
    listingId: payment.listingId?._id?.toString?.() || payment.listingId?.toString?.() || null,
    listingTitle: payment.listingId?.title || "",
    generatedPdfId: payment.generatedPdfId?._id?.toString?.() || payment.generatedPdfId?.toString?.() || null,
    purpose: payment.purpose,
    contextType: payment.contextType,
    amountInr: payment.amountInr,
    status: payment.status,
    provider: payment.provider,
    razorpayOrderId: payment.razorpayOrderId || "",
    razorpayPaymentId: payment.razorpayPaymentId || "",
    buyerAccessGranted: Boolean(payment.buyerAccessGranted),
    adminCommissionAmount: payment.adminCommissionAmount || 0,
    sellerEarningAmount: payment.sellerEarningAmount || 0,
    verifiedAt: payment.verifiedAt || null,
    createdAt: payment.createdAt,
  };
}

function serializePurchase(purchase) {
  return {
    id: purchase._id.toString(),
    buyerId: purchase.buyerId?._id?.toString?.() || purchase.buyerId?.toString?.() || null,
    buyerName: purchase.buyerId?.name || purchase.guestBuyerName || "",
    buyerMode: purchase.buyerMode || "account",
    sellerId: purchase.sellerId?._id?.toString?.() || purchase.sellerId?.toString?.() || null,
    sellerName: purchase.sellerId?.name || "",
    listingId: purchase.listingId?._id?.toString?.() || purchase.listingId?.toString?.() || null,
    listingTitle: purchase.listingId?.title || "",
    amountInr: purchase.amountInr,
    paymentStatus: purchase.paymentStatus,
    status: purchase.status,
    buyerAccessState: purchase.buyerAccessState,
    adminCommissionAmount: purchase.adminCommissionAmount || 0,
    sellerEarningAmount: purchase.sellerEarningAmount || 0,
    createdAt: purchase.createdAt,
  };
}

function serializeWithdrawal(item) {
  return {
    id: item._id.toString(),
    userId: item.userId?._id?.toString?.() || item.userId?.toString?.() || null,
    userName: item.userId?.name || "",
    userEmail: item.userId?.email || "",
    amountInr: item.amountInr,
    currency: item.currency || "INR",
    status: item.status,
    payoutMethod: item.payoutMethod || "upi",
    accountReference: item.accountReference || "",
    payoutDetails: item.payoutDetails || {},
    payoutSummary:
      item.payoutMethod === "bank_account"
        ? [item.payoutDetails?.accountHolderName || "", item.accountReference || "", item.payoutDetails?.ifscCode || ""]
          .filter(Boolean)
          .join(" - ")
        : [item.payoutDetails?.accountHolderName || "", item.accountReference || item.payoutDetails?.upiId || ""]
          .filter(Boolean)
          .join(" - "),
    userNote: item.userNote || "",
    adminNote: item.adminNote || "",
    payoutReference: item.payoutReference || "",
    requestedAt: item.requestedAt,
    approvedAt: item.approvedAt || null,
    rejectedAt: item.rejectedAt || null,
    paidAt: item.paidAt || null,
    cancelledAt: item.cancelledAt || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function createAuditLog({ actor, req, action, entityType, entityId, before, after }) {
  await AuditLog.create({
    actorId: actor?._id || null,
    actorRole: actor?.role || "",
    action,
    entityType,
    entityId: entityId || null,
    before: before || null,
    after: after || null,
    ipAddress: req.ip || "",
    requestId: req.context?.requestId || "",
  });
}

async function releaseWithdrawalHold(withdrawal) {
  if (withdrawal.releaseTransactionId) {
    return;
  }

  const snapshot = await walletService.getWalletSnapshot(withdrawal.userId);
  const releaseTransaction = await WalletTransaction.create({
    userId: withdrawal.userId,
    type: "withdrawal_rejection_release",
    direction: "credit",
    amountInr: withdrawal.amountInr,
    currency: withdrawal.currency || "INR",
    sourceType: "withdrawal_request",
    sourceId: withdrawal._id,
    balanceAfter: snapshot.availableBalance + withdrawal.amountInr,
    note: `Withdrawal rejection release for Rs. ${withdrawal.amountInr}`,
    status: "posted",
    metadata: {
      payoutMethod: withdrawal.payoutMethod || "upi",
      accountReference: withdrawal.accountReference || "",
      releaseReason: "admin_rejected",
    },
  });

  withdrawal.releaseTransactionId = releaseTransaction._id;
}

export const adminService = {
  async getDashboardSummary() {
  const [
      totalUsers,
      activeUsers,
      totalGeneratedPdfs,
      totalAdminUploadedPdfs,
      totalListings,
      totalPurchases,
      totalPayments,
      pendingWithdrawals,
      totalUpcomingLockedPdfs,
      revenueRows,
      pendingWithdrawalRows,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBlocked: false, status: "active" }),
      GeneratedPdf.countDocuments(),
      AdminUploadedPdf.countDocuments(),
      MarketplaceListing.countDocuments(),
      Purchase.countDocuments(),
      Payment.countDocuments(),
      WithdrawalRequest.countDocuments({ status: "pending" }),
      UpcomingLockedPdf.countDocuments({ status: "upcoming", visibility: true }),
      Payment.aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: null,
            adminRevenue: { $sum: "$adminCommissionAmount" },
            sellerEarnings: { $sum: "$sellerEarningAmount" },
          },
        },
      ]),
      WithdrawalRequest.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amountInr" } } },
      ]),
    ]);

    const revenue = revenueRows[0] || { adminRevenue: 0, sellerEarnings: 0 };

    return {
      metrics: {
        totalUsers,
        activeUsers,
        totalGeneratedPdfs,
        totalAdminUploadedPdfs,
        totalMarketplaceListings: totalListings,
        totalPurchases,
        totalPayments,
        pendingWithdrawalRequests: pendingWithdrawals,
        totalUpcomingLockedPdfs,
        adminRevenue: revenue.adminRevenue || 0,
        totalSellerEarnings: revenue.sellerEarnings || 0,
        pendingWithdrawalAmount: pendingWithdrawalRows[0]?.total || 0,
      },
    };
  },

  async listUsers(query) {
    const filter = {};
    if (query.search) {
      filter.$or = [
        { name: toSearchRegex(query.search) },
        { email: toSearchRegex(query.search) },
      ];
    }
    if (query.status) {
      filter.status = query.status;
    }
    if (query.role) {
      filter.role = query.role;
    }

    const users = await User.find(filter).sort({ createdAt: -1 }).limit(100);
    return users.map(serializeUser);
  },

  async getUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    const [generatedPdfs, listings, purchases, wallet] = await Promise.all([
      GeneratedPdf.countDocuments({ userId }),
      MarketplaceListing.countDocuments({ sellerId: userId }),
      Purchase.countDocuments({ buyerId: userId }),
      walletService.getWalletSnapshot(userId),
    ]);

    return {
      user: serializeUser(user),
      stats: {
        generatedPdfs,
        listings,
        purchases,
        availableBalance: wallet.availableBalance,
      },
    };
  },

  async updateUserStatus(userId, payload, actor, req) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    if (String(actor?._id || actor?.id) === String(user._id) && payload.action === "block") {
      throw new ApiError(400, "Admins cannot block their own account.");
    }

    const before = serializeUser(user);
    const action = payload.action;

    if (action === "block") {
      user.isBlocked = true;
      user.status = "blocked";
      user.blockedReason = payload.reason || "Blocked by admin.";
    } else if (action === "unblock") {
      user.isBlocked = false;
      user.status = user.isEmailVerified ? "active" : "pending_verification";
      user.blockedReason = "";
    } else {
      throw new ApiError(422, "Unsupported user action.");
    }

    await user.save();
    const after = serializeUser(user);
    await createAuditLog({
      actor,
      req,
      action: action === "block" ? "admin.user.block" : "admin.user.unblock",
      entityType: "User",
      entityId: user._id,
      before,
      after,
    });

    await notificationService.create({
      userId: user._id,
      type: action === "block" ? "account_blocked" : "account_unblocked",
      title: action === "block" ? "Account status changed" : "Account access restored",
      message:
        action === "block"
          ? "Your account has been blocked by the admin team."
          : "Your account has been unblocked and is available again.",
      actionUrl: "/app/dashboard",
      metadata: {
        reason: user.blockedReason || "",
      },
    });

    return after;
  },

  async listListings(query) {
    const filter = {};
    if (query.search) {
      filter.$or = [
        { title: toSearchRegex(query.search) },
        { slug: toSearchRegex(query.search) },
        { "taxonomy.subject": toSearchRegex(query.search) },
      ];
    }
    if (query.visibility) {
      filter.visibility = query.visibility;
    }
    if (query.moderationStatus) {
      filter.moderationStatus = query.moderationStatus;
    }

    const listings = await MarketplaceListing.find(filter)
      .populate("sellerId", "name role sellerProfile")
      .populate("sourcePdfId", "title pdfGenerationStatus pdfGeneratedAt")
      .sort({ createdAt: -1 })
      .limit(100);

    return listings.map(serializeListing);
  },

  async updateListingStatus(listingId, payload, actor, req) {
    const listing = await MarketplaceListing.findById(listingId).populate("sellerId", "name role sellerProfile");
    if (!listing) {
      throw new ApiError(404, "Listing not found.");
    }

    const before = serializeListing(listing);
    if (payload.action === "unlist") {
      listing.visibility = "unlisted";
      listing.isPublished = false;
      listing.moderationStatus = "restricted";
    } else if (payload.action === "publish") {
      listing.visibility = "published";
      listing.isPublished = true;
      listing.moderationStatus = "clear";
      listing.publishedAt = listing.publishedAt || new Date();
    } else if (payload.action === "flag_suspicious") {
      listing.visibility = "unlisted";
      listing.isPublished = false;
      listing.moderationStatus = "suspicious";
    } else if (payload.action === "clear_flag") {
      listing.moderationStatus = "clear";
    } else {
      throw new ApiError(422, "Unsupported listing action.");
    }

    await listing.save();
    const after = serializeListing(listing);
    await createAuditLog({
      actor,
      req,
      action:
        payload.action === "unlist"
          ? "admin.listing.unlist"
          : payload.action === "publish"
            ? "admin.listing.publish"
            : payload.action === "flag_suspicious"
              ? "admin.listing.flag_suspicious"
              : "admin.listing.clear_flag",
      entityType: "MarketplaceListing",
      entityId: listing._id,
      before,
      after,
    });

    await notificationService.create({
      userId: listing.sellerId?._id || listing.sellerId,
      type:
        payload.action === "publish"
          ? "listing_published"
          : payload.action === "unlist"
            ? "listing_unlisted"
            : payload.action === "flag_suspicious"
              ? "listing_flagged"
              : "listing_cleared",
      title: "Marketplace listing status changed",
      message:
        payload.action === "publish"
          ? `Your listing "${listing.title}" is published again.`
          : payload.action === "unlist"
            ? `Your listing "${listing.title}" was unlisted by the admin team.`
            : payload.action === "flag_suspicious"
              ? `Your listing "${listing.title}" was flagged for review by the admin team.`
              : `Your listing "${listing.title}" was cleared by the admin team.`,
      actionUrl: "/app/listed-pdfs",
      metadata: {
        listingId: listing._id.toString(),
        action: payload.action,
      },
    });

    return after;
  },

  async updateListingMetadata(listingId, payload, actor, req) {
    const listing = await MarketplaceListing.findById(listingId).populate("sellerId", "name role sellerProfile");
    if (!listing) {
      throw new ApiError(404, "Listing not found.");
    }

    const before = serializeListing(listing);

    listing.title = payload.title;
    listing.priceInr = Number(payload.priceInr);
    listing.releaseAt = normalizeReleaseAt(payload.releaseAt);
    listing.coverSeal = normalizeCoverSeal(payload.coverSeal);
    listing.searchText = buildListingSearchText(listing);
    await listing.save();

    if (listing.sourceType === "admin_upload" && listing.adminUploadId) {
      await AdminUploadedPdf.findByIdAndUpdate(listing.adminUploadId, {
        title: payload.title,
        priceInr: Number(payload.priceInr),
        releaseAt: normalizeReleaseAt(payload.releaseAt),
        coverSeal: normalizeCoverSeal(payload.coverSeal),
      });
    }

    const after = serializeListing(listing);
    await createAuditLog({
      actor,
      req,
      action: "admin.listing.update_metadata",
      entityType: "MarketplaceListing",
      entityId: listing._id,
      before,
      after,
    });

    return after;
  },

  async deleteListing(listingId, actor, req) {
    const listing = await MarketplaceListing.findById(listingId).populate("sellerId", "name role sellerProfile");
    if (!listing) {
      throw new ApiError(404, "Listing not found.");
    }

    const before = serializeListing(listing);

    if (listing.sourceType === "admin_upload" && listing.adminUploadId) {
      const adminUpload = await AdminUploadedPdf.findById(listing.adminUploadId);
      if (adminUpload) {
        adminUpload.isDeleted = true;
        adminUpload.deletedAt = new Date();
        adminUpload.visibility = "archived";
        await adminUpload.save();
      }
    } else if (listing.sourceType === "generated_pdf" && listing.sourcePdfId) {
      await GeneratedPdf.findByIdAndUpdate(listing.sourcePdfId, {
        listedInMarketplace: false,
      });
    }

    await MarketplaceListing.findByIdAndDelete(listing._id);

    await createAuditLog({
      actor,
      req,
      action: "admin.listing.delete",
      entityType: "MarketplaceListing",
      entityId: listing._id,
      before,
      after: { deleted: true },
    });

    return {
      id: listing._id.toString(),
      title: listing.title,
    };
  },

  async listPurchases() {
    const items = await Purchase.find()
      .populate("buyerId", "name email")
      .populate("sellerId", "name email")
      .populate("listingId", "title slug")
      .sort({ createdAt: -1 })
      .limit(100);

    return items.map(serializePurchase);
  },

  async listPayments() {
    const items = await Payment.find()
      .populate("userId", "name email")
      .populate("sellerId", "name email")
      .populate("listingId", "title slug")
      .populate("generatedPdfId", "title")
      .sort({ createdAt: -1 })
      .limit(100);

    return items.map(serializePayment);
  },

  async listWithdrawals() {
    const items = await WithdrawalRequest.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    return items.map(serializeWithdrawal);
  },

  async updateWithdrawalStatus(withdrawalId, payload, actor, req) {
    const withdrawal = await WithdrawalRequest.findById(withdrawalId).populate("userId", "name email");
    if (!withdrawal) {
      throw new ApiError(404, "Withdrawal request not found.");
    }

    const before = serializeWithdrawal(withdrawal);
    const action = payload.action;

    if (action === "approve") {
      if (withdrawal.status !== "pending") {
        throw new ApiError(400, "Only pending withdrawals can be approved.");
      }
      withdrawal.status = "approved";
      withdrawal.reviewedBy = actor._id;
      withdrawal.reviewedAt = new Date();
      withdrawal.approvedAt = new Date();
      withdrawal.adminNote = payload.adminNote || withdrawal.adminNote || "";
    } else if (action === "reject") {
      if (withdrawal.status !== "pending") {
        throw new ApiError(400, "Only pending withdrawals can be rejected.");
      }
      await releaseWithdrawalHold(withdrawal);
      withdrawal.status = "rejected";
      withdrawal.reviewedBy = actor._id;
      withdrawal.reviewedAt = new Date();
      withdrawal.rejectedAt = new Date();
      withdrawal.adminNote = payload.adminNote || withdrawal.adminNote || "";
    } else if (action === "mark_paid") {
      if (withdrawal.status !== "approved") {
        throw new ApiError(400, "Only approved withdrawals can be marked as paid.");
      }
      if (!payload.payoutReference) {
        throw new ApiError(422, "payoutReference is required when marking a withdrawal as paid.");
      }
      withdrawal.status = "paid";
      withdrawal.reviewedBy = actor._id;
      withdrawal.reviewedAt = new Date();
      withdrawal.approvedAt = withdrawal.approvedAt || new Date();
      withdrawal.paidAt = new Date();
      withdrawal.adminNote = payload.adminNote || withdrawal.adminNote || "";
      withdrawal.payoutReference = payload.payoutReference || withdrawal.payoutReference || "";
    } else {
      throw new ApiError(422, "Unsupported withdrawal action.");
    }

    await withdrawal.save();
    const after = serializeWithdrawal(withdrawal);
    await createAuditLog({
      actor,
      req,
      action: `admin.withdrawal.${action}`,
      entityType: "WithdrawalRequest",
      entityId: withdrawal._id,
      before,
      after,
    });

    await notificationService.create({
      userId: withdrawal.userId?._id || withdrawal.userId,
      type:
        action === "approve"
          ? "withdrawal_approved"
          : action === "reject"
            ? "withdrawal_rejected"
            : "withdrawal_paid",
      title:
        action === "approve"
          ? "Withdrawal approved"
          : action === "reject"
            ? "Withdrawal rejected"
            : "Withdrawal marked paid",
      message:
        action === "approve"
          ? `Your withdrawal request for Rs. ${withdrawal.amountInr} was approved.`
          : action === "reject"
            ? `Your withdrawal request for Rs. ${withdrawal.amountInr} was rejected.`
            : `Your withdrawal request for Rs. ${withdrawal.amountInr} was marked paid.`,
      actionUrl: "/app/withdrawals",
      metadata: {
        withdrawalId: withdrawal._id.toString(),
        adminNote: withdrawal.adminNote || "",
      },
    });

    return after;
  },
};
