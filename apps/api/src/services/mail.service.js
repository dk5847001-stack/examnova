import { APP_NAME } from "../constants/app.constants.js";
import { createBrevoEmailClient } from "../lib/brevo-email.client.js";

const emailClient = createBrevoEmailClient();

function getOtpEmailCopy(purpose, expiresInMinutes) {
  const isPasswordReset = purpose === "password_reset";

  return {
    subject: isPasswordReset
      ? `${APP_NAME} password reset verification code`
      : `Verify your ${APP_NAME} email`,
    heading: isPasswordReset ? "Reset your password" : "Verify your email",
    actionText: isPasswordReset
      ? "Use the OTP below to complete your password reset."
      : "Use the OTP below to verify your email address.",
    expiryText: `This OTP expires in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}.`,
  };
}

function buildOtpEmailTemplate({ name, otp, heading, actionText, expiryText }) {
  const recipientName = name?.trim() || "there";

  return `
    <div style="margin:0;background:#f5f8fb;padding:32px 16px;font-family:Segoe UI,Arial,sans-serif;color:#10212b">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e8eef5">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:1.8px;text-transform:uppercase;color:#b35a1f">${APP_NAME}</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2">${heading}</h1>
        <p style="margin:0 0 12px;font-size:16px">Hello ${recipientName},</p>
        <p style="margin:0 0 20px;font-size:16px;line-height:1.6">${actionText}</p>
        <div style="margin:0 0 20px;padding:18px 20px;border-radius:16px;background:#fff6ef;border:1px solid #f3d7bf;text-align:center">
          <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#9b5120;margin-bottom:8px">One-time password</div>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#10212b">${otp}</div>
        </div>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6">${expiryText}</p>
        <p style="margin:0;font-size:15px;line-height:1.6">If you did not request this email, you can safely ignore it.</p>
      </div>
    </div>
  `;
}

export const mailService = {
  async sendOtpVerificationEmail({ email, name, otp, purpose, expiresInMinutes }) {
    const { subject, heading, actionText, expiryText } = getOtpEmailCopy(purpose, expiresInMinutes);

    return emailClient.send({
      to: {
        email,
        ...(name ? { name } : {}),
      },
      subject,
      text: `${APP_NAME}\n${heading}\n${actionText}\nOTP: ${otp}\n${expiryText}`,
      html: buildOtpEmailTemplate({
        name,
        otp,
        heading,
        actionText,
        expiryText,
      }),
    });
  },
};
