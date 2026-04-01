import { Router } from "express";
import { authController } from "./auth.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authRateLimiter, requireTrustedOrigin } from "../../middleware/index.js";
import {
  validateForgotPassword,
  validateLogin,
  validateResendOtp,
  validateResetPassword,
  validateSignup,
  validateVerifyOtp,
} from "../../validators/index.js";

const router = Router();

router.post("/signup", authRateLimiter, validateSignup, asyncHandler(authController.signup));
router.post(
  "/verify-email-otp",
  authRateLimiter,
  requireTrustedOrigin,
  validateVerifyOtp,
  asyncHandler(authController.verifyOtp),
);
router.post("/resend-otp", authRateLimiter, validateResendOtp, asyncHandler(authController.resendOtp));
router.post("/login", authRateLimiter, requireTrustedOrigin, validateLogin, asyncHandler(authController.login));
router.post("/forgot-password", authRateLimiter, validateForgotPassword, asyncHandler(authController.forgotPassword));
router.post("/reset-password", authRateLimiter, validateResetPassword, asyncHandler(authController.resetPassword));
router.post("/refresh", authRateLimiter, requireTrustedOrigin, asyncHandler(authController.refresh));
router.post("/logout", authRateLimiter, requireTrustedOrigin, asyncHandler(authController.logout));

export { router as authRoutes };
