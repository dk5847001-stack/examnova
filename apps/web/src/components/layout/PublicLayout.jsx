import { Link, Outlet } from "react-router-dom";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { useAuth } from "../../hooks/useAuth.js";

export function PublicLayout() {
  const { isAuthenticated, role } = useAuth();
  const workspaceHref = isAuthenticated ? (role === "admin" ? "/admin/profile" : "/app/profile") : "/login";
  const workspaceLabel = isAuthenticated ? (role === "admin" ? "Admin center" : "My account") : "Login";

  return (
    <div className="site-shell public-shell">
      <SeoHead title="ExamNova AI" description="AI-powered exam preparation platform and PDF marketplace." />
      <header className="topbar public-navbar simple-public-navbar">
        <div className="topbar-brand-wrap">
          <div className="brand-mark" aria-hidden="true">
            <i className="bi bi-file-earmark-pdf-fill" />
          </div>
          <div className="topbar-brand-cluster">
            <span className="layout-kicker">Simple PDF Store</span>
            <Link to="/" className="brand">
              ExamNova AI
            </Link>
            <p className="brand-subcopy">
              Browse notes, open a PDF, and purchase securely. The public website stays focused on PDF buying only.
            </p>
          </div>
        </div>
        <nav className="simple-public-nav">
          <Link className="nav-link-pill public-nav-link active" to="/marketplace">
            <i className="bi bi-grid-1x2-fill" />
            PDF Marketplace
          </Link>
          <Link className="nav-link-pill nav-cta" to={workspaceHref}>
            <i className={`bi ${isAuthenticated ? "bi-person-circle" : "bi-box-arrow-in-right"}`} />
            {workspaceLabel}
          </Link>
        </nav>
      </header>
      <main className="page-shell">
        <Outlet />
      </main>
      <footer className="footer-bar public-footer simple-public-footer">
        <div className="simple-footer-grid">
          <div className="footer-block">
            <h3>ExamNova AI</h3>
            <p className="support-copy">A simple public notes marketplace focused on browsing and purchasing PDFs.</p>
          </div>
          <div className="footer-block">
            <h4>Quick links</h4>
            <div className="footer-links">
              <Link className="footer-link-pill" to="/marketplace">Marketplace</Link>
              <Link className="footer-link-pill" to={workspaceHref}>{workspaceLabel}</Link>
            </div>
          </div>
          <div className="footer-block">
            <h4>Purchase flow</h4>
            <p className="support-copy">Open any PDF card, review details, complete payment, and download securely.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
