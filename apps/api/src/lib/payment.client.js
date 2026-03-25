import crypto from "node:crypto";
import Razorpay from "razorpay";
import { env } from "../config/index.js";

function createReceipt(prefix, entityId) {
  return `${prefix}_${entityId.toString().slice(-8)}_${Date.now()}`.slice(0, 40);
}

export function createPaymentClient() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new Error("Razorpay credentials are required to initialize the payment client.");
  }

  const razorpay = new Razorpay({
    key_id: env.razorpayKeyId,
    key_secret: env.razorpayKeySecret,
  });

  return {
    getPublicConfig() {
      return {
        provider: "razorpay",
        keyId: env.razorpayKeyId,
      };
    },
    async createPrivatePdfOrder({ generationId, amountInr, notes = {} }) {
      const receipt = createReceipt("pdf", generationId);

      return razorpay.orders.create({
        amount: amountInr * 100,
        currency: "INR",
        receipt,
        notes,
      });
    },
    async createMarketplaceOrder({ listingId, amountInr, notes = {} }) {
      const receipt = createReceipt("mkt", listingId);

      return razorpay.orders.create({
        amount: amountInr * 100,
        currency: "INR",
        receipt,
        notes,
      });
    },
    verifySignature({ orderId, paymentId, signature }) {
      const expectedSignature = crypto
        .createHmac("sha256", env.razorpayKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      return expectedSignature === signature;
    },
  };
}
