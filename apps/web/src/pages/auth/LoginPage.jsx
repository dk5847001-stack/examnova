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

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await login(form);
      const role = response.data.user.role;
      const redirectTo = location.state?.from?.pathname;
      navigate(redirectTo || (role === "admin" ? "/admin/dashboard" : "/app/dashboard"), {
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
      <p className="support-copy">Login with your verified email and continue to your dashboard.</p>
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
        <span>Password</span>
        <input
          className="input"
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="Enter your password"
          required
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="button primary full-width" disabled={isSubmitting} type="submit">
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
