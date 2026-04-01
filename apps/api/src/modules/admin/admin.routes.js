import { Router } from "express";
import { adminController } from "./admin.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { adminActionRateLimiter } from "../../middleware/index.js";
import { USER_ROLES } from "../../constants/app.constants.js";
import {
  validateAdminListingAction,
  validateAdminListingUpdate,
  validateAdminUserAction,
  validateAdminWithdrawalAction,
  validateObjectIdParam,
} from "../../validators/index.js";

const router = Router();

router.use(requireAuth, requireRole([USER_ROLES.ADMIN]), adminActionRateLimiter);
router.get("/dashboard", asyncHandler(adminController.getDashboard));
router.get("/analytics/overview", asyncHandler(adminController.getAnalyticsOverview));
router.get("/analytics/trends", asyncHandler(adminController.getTrendAnalytics));
router.get("/alerts", asyncHandler(adminController.getAlerts));
router.get("/audit-logs", asyncHandler(adminController.listAuditLogs));
router.get("/moderation/listings", asyncHandler(adminController.listModerationQueue));
router.get("/users", asyncHandler(adminController.listUsers));
router.get("/users/:id", validateObjectIdParam(), asyncHandler(adminController.getUser));
router.patch("/users/:id/status", validateObjectIdParam(), validateAdminUserAction, asyncHandler(adminController.updateUserStatus));
router.get("/listings", asyncHandler(adminController.listListings));
router.patch("/listings/:id/status", validateObjectIdParam(), validateAdminListingAction, asyncHandler(adminController.updateListingStatus));
router.patch("/listings/:id", validateObjectIdParam(), validateAdminListingUpdate, asyncHandler(adminController.updateListingMetadata));
router.delete("/listings/:id", validateObjectIdParam(), asyncHandler(adminController.deleteListing));
router.get("/purchases", asyncHandler(adminController.listPurchases));
router.get("/payments", asyncHandler(adminController.listPayments));
router.get("/withdrawals", asyncHandler(adminController.listWithdrawals));
router.patch(
  "/withdrawals/:id/status",
  validateObjectIdParam(),
  validateAdminWithdrawalAction,
  asyncHandler(adminController.updateWithdrawalStatus),
);

export { router as adminRoutes };
