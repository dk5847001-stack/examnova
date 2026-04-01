import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = Boolean(form.email.trim() && form.password);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({
        ...form,
        email: form.email.trim(),
      });
      const redirectTarget = location.state?.from
        ? `${location.state.from.pathname || ""}${location.state.from.search || ""}${location.state.from.hash || ""}`
        : "/marketplace";
      navigate(redirectTarget, {
        replace: true,
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to login.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>Login</h2>
      <p className="support-copy">Login with your verified email and continue to the marketplace, your library, or the page you were trying to open.</p>
      <label className="field">
        <span>Email</span>
        <input
          autoCapitalize="none"
          autoComplete="username"
          className="input"
          maxLength={254}
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
          autoComplete="current-password"
          className="input"
          maxLength={128}
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="Enter your password"
          required
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button primary full-width" disabled={isSubmitting || !canSubmit} type="submit">
        <i className="bi bi-box-arrow-in-right" />
        {isSubmitting ? "Logging in..." : "Login"}
      </button>
      <p className="text-link-row">
        <Link to="/forgot-password">Forgot password</Link>
        <Link to="/signup">Create account</Link>
      </p>
    </form>
  );
}
