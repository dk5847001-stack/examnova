import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export function VerifyOtpPage() {
  const { verifyOtp, resendOtp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: location.state?.email || searchParams.get("email") || "",
    otp: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await verifyOtp(form);
      setSuccess("Email verified successfully.");
      navigate(response.data.user.role === "admin" ? "/admin/dashboard" : "/app/dashboard", {
        replace: true,
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to verify OTP.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError("");
    setSuccess("");
    setIsResending(true);

    try {
      await resendOtp({
        email: form.email,
        purpose: "email_verification",
      });
      setSuccess("A new OTP has been sent to your email.");
      setCountdown(60);
    } catch (requestError) {
      setError(requestError.message || "Unable to resend OTP.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>Verify OTP</h2>
      <p className="support-copy">Enter the OTP sent to your email to activate your account.</p>
      <label className="field">
        <span>Email</span>
        <input
          className="input"
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="you@example.com"
          required
        />
      </label>
      <label className="field">
        <span>OTP</span>
        <input
          className="input"
          type="text"
          value={form.otp}
          onChange={(event) => setForm((current) => ({ ...current, otp: event.target.value }))}
          placeholder="6-digit code"
          required
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}
      <button className="button primary full-width" disabled={isSubmitting} type="submit">
        <i className="bi bi-shield-check" />
        {isSubmitting ? "Verifying..." : "Verify email"}
      </button>
      <div className="inline-actions">
        <button className="button secondary" disabled={isResending || countdown > 0} onClick={handleResend} type="button">
          <i className="bi bi-arrow-repeat" />
          {countdown > 0 ? `Resend in ${countdown}s` : isResending ? "Sending..." : "Resend OTP"}
        </button>
        <Link to="/login">Back to login</Link>
      </div>
    </form>
  );
}
