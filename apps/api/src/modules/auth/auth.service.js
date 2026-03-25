import { ApiError } from "../../utils/ApiError.js";
import { addMinutes } from "../../utils/dateTime.js";
import { comparePassword, generateOtp, hashOtp, hashPassword, hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/index.js";
import { OtpVerification, Session, User } from "../../models/index.js";
import { env } from "../../config/index.js";
import { mailService } from "../../services/mail.service.js";
import { sanitizeUser } from "./auth.utils.js";

const OTP_PURPOSES = {
  EMAIL_VERIFICATION: "email_verification",
  PASSWORD_RESET: "password_reset",
};
const LOGIN_LOCK_THRESHOLD = 8;
const LOGIN_LOCK_WINDOW_MS = 15 * 60 * 1000;

function getSessionContext(req) {
  return {
    deviceInfo: req.headers["sec-ch-ua-platform"] || "unknown",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] || "unknown",
  };
}

async function createOtpRecord({ user, purpose, currentOtpRecord = null }) {
  const otp = generateOtp();
  const now = new Date();
  const expiresInMinutes =
    purpose === OTP_PURPOSES.PASSWORD_RESET ? env.resetPasswordTtlMinutes : env.otpTtlMinutes;
  const expiresAt = addMinutes(now, expiresInMinutes);

  const otpDocument =
    currentOtpRecord ||
    new OtpVerification({
      userId: user._id,
      email: user.email,
      purpose,
    });

  otpDocument.otpHash = hashOtp(otp);
  otpDocument.expiresAt = expiresAt;
  otpDocument.attemptCount = 0;
  otpDocument.lastSentAt = now;
  otpDocument.status = "pending";
  otpDocument.verifiedAt = undefined;
  otpDocument.resendCount = currentOtpRecord ? (currentOtpRecord.resendCount || 0) + 1 : 0;

  await otpDocument.save();

  await mailService.sendOtpVerificationEmail({
    email: user.email,
    name: user.name,
    otp,
    purpose,
    expiresInMinutes,
  });

  user.authMeta = {
    ...(user.authMeta || {}),
    lastOtpSentAt: now,
  };
  await user.save();

  return {
    expiresAt,
  };
}

async function issueSessionTokens(user, req, existingSession = null) {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    type: "refresh",
  });

  const hashedToken = hashToken(refreshToken);
  const decodedRefresh = verifyRefreshToken(refreshToken);
  const sessionContext = getSessionContext(req);

  const session =
    existingSession ||
    new Session({
      userId: user._id,
    });

  session.tokenHash = hashedToken;
  session.deviceInfo = sessionContext.deviceInfo;
  session.ipAddress = sessionContext.ipAddress;
  session.userAgent = sessionContext.userAgent;
  session.expiresAt = new Date(decodedRefresh.exp * 1000);
  session.isRevoked = false;
  session.revokedAt = undefined;

  await session.save();

  return {
    accessToken,
    refreshToken,
    session,
  };
}

async function getValidOtpRecord(email, purpose) {
  const record = await OtpVerification.findOne({
    email: email.toLowerCase(),
    purpose,
    status: "pending",
  }).sort({ createdAt: -1 });

  if (!record) {
    throw new ApiError(400, "No active OTP request found for this email.");
  }

  if (record.expiresAt.getTime() < Date.now()) {
    record.status = "expired";
    await record.save();
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }

  if (record.attemptCount >= env.otpMaxAttempts) {
    record.status = "locked";
    await record.save();
    throw new ApiError(429, "Too many incorrect OTP attempts. Please request a new OTP.");
  }

  return record;
}

