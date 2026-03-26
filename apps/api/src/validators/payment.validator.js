import { ApiError } from "../utils/ApiError.js";
import { ensureMinLength, ensureObjectId, ensureRequiredString } from "./common.js";

export function validatePrivatePdfOrderRequest(req, _res, next) {
  try {
    req.body = {
      generationId: ensureObjectId(req.body?.generationId, "generationId"),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validatePaymentVerification(req, _res, next) {
  try {
    const paymentId = ensureRequiredString(req.body?.paymentId, "paymentId", {
      maxLength: 80,
      collapseWhitespace: false,
    });
    const orderId = ensureRequiredString(req.body?.orderId, "orderId", {
      maxLength: 80,
      collapseWhitespace: false,
    });
    const signature = ensureRequiredString(req.body?.signature, "signature", {
      maxLength: 256,
      collapseWhitespace: false,
    });

    if (!/^pay_[a-zA-Z0-9]+$/.test(paymentId)) {
      throw new ApiError(422, "paymentId must be a valid Razorpay payment id.");
    }
    if (!/^order_[a-zA-Z0-9]+$/.test(orderId)) {
      throw new ApiError(422, "orderId must be a valid Razorpay order id.");
    }
    if (!/^[a-fA-F0-9]{64,256}$/.test(signature)) {
      throw new ApiError(422, "signature must be a valid verification signature.");
    }

    req.body = { paymentId, orderId, signature };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validateMarketplaceOrderRequest(req, _res, next) {
  try {
    const fullName = ensureMinLength(
      ensureRequiredString(req.body?.fullName, "fullName", { maxLength: 80 }),
      "fullName",
      2,
    );

    req.body = {
      listingId: ensureObjectId(req.body?.listingId, "listingId"),
      fullName,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function validatePublicMarketplaceOrderRequest(req, _res, next) {
  try {
    const fullName = ensureMinLength(
      ensureRequiredString(req.body?.fullName, "fullName", { maxLength: 80 }),
      "fullName",
      2,
    );

    req.body = {
      listingId: ensureObjectId(req.body?.listingId, "listingId"),
      fullName,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}
