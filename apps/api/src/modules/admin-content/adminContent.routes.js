import { Router } from "express";
import { adminContentController } from "./adminContent.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { adminActionRateLimiter } from "../../middleware/index.js";
import { adminUploadFieldFiles } from "../../middleware/upload.middleware.js";
import { USER_ROLES } from "../../constants/app.constants.js";
import {
  validateAdminUploadCreate,
  validateAdminUploadUpdate,
  validateObjectIdParam,
  validateUpcomingLockedAction,
  validateUpcomingLockedCreate,
  validateUpcomingLockedUpdate,
} from "../../validators/index.js";

const router = Router();

router.use(requireAuth, requireRole([USER_ROLES.ADMIN]), adminActionRateLimiter);
router.get("/uploads", asyncHandler(adminContentController.listAdminUploads));
router.post(
  "/uploads",
  adminUploadFieldFiles,
  validateAdminUploadCreate,
  asyncHandler(adminContentController.createAdminUpload),
);
router.patch(
  "/uploads/:id",
  adminUploadFieldFiles,
  validateObjectIdParam(),
  validateAdminUploadUpdate,
  asyncHandler(adminContentController.updateAdminUpload),
);
router.delete("/uploads/:id", validateObjectIdParam(), asyncHandler(adminContentController.deleteAdminUpload));
router.get("/upcoming", asyncHandler(adminContentController.listUpcomingItems));
router.post(
  "/upcoming",
  validateUpcomingLockedCreate,
  asyncHandler(adminContentController.createUpcomingItem),
);
router.patch(
  "/upcoming/:id",
  validateObjectIdParam(),
  validateUpcomingLockedUpdate,
  asyncHandler(adminContentController.updateUpcomingItem),
);
router.patch(
  "/upcoming/:id/status",
  validateObjectIdParam(),
  validateUpcomingLockedAction,
  asyncHandler(adminContentController.updateUpcomingStatus),
);

export { router as adminContentRoutes };