export const authService = {
  async signup({ name, email, password }) {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser && existingUser.isEmailVerified) {
      throw new ApiError(409, "An account with this email already exists.");
    }

    if (existingUser?.isBlocked || existingUser?.status === "blocked" || existingUser?.status === "suspended") {
      throw new ApiError(403, "This account is blocked. Please contact support.");
    }

    const passwordHash = await hashPassword(password);
    const user =
      existingUser ||
      new User({
        name: name.trim(),
        email: normalizedEmail,
      });

    user.name = name.trim();
    user.passwordHash = passwordHash;
    user.isEmailVerified = false;
    user.isBlocked = false;
    user.status = "pending_verification";

    await user.save();

    await OtpVerification.updateMany(
      { email: normalizedEmail, purpose: OTP_PURPOSES.EMAIL_VERIFICATION, status: "pending" },
      { status: "superseded" },
    );

    const otpMeta = await createOtpRecord({
      user,
      purpose: OTP_PURPOSES.EMAIL_VERIFICATION,
    });

    return {
      user: sanitizeUser(user),
      otpExpiresAt: otpMeta.expiresAt,
    };
  },

  async verifyEmailOtp({ email, otp }, req) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new ApiError(404, "No account found for this email.");
    }

    if (user.isBlocked || user.status === "blocked" || user.status === "suspended") {
      throw new ApiError(403, "Your account is blocked. Please contact support.");
    }

    if (user.isEmailVerified) {
      const tokens = await issueSessionTokens(user, req);
      return {
        user: sanitizeUser(user),
        ...tokens,
        alreadyVerified: true,
      };
    }

    const record = await getValidOtpRecord(normalizedEmail, OTP_PURPOSES.EMAIL_VERIFICATION);

    record.attemptCount += 1;

    if (record.otpHash !== hashOtp(otp)) {
      await record.save();
      throw new ApiError(400, "Incorrect OTP. Please try again.");
    }

    record.status = "verified";
    record.verifiedAt = new Date();
    await record.save();

    user.isEmailVerified = true;
    user.status = "active";
    user.authMeta = {
      ...(user.authMeta || {}),
      emailVerifiedAt: new Date(),
    };
    await user.save();

    const tokens = await issueSessionTokens(user, req);

    return {
      user: sanitizeUser(user),
      ...tokens,
      alreadyVerified: false,
    };
  },

  async resendOtp({ email, purpose = OTP_PURPOSES.EMAIL_VERIFICATION }) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new ApiError(404, "No account found for this email.");
    }

    if (user.isBlocked || user.status === "blocked" || user.status === "suspended") {
      throw new ApiError(403, "Your account is blocked. Please contact support.");
    }

    if (purpose === OTP_PURPOSES.EMAIL_VERIFICATION && user.isEmailVerified) {
      throw new ApiError(400, "Email is already verified.");
    }

    const existing = await OtpVerification.findOne({
      email: normalizedEmail,
      purpose,
      status: "pending",
    }).sort({ createdAt: -1 });

    if (existing?.lastSentAt) {
      const secondsSinceLastSend = Math.floor((Date.now() - existing.lastSentAt.getTime()) / 1000);
      if (secondsSinceLastSend < env.otpResendCooldownSeconds) {
        throw new ApiError(429, `Please wait ${env.otpResendCooldownSeconds - secondsSinceLastSend}s before requesting another OTP.`);
      }
    }

    const otpMeta = await createOtpRecord({
      user,
      purpose,
      currentOtpRecord: existing || null,
    });

    return {
      email: user.email,
      otpExpiresAt: otpMeta.expiresAt,
    };
  },

  async login({ email, password }, req) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new ApiError(401, "Invalid email or password.");
    }

    if (user.isBlocked || user.status === "blocked" || user.status === "suspended") {
      throw new ApiError(403, "Your account is blocked. Please contact support.");
    }

    if (user.authMeta?.loginLockedUntil && new Date(user.authMeta.loginLockedUntil).getTime() > Date.now()) {
      throw new ApiError(429, "Too many failed login attempts. Please wait before trying again.");
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      const failedLoginCount = (user.authMeta?.failedLoginCount || 0) + 1;
      const lockUntil = failedLoginCount >= LOGIN_LOCK_THRESHOLD
        ? new Date(Date.now() + LOGIN_LOCK_WINDOW_MS)
        : undefined;
      user.authMeta = {
        ...(user.authMeta || {}),
        failedLoginCount,
        lastFailedLoginAt: new Date(),
        loginLockedUntil: lockUntil,
      };
      await user.save();
      throw new ApiError(401, "Invalid email or password.");
    }

    if (!user.isEmailVerified) {
      throw new ApiError(403, "Please verify your email before logging in.");
    }

    user.lastLoginAt = new Date();
    user.authMeta = {
      ...(user.authMeta || {}),
      failedLoginCount: 0,
      lastFailedLoginAt: undefined,
      loginLockedUntil: undefined,
    };
    await user.save();

    const tokens = await issueSessionTokens(user, req);

    return {
      user: sanitizeUser(user),
      ...tokens,
    };
  },

  async refreshSession(refreshToken, req) {
    if (!refreshToken) {
      throw new ApiError(401, "Refresh token is required.");
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (_error) {
      throw new ApiError(401, "Invalid refresh token.");
    }

    const existingSession = await Session.findOne({
      userId: decoded.sub,
      tokenHash: hashToken(refreshToken),
      isRevoked: false,
    });

    if (!existingSession) {
      throw new ApiError(401, "Session not found or already revoked.");
    }

    if (existingSession.expiresAt.getTime() < Date.now()) {
      existingSession.isRevoked = true;
      existingSession.revokedAt = new Date();
      await existingSession.save();
      throw new ApiError(401, "Session expired. Please log in again.");
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw new ApiError(401, "User not found.");
    }

    if (user.isBlocked || user.status === "blocked" || user.status === "suspended") {
      existingSession.isRevoked = true;
      existingSession.revokedAt = new Date();
      await existingSession.save();
      throw new ApiError(403, "Your account is blocked.");
    }

    existingSession.isRevoked = true;
    existingSession.revokedAt = new Date();
    await existingSession.save();

    const tokens = await issueSessionTokens(user, req);
    existingSession.replacedByTokenId = tokens.session._id;
    await existingSession.save();

    return {
      user: sanitizeUser(user),
      ...tokens,
    };
  },

  async logout(refreshToken) {
    if (!refreshToken) {
      return;
    }

    await Session.findOneAndUpdate(
      { tokenHash: hashToken(refreshToken), isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );
  },

  async forgotPassword({ email }) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return {
        email: normalizedEmail,
      };
    }

    if (user.isBlocked || user.status === "blocked" || user.status === "suspended") {
      throw new ApiError(403, "Your account is blocked. Please contact support.");
    }

    await OtpVerification.updateMany(
      { email: normalizedEmail, purpose: OTP_PURPOSES.PASSWORD_RESET, status: "pending" },
      { status: "superseded" },
    );

    const otpMeta = await createOtpRecord({
      user,
      purpose: OTP_PURPOSES.PASSWORD_RESET,
    });

    return {
      email: user.email,
      otpExpiresAt: otpMeta.expiresAt,
    };
  },

  async resetPassword({ email, otp, password }) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new ApiError(404, "No account found for this email.");
    }

    if (user.isBlocked || user.status === "blocked" || user.status === "suspended") {
      throw new ApiError(403, "Your account is blocked. Please contact support.");
    }

    const record = await getValidOtpRecord(normalizedEmail, OTP_PURPOSES.PASSWORD_RESET);
    record.attemptCount += 1;

    if (record.otpHash !== hashOtp(otp)) {
      await record.save();
      throw new ApiError(400, "Incorrect OTP. Please try again.");
    }

    user.passwordHash = await hashPassword(password);
    user.authMeta = {
      ...(user.authMeta || {}),
      passwordChangedAt: new Date(),
      failedLoginCount: 0,
      lastFailedLoginAt: undefined,
      loginLockedUntil: undefined,
    };
    await user.save();

    record.status = "verified";
    record.verifiedAt = new Date();
    await record.save();

    await Session.updateMany(
      { userId: user._id, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    return {
      user: sanitizeUser(user),
    };
  },
};
