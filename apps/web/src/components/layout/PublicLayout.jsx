import { Link, Outlet } from "react-router-dom";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { useAuth } from "../../hooks/useAuth.js";

export function PublicLayout() {
  const { isAuthenticated, role } = useAuth();

  return (
    <div className="site-shell public-shell">
      <SeoHead title="ExamNova AI" description="AI-powered exam preparation platform and PDF marketplace." />
      <header className="topbar">
        <div className="topbar-brand-wrap">
          <div className="brand-mark" aria-hidden="true">
            <i className="bi bi-stars" />
          </div>
          <div className="topbar-brand-cluster">
            <span className="layout-kicker">Futuristic Exam Intelligence</span>
            <Link to="/" className="brand">
              ExamNova AI
            </Link>
            <p className="brand-subcopy">
              Buy, upload, generate, and sell premium study PDFs from one AI-powered marketplace platform.
            </p>
          </div>
        </div>
        <nav className="nav-links nav nav-pills">
          <Link className="nav-link-pill" to="/"><i className="bi bi-house-door" />Home</Link>
          <Link className="nav-link-pill" to="/marketplace"><i className="bi bi-grid-1x2" />Marketplace</Link>
          <Link className="nav-link-pill" to="/upcoming"><i className="bi bi-hourglass-split" />Upcoming</Link>
          <Link className="nav-link-pill" to="/resources"><i className="bi bi-journal-richtext" />Resources</Link>
          <Link className="nav-link-pill" to="/faq"><i className="bi bi-patch-question" />FAQ</Link>
          {isAuthenticated ? (
            <Link className="nav-link-pill nav-cta" to={role === "admin" ? "/admin/profile" : "/app/profile"}>
              <i className="bi bi-person-badge" />
              {role === "admin" ? "Admin center" : "My account"}
            </Link>
          ) : (
            <Link className="nav-link-pill nav-cta" to="/login">
              <i className="bi bi-box-arrow-in-right" />
              Login
            </Link>
          )}
        </nav>
      </header>
      <main className="page-shell">
        <Outlet />
      </main>
      <footer className="footer-bar">
        <div className="footer-grid">
          <section className="footer-block">
            <h3>ExamNova AI</h3>
            <p className="support-copy">
              A cinematic AI workspace for exam prep, premium PDFs, marketplace commerce, and release discovery.
            </p>
            <div className="footer-stat-row">
              <span className="footer-stat"><i className="bi bi-cpu" />AI workflow</span>
              <span className="footer-stat"><i className="bi bi-file-earmark-pdf" />Compact render</span>
              <span className="footer-stat"><i className="bi bi-shop" />Marketplace ready</span>
            </div>
          </section>
          <section className="footer-block">
            <h4>Explore</h4>
            <div className="footer-links">
              <Link className="footer-link-pill" to="/marketplace">Marketplace</Link>
              <Link className="footer-link-pill" to="/resources">Resources</Link>
              <Link className="footer-link-pill" to="/upcoming">Upcoming</Link>
              <Link className="footer-link-pill" to="/faq">FAQ</Link>
            </div>
          </section>
          <section className="footer-block">
            <h4>Platform Focus</h4>
            <p className="support-copy">
              Built for serious students who want sharper workflows, stronger visual feedback, and exam-ready output.
            </p>
          </section>
        </div>
      </footer>
    </div>
  );
}
