import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { notificationController } from "./notification.controller.js";
import { validateObjectIdParam } from "../../validators/index.js";

const router = Router();

router.use(requireAuth);
router.get("/", asyncHandler(notificationController.listNotifications));
router.patch("/read-all", asyncHandler(notificationController.markAllNotificationsRead));
router.patch("/:id/read", validateObjectIdParam(), asyncHandler(notificationController.markNotificationRead));

export { router as notificationRoutes };
