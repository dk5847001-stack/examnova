import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
      };
      await signup(payload);
      setSuccess("Account created. We sent an OTP to your email.");
      navigate(`/verify-otp?email=${encodeURIComponent(payload.email)}`, {
        state: {
          email: payload.email,
          purpose: "email_verification",
          from: location.state?.from || null,
        },
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>Signup</h2>
      <p className="support-copy">Create your account, verify your email, and land directly in the marketplace so you can buy, upload, or sell without confusion.</p>
      <label className="field">
        <span>Full name</span>
        <input
          autoComplete="name"
          className="input"
          type="text"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Your name"
          required
        />
      </label>
      <label className="field">
        <span>Email</span>
        <input
          autoCapitalize="none"
          autoComplete="email"
          className="input"
          spellCheck="false"
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="you@example.com"
          required
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          autoComplete="new-password"
          className="input"
          type="password"
          value={form.password}
          minLength={8}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="At least 8 characters"
          required
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}
      <button className="button primary full-width" disabled={isSubmitting} type="submit">
        <i className="bi bi-person-plus-fill" />
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
      <p className="text-link-row">
        <Link to="/verify-otp">Verify OTP</Link>
        <Link to="/login">Already have an account?</Link>
      </p>
    </form>
  );
}
