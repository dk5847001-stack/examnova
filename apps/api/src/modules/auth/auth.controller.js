import { env } from "../../config/index.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { authService } from "./auth.service.js";
import { getRefreshCookieOptions } from "./auth.utils.js";

export const authController = {
  async signup(req, res) {
    const result = await authService.signup(req.body);
    return sendSuccess(
      res,
      {
        user: result.user,
        nextStep: "verify_email_otp",
        otpExpiresAt: result.otpExpiresAt,
      },
      "Signup successful. Please verify the OTP sent to your email.",
      201,
    );
  },
  async verifyOtp(req, res) {
    const result = await authService.verifyEmailOtp(req.body, req);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.cookie(env.refreshTokenCookieName, result.refreshToken, getRefreshCookieOptions());

    return sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      "Email verified successfully.",
    );
  },
  async resendOtp(req, res) {
    const purpose = req.body?.purpose || "email_verification";
    const result = await authService.resendOtp({ email: req.body.email, purpose });
    return sendSuccess(
      res,
      {
        email: result.email,
        otpExpiresAt: result.otpExpiresAt,
      },
      "A new OTP has been sent.",
    );
  },
  async login(req, res) {
    const result = await authService.login(req.body, req);
    res.cookie(env.refreshTokenCookieName, result.refreshToken, getRefreshCookieOptions());

    return sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      "Login successful.",
    );
  },
  async forgotPassword(req, res) {
    const result = await authService.forgotPassword(req.body);
    return sendSuccess(
      res,
      {
        email: result.email,
      },
      "If the account exists, a password reset OTP has been sent.",
    );
  },
  async resetPassword(req, res) {
    const result = await authService.resetPassword(req.body);
    return sendSuccess(
      res,
      {
        user: result.user,
      },
      "Password reset successful. Please log in with your new password.",
    );
  },
  async refresh(req, res) {
    const refreshToken = req.cookies?.[env.refreshTokenCookieName];
    const result = await authService.refreshSession(refreshToken, req);
    res.cookie(env.refreshTokenCookieName, result.refreshToken, getRefreshCookieOptions());

    return sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      "Session refreshed successfully.",
    );
  },
  async logout(req, res) {
    const refreshToken = req.cookies?.[env.refreshTokenCookieName];
    await authService.logout(refreshToken);
    res.clearCookie(env.refreshTokenCookieName, getRefreshCookieOptions());

    return sendSuccess(res, {}, "Logout successful.");
  },
};
