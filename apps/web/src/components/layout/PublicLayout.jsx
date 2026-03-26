import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { ThemeToggleButton } from "../ui/ThemeToggleButton.jsx";

export function PublicLayout() {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isPdfDetailPage = location.pathname.startsWith("/pdf/");
  const isMarketplacePage = location.pathname === "/" || location.pathname === "/marketplace";
  const isWidePublicPage = isMarketplacePage || isPdfDetailPage;
  const workspaceHref = isAuthenticated ? (role === "admin" ? "/admin/profile" : "/app/profile") : "/login";
  const workspaceLabel = isAuthenticated ? (role === "admin" ? "Admin center" : "My account") : "Login";
  const buyerSteps = [
    "Open a PDF card",
    "Enter your full name",
    "Pay and download securely",
  ];

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div
      className={`site-shell public-shell${isWidePublicPage ? " public-shell-wide" : ""}${isPdfDetailPage ? " public-shell-detail" : ""}`}
    >
      <SeoHead title="ExamNova AI" description="AI-powered exam preparation platform and PDF marketplace." />
      <header className="topbar public-navbar bootstrap-public-navbar">
        <div className="container-fluid px-0">
          <div className="bootstrap-nav-shell">
            <div className="bootstrap-nav-top">
              <div className="d-flex flex-wrap align-items-center gap-3 gap-lg-4 flex-grow-1 min-w-0">
                <Link
                  to="/marketplace"
                  className="bootstrap-brand d-inline-flex align-items-center gap-3 text-decoration-none min-w-0"
                >
                  <span className="bootstrap-brand-badge" aria-hidden="true">
                    <i className="bi bi-file-earmark-pdf-fill" />
                  </span>
                  <span className="d-grid min-w-0">
                    <span className="bootstrap-kicker">ExamNova marketplace</span>
                    <span className="bootstrap-brand-title">Download Notes & PDFs</span>
                  </span>
                </Link>
                <div className="bootstrap-nav-summary d-none d-lg-flex">
                  <i className="bi bi-shield-check" />
                  <span>Simple PDF buying experience for students.</span>
                </div>
              </div>
              <button
                aria-controls="public-navigation"
                aria-expanded={isMobileNavOpen}
                aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
                className="navbar-toggler bootstrap-nav-toggler"
                onClick={() => setIsMobileNavOpen((current) => !current)}
                type="button"
              >
                <span className="navbar-toggler-icon" />
              </button>
            </div>
            <nav
              aria-label="Public navigation"
              className={`bootstrap-nav-menu${isMobileNavOpen ? " open" : ""}`}
              id="public-navigation"
            >
              <Link className="btn btn-outline-primary bootstrap-nav-button" to="/marketplace">
                <i className="bi bi-grid-1x2-fill" />
                Marketplace
              </Link>
              <a className="btn btn-outline-secondary bootstrap-nav-button" href="#buyer-flow">
                <i className="bi bi-lightning-charge" />
                How it works
              </a>
              <ThemeToggleButton compact className="bootstrap-theme-toggle" />
              <Link className="btn btn-primary bootstrap-nav-cta" to={workspaceHref}>
                <i className={`bi ${isAuthenticated ? "bi-person-circle" : "bi-box-arrow-in-right"}`} />
                {workspaceLabel}
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className={`page-shell${isWidePublicPage ? " page-shell-wide" : ""}${isPdfDetailPage ? " page-shell-detail" : ""}`}>
        <Outlet />
      </main>
      <footer className="footer-bar public-footer bootstrap-public-footer" id="buyer-flow">
        <div className="container-fluid px-0">
          <div className="bootstrap-footer-card">
            <div className="row g-3 g-xl-4">
              <div className="col-12 col-lg-5">
                <div className="bootstrap-footer-panel bootstrap-footer-brand-panel h-100">
                  <div className="d-inline-flex align-items-center gap-3 mb-3">
                    <span className="bootstrap-brand-badge bootstrap-brand-badge-sm" aria-hidden="true">
                      <i className="bi bi-journal-richtext" />
                    </span>
                    <div className="d-grid">
                      <span className="bootstrap-kicker">Trusted student notes</span>
                      <h3 className="mb-0">ExamNova AI PDF Marketplace</h3>
                    </div>
                  </div>
                  <p className="mb-0">
                    Browse academic PDFs, open one clean detail page, add your full name, and complete a secure
                    download flow without extra clutter.
                  </p>
                  <div className="bootstrap-footer-trust">
                    <span className="bootstrap-footer-chip">
                      <i className="bi bi-patch-check-fill" />
                      Simple checkout
                    </span>
                    <span className="bootstrap-footer-chip">
                      <i className="bi bi-clock-history" />
                      Scheduled releases
                    </span>
                    <span className="bootstrap-footer-chip">
                      <i className="bi bi-file-lock2" />
                      Secure access
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-6 col-lg-2">
                <div className="bootstrap-footer-panel h-100">
                  <span className="bootstrap-kicker">Explore</span>
                  <div className="bootstrap-footer-links">
                    <Link to="/marketplace">Marketplace</Link>
                    <Link to={workspaceHref}>{workspaceLabel}</Link>
                    <a href="#buyer-flow">Buyer flow</a>
                  </div>
                </div>
              </div>
              <div className="col-6 col-lg-2">
                <div className="bootstrap-footer-panel h-100">
                  <span className="bootstrap-kicker">Purchase flow</span>
                  <ol className="bootstrap-footer-steps">
                    {buyerSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="col-12 col-lg-3">
                <div className="bootstrap-footer-panel bootstrap-footer-cta-panel h-100">
                  <span className="bootstrap-kicker">Ready to start</span>
                  <h4>Open the marketplace and pick a PDF.</h4>
                  <p className="mb-0">The public website is intentionally focused on one simple task: buying PDFs.</p>
                  <div className="bootstrap-footer-actions">
                    <Link className="btn btn-primary bootstrap-footer-button" to="/marketplace">
                      <i className="bi bi-search" />
                      Browse PDFs
                    </Link>
                    <Link className="btn btn-outline-primary bootstrap-footer-button" to={workspaceHref}>
                      <i className={`bi ${isAuthenticated ? "bi-person-circle" : "bi-box-arrow-in-right"}`} />
                      {workspaceLabel}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="bootstrap-footer-bottom">
              <p className="mb-0">ExamNova AI keeps the public website focused on fast PDF discovery and secure downloads.</p>
              <div className="bootstrap-footer-bottom-actions">
                <ThemeToggleButton compact className="bootstrap-theme-toggle" />
                <span className="bootstrap-footer-note">
                  <i className="bi bi-lock-fill" />
                  Secure buyer flow
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
