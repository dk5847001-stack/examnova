import mongoose from "mongoose";
import { COLLECTION_NAMES } from "../constants/db.constants.js";

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    buyerMode: { type: String, default: "account", index: true },
    guestBuyerName: { type: String, default: "", trim: true },
    downloadBuyerName: { type: String, default: "", trim: true },
    purpose: { type: String, required: true, index: true },
    contextType: { type: String, default: "private_pdf", index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, index: true },
    generatedPdfId: { type: mongoose.Schema.Types.ObjectId, ref: "GeneratedPdf", index: true },
    adminUploadId: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUploadedPdf", index: true },
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketplaceListing", index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase", index: true },
    amountInr: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    provider: { type: String, default: "razorpay" },
    status: { type: String, default: "pending", index: true },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String, index: true, sparse: true },
    razorpaySignature: { type: String },
    orderReceipt: { type: String, default: "", index: true, sparse: true },
    unlockStatus: { type: String, default: "locked", index: true },
    buyerAccessGranted: { type: Boolean, default: false },
    adminCommissionAmount: { type: Number, default: 0 },
    sellerEarningAmount: { type: Number, default: 0 },
    verifiedAt: { type: Date },
    failedAt: { type: Date },
    failureReason: { type: String, default: "" },
    verificationPayload: { type: mongoose.Schema.Types.Mixed, default: {} },
    webhookPayload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: COLLECTION_NAMES.PAYMENTS,
  },
);

paymentSchema.index({ userId: 1, generatedPdfId: 1, status: 1 });
paymentSchema.index({ buyerMode: 1, listingId: 1, status: 1 });

export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
