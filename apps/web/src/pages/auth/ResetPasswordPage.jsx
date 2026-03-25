import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: searchParams.get("email") || "",
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({
        email: form.email,
        otp: form.otp,
        password: form.password,
      });
      setSuccess("Password reset successful. Please log in.");
      window.setTimeout(() => navigate("/login"), 1000);
    } catch (requestError) {
      setError(requestError.message || "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>Reset Password</h2>
      <p className="support-copy">Use the emailed OTP and set a new password for your account.</p>
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
        <span>Reset OTP</span>
        <input
          className="input"
          type="text"
          value={form.otp}
          onChange={(event) => setForm((current) => ({ ...current, otp: event.target.value }))}
          placeholder="6-digit code"
          required
        />
      </label>
      <label className="field">
        <span>New password</span>
        <input
          className="input"
          type="password"
          value={form.password}
          minLength={8}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="At least 8 characters"
          required
        />
      </label>
      <label className="field">
        <span>Confirm password</span>
        <input
          className="input"
          type="password"
          value={form.confirmPassword}
          minLength={8}
          onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
          placeholder="Re-enter your password"
          required
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}
      <button className="button primary full-width" disabled={isSubmitting} type="submit">
        <i className="bi bi-key-fill" />
        {isSubmitting ? "Resetting..." : "Reset password"}
      </button>
      <p className="text-link-row">
        <Link to="/forgot-password">Request a new OTP</Link>
        <Link to="/login">Back to login</Link>
      </p>
    </form>
  );
}
