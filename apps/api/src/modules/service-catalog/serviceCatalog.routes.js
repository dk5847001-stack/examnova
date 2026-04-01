import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { serviceCatalogController } from "./serviceCatalog.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { adminActionRateLimiter } from "../../middleware/index.js";
import { USER_ROLES } from "../../constants/app.constants.js";
import { serviceListingFieldFiles } from "../../middleware/upload.middleware.js";
import {
  validateServiceListingCreate,
  validateServiceListingUpdate,
  validateObjectIdParam,
} from "../../validators/index.js";

const router = Router();

router.get("/public", asyncHandler(serviceCatalogController.listPublicServices));
router.get("/public/:slug", asyncHandler(serviceCatalogController.getPublicServiceDetail));

router.use("/admin", requireAuth, requireRole([USER_ROLES.ADMIN]), adminActionRateLimiter);
router.get("/admin", asyncHandler(serviceCatalogController.listAdminServices));
router.post(
  "/admin",
  serviceListingFieldFiles,
  validateServiceListingCreate,
  asyncHandler(serviceCatalogController.createAdminService),
);
router.patch(
  "/admin/:id",
  serviceListingFieldFiles,
  validateObjectIdParam(),
  validateServiceListingUpdate,
  asyncHandler(serviceCatalogController.updateAdminService),
);
router.delete("/admin/:id", validateObjectIdParam(), asyncHandler(serviceCatalogController.deleteAdminService));

export { router as serviceCatalogRoutes };
