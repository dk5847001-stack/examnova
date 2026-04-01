import { sendSuccess } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { paymentService } from "./payment.service.js";

export const paymentController = {
  async createDeveloperModeUnlockOrder(req, res) {
    const result = await paymentService.createDeveloperModeUnlockOrder(req.auth.userId);
    return sendSuccess(res, result, "Developer Mode payment order created successfully.", 201);
  },
  async createPrivatePdfOrder(req, res) {
    const result = await paymentService.createPrivatePdfOrder(req.auth.userId, req.body.generationId);
    return sendSuccess(res, result, "Private PDF payment order created successfully.", 201);
  },
  async createPublicMarketplaceOrder(req, res) {
    const result = await paymentService.createPublicMarketplaceOrder(req.body.listingId, req.body.fullName);
    return sendSuccess(res, result, "Public marketplace payment order created successfully.", 201);
  },
  async createPublicServiceOrder(req, res) {
    const result = await paymentService.createPublicServiceOrder(req.body.serviceId, req.body.fullName);
    return sendSuccess(res, result, "Public website service payment order created successfully.", 201);
  },
  async createMarketplaceOrder(req, res) {
    const result = await paymentService.createMarketplaceOrder(
      req.auth.userId,
      req.body.listingId,
      req.body.fullName,
    );
    return sendSuccess(res, result, "Marketplace payment order created successfully.", 201);
  },
  async createServiceOrder(req, res) {
    const result = await paymentService.createServiceOrder(
      req.auth.userId,
      req.body.serviceId,
      req.body.fullName,
    );
    return sendSuccess(res, result, "Website service payment order created successfully.", 201);
  },
  async verifyPrivatePdfPayment(req, res) {
    const result = await paymentService.verifyPrivatePdfPayment(req.auth.userId, req.body);
    return sendSuccess(res, result, "Private PDF payment verified successfully.");
  },
  async verifyMarketplacePayment(req, res) {
    const result = await paymentService.verifyMarketplacePayment(req.auth.userId, req.body);
    return sendSuccess(res, result, "Marketplace payment verified successfully.");
  },
  async verifyServicePayment(req, res) {
    const result = await paymentService.verifyServicePayment(req.auth.userId, req.body);
    return sendSuccess(res, result, "Website service payment verified successfully.");
  },
  async verifyDeveloperModeUnlockPayment(req, res) {
    const result = await paymentService.verifyDeveloperModeUnlockPayment(req.auth.userId, req.body);
    return sendSuccess(res, result, "Developer Mode payment verified successfully.");
  },
  async verifyPublicMarketplacePayment(req, res) {
    const result = await paymentService.verifyPublicMarketplacePayment(req.body);
    return sendSuccess(res, result, "Public marketplace payment verified successfully.");
  },
  async verifyPublicServicePayment(req, res) {
    const result = await paymentService.verifyPublicServicePayment(req.body);
    return sendSuccess(res, result, "Public website service payment verified successfully.");
  },
  async getPrivatePdfPaymentStatus(req, res) {
    const result = await paymentService.getPrivatePdfPaymentStatus(
      req.auth.userId,
      req.params.generationId,
    );
    return sendSuccess(res, result, "Private PDF payment status fetched successfully.");
  },
  handleWebhook() {
    throw new ApiError(501, "Razorpay webhook handling is not configured on this deployment.");
  },
};
