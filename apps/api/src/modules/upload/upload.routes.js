import { Router } from "express";
import { uploadController } from "./upload.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth, requireProfessionalMode } from "../../middleware/auth.middleware.js";
import { singleDocumentUpload, uploadRateLimiter } from "../../middleware/index.js";
import { validateObjectIdParam, validateUploadRequest } from "../../validators/index.js";

const router = Router();

router.get("/", requireAuth, requireProfessionalMode, asyncHandler(uploadController.listUploads));
router.get("/:id", requireAuth, requireProfessionalMode, validateObjectIdParam(), asyncHandler(uploadController.getUpload));
router.post(
  "/",
  requireAuth,
  requireProfessionalMode,
  uploadRateLimiter,
  singleDocumentUpload,
  validateUploadRequest,
  asyncHandler(uploadController.createUpload),
);
router.post(
  "/:id/retry-parsing",
  requireAuth,
  requireProfessionalMode,
  uploadRateLimiter,
  validateObjectIdParam(),
  asyncHandler(uploadController.retryParsing),
);
router.delete(
  "/:id",
  requireAuth,
  requireProfessionalMode,
  validateObjectIdParam(),
  asyncHandler(uploadController.archiveUpload),
);

export { router as uploadRoutes };
