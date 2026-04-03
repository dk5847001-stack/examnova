import { Router } from "express";
import { publicController } from "./public.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/media", asyncHandler(publicController.getMedia));
router.get("/platform-updates", asyncHandler(publicController.listPlatformUpdates));
router.get("/universities", asyncHandler(publicController.getUniversityLanding));
router.get("/subjects", asyncHandler(publicController.getSubjectLanding));
router.get("/upcoming-pdfs", asyncHandler(publicController.listUpcomingLockedPdfs));
router.get("/upcoming-pdfs/:slug", asyncHandler(publicController.getUpcomingLockedPdfDetail));

export { router as publicRoutes };
