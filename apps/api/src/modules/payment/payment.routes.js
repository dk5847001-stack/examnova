import { Router } from "express";
import { paymentController } from "./payment.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { paymentRateLimiter } from "../../middleware/index.js";
import {
  validateMarketplaceOrderRequest,
  validatePublicServiceOrderRequest,
  validatePublicMarketplaceOrderRequest,
  validatePaymentVerification,
  validatePrivatePdfOrderRequest,
  validateServiceOrderRequest,
} from "../../validators/index.js";

const router = Router();

router.post(
  "/developer-mode-order",
  requireAuth,
  paymentRateLimiter,
  asyncHandler(paymentController.createDeveloperModeUnlockOrder),
);
router.post(
  "/developer-mode-verify",
  requireAuth,
  paymentRateLimiter,
  validatePaymentVerification,
  asyncHandler(paymentController.verifyDeveloperModeUnlockPayment),
);
router.post(
  "/public-marketplace-order",
  paymentRateLimiter,
  validatePublicMarketplaceOrderRequest,
  asyncHandler(paymentController.createPublicMarketplaceOrder),
);
router.post(
  "/public-marketplace-verify",
  paymentRateLimiter,
  validatePaymentVerification,
  asyncHandler(paymentController.verifyPublicMarketplacePayment),
);
router.post(
  "/public-service-order",
  paymentRateLimiter,
  validatePublicServiceOrderRequest,
  asyncHandler(paymentController.createPublicServiceOrder),
);
router.post(
  "/public-service-verify",
  paymentRateLimiter,
  validatePaymentVerification,
  asyncHandler(paymentController.verifyPublicServicePayment),
);
router.post(
  "/private-pdf-order",
  requireAuth,
  paymentRateLimiter,
  validatePrivatePdfOrderRequest,
  asyncHandler(paymentController.createPrivatePdfOrder),
);
router.get(
  "/private-pdf/:generationId/status",
  requireAuth,
  asyncHandler(paymentController.getPrivatePdfPaymentStatus),
);
router.post(
  "/private-pdf-verify",
  requireAuth,
  paymentRateLimiter,
  validatePaymentVerification,
  asyncHandler(paymentController.verifyPrivatePdfPayment),
);
router.post(
  "/marketplace-order",
  requireAuth,
  paymentRateLimiter,
  validateMarketplaceOrderRequest,
  asyncHandler(paymentController.createMarketplaceOrder),
);
router.post(
  "/marketplace-verify",
  requireAuth,
  paymentRateLimiter,
  validatePaymentVerification,
  asyncHandler(paymentController.verifyMarketplacePayment),
);
router.post(
  "/service-order",
  requireAuth,
  paymentRateLimiter,
  validateServiceOrderRequest,
  asyncHandler(paymentController.createServiceOrder),
);
router.post(
  "/service-verify",
  requireAuth,
  paymentRateLimiter,
  validatePaymentVerification,
  asyncHandler(paymentController.verifyServicePayment),
);
router.post("/webhook", asyncHandler(paymentController.handleWebhook));

export { router as paymentRoutes };
