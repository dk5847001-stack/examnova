import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = Boolean(email.trim());

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim();
      await forgotPassword({ email: normalizedEmail });
      navigate(`/reset-password?email=${encodeURIComponent(normalizedEmail)}`, {
        state: {
          email: normalizedEmail,
          purpose: "password_reset",
        },
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to process your request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>Forgot Password</h2>
      <p className="support-copy">Request a password reset OTP and continue to the reset form.</p>
      <label className="field">
        <span>Email</span>
        <input
          autoCapitalize="none"
          autoComplete="email"
          className="input"
          maxLength={254}
          spellCheck="false"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button primary full-width" disabled={isSubmitting || !canSubmit} type="submit">
        <i className="bi bi-envelope-arrow-up" />
        {isSubmitting ? "Sending..." : "Send reset OTP"}
      </button>
    </form>
  );
}
