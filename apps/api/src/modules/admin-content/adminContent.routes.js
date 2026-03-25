import { Router } from "express";
import { adminContentController } from "./adminContent.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { adminActionRateLimiter } from "../../middleware/index.js";
import { singleAdminPdfUpload } from "../../middleware/upload.middleware.js";
import { USER_ROLES } from "../../constants/app.constants.js";
import {
  validateAdminUploadCreate,
  validateAdminUploadUpdate,
  validateUpcomingLockedAction,
  validateUpcomingLockedCreate,
  validateUpcomingLockedUpdate,
} from "../../validators/index.js";

const router = Router();

router.use(requireAuth, requireRole([USER_ROLES.ADMIN]), adminActionRateLimiter);
router.get("/uploads", asyncHandler(adminContentController.listAdminUploads));
router.post(
  "/uploads",
  singleAdminPdfUpload,
  validateAdminUploadCreate,
  asyncHandler(adminContentController.createAdminUpload),
);
router.patch(
  "/uploads/:id",
  singleAdminPdfUpload,
  validateAdminUploadUpdate,
  asyncHandler(adminContentController.updateAdminUpload),
);
router.get("/upcoming", asyncHandler(adminContentController.listUpcomingItems));
router.post(
  "/upcoming",
  validateUpcomingLockedCreate,
  asyncHandler(adminContentController.createUpcomingItem),
);
router.patch(
  "/upcoming/:id",
  validateUpcomingLockedUpdate,
  asyncHandler(adminContentController.updateUpcomingItem),
);
router.patch(
  "/upcoming/:id/status",
  validateUpcomingLockedAction,
  asyncHandler(adminContentController.updateUpcomingStatus),
);

export { router as adminContentRoutes };
