import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

const navItems = [
  { to: "/marketplace", label: "Marketplace", icon: "bi-shop-window", meta: "Discover and buy PDFs" },
  { to: "/app/upload-generate", label: "Upload & Generate", icon: "bi-cloud-arrow-up-fill", meta: "Source intake" },
  { to: "/app/generated-pdfs", label: "Generated PDFs", icon: "bi-file-earmark-pdf-fill", meta: "Rendered outputs" },
  { to: "/app/purchased-pdfs", label: "Purchased PDFs", icon: "bi-bag-check-fill", meta: "Buyer library" },
  { to: "/app/listed-pdfs", label: "Listed PDFs", icon: "bi-shop", meta: "Seller catalogue" },
  { to: "/app/wallet", label: "Wallet", icon: "bi-wallet2", meta: "Balance and ledger" },
  { to: "/app/withdrawals", label: "Withdrawals", icon: "bi-cash-stack", meta: "Payout requests" },
  { to: "/app/notifications", label: "Notifications", icon: "bi-bell-fill", meta: "Signals and alerts" },
  { to: "/app/profile", label: "Profile", icon: "bi-person-badge-fill", meta: "Identity surface" },
  { to: "/app/settings", label: "Settings", icon: "bi-sliders2-vertical", meta: "Preference control" },
  { to: "/app/payments", label: "Payments", icon: "bi-credit-card-2-front-fill", meta: "Receipt history" },
  { to: "/app/dashboard", label: "Overview", icon: "bi-grid-1x2-fill", meta: "Workspace summary" },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const userInitial = (user?.name || "S").trim().charAt(0).toUpperCase();

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-mark" aria-hidden="true">
              <i className="bi bi-stars" />
            </div>
            <div className="sidebar-brand-copy">
              <span className="layout-kicker">Student Workspace</span>
              <strong className="brand">ExamNova AI</strong>
            </div>
          </div>
          <div className="sidebar-user-card">
            <p className="eyebrow">Active cockpit</p>
            <h2>{user?.name || "Student"}</h2>
            <p className="support-copy">
              {user?.academicProfile?.university || "ExamNova account"} {user?.academicProfile?.semester ? `- Semester ${user.academicProfile.semester}` : ""}
            </p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => (isActive ? "sidebar-link active" : "sidebar-link")}
              to={item.to}
            >
              <span className="sidebar-link-icon" aria-hidden="true">
                <i className={`bi ${item.icon}`} />
              </span>
              <span className="sidebar-link-copy">
                <span>{item.label}</span>
                <small>{item.meta}</small>
              </span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footnote">
            <strong>Exam flow</strong>
            <span>Upload, detect, answer, render, publish.</span>
          </div>
          <button className="button ghost" onClick={logout} type="button">
            <i className="bi bi-box-arrow-left" />
            Logout
          </button>
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-identity">
            <div className="identity-orb">{userInitial}</div>
            <div className="dashboard-topbar-copy">
              <p className="eyebrow">Student AI cockpit</p>
              <h1>{user?.name || "User dashboard"}</h1>
              <p className="support-copy">Start in the marketplace, manage your study assets from profile, and move from upload to selling without losing the plot.</p>
            </div>
          </div>
          <div className="topbar-chip-group">
            <span className="status-chip"><i className="bi bi-patch-check-fill" />{user?.isEmailVerified ? "Email verified" : "Verification pending"}</span>
            <span className="status-chip muted"><i className="bi bi-person-fill" />{user?.role || "student"}</span>
          </div>
        </header>
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
