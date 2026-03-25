import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <div className="auth-showcase">
          <div className="auth-copy-panel">
            <p className="eyebrow">Secure access</p>
            <h1>Secure access for next-generation exam prep.</h1>
            <p className="support-copy">
              Move from signup to verified access with a premium identity flow, then land directly in the marketplace or the page you were trying to reach.
            </p>
          </div>
          <div className="auth-feature-list">
            <article className="auth-feature-item">
              <div className="auth-feature-icon" aria-hidden="true">
                <i className="bi bi-shield-lock" />
              </div>
              <div>
                <strong>Protected entry</strong>
                <p className="support-copy">OTP-backed onboarding keeps document workflows, payments, and dashboards secure.</p>
              </div>
            </article>
            <article className="auth-feature-item">
              <div className="auth-feature-icon" aria-hidden="true">
                <i className="bi bi-stars" />
              </div>
              <div>
                <strong>Immersive AI workspace</strong>
                <p className="support-copy">The same premium system carries from auth into marketplace discovery, uploads, generation, wallet, and admin control.</p>
              </div>
            </article>
            <article className="auth-feature-item">
              <div className="auth-feature-icon" aria-hidden="true">
                <i className="bi bi-graph-up-arrow" />
              </div>
              <div>
                <strong>Ready for growth</strong>
                <p className="support-copy">Students, sellers, and admins all land inside a polished AI SaaS experience.</p>
              </div>
            </article>
          </div>
          <div className="auth-trust-grid">
            <article className="auth-mini-stat">
              <i className="bi bi-file-earmark-richtext" aria-hidden="true" />
              <div>
                <strong>Upload to Answer</strong>
                <span className="support-copy">One connected pipeline.</span>
              </div>
            </article>
            <article className="auth-mini-stat">
              <i className="bi bi-wallet2" aria-hidden="true" />
              <div>
                <strong>Commerce Ready</strong>
                <span className="support-copy">Seller and payout workflows.</span>
              </div>
            </article>
          </div>
        </div>
        <div className="auth-form-shell d-grid">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
