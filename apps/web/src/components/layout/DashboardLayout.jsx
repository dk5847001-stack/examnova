import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import {
  hasDeveloperAccess,
  MODE_LABELS,
  normalizeModeAccess,
} from "../../utils/modes.js";

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const userInitial = (user?.name || "S").trim().charAt(0).toUpperCase();
  const modeAccess = normalizeModeAccess(user);
  const developerActive = hasDeveloperAccess(modeAccess);
  const navSections = [
    {
      title: "Start here",
      items: [
        { to: "/marketplace", label: "Marketplace", icon: "bi-shop-window", meta: "Discover and buy PDFs" },
        { to: "/app/profile", label: "Control center", icon: "bi-person-badge-fill", meta: "Profile, mode, and shortcuts" },
        { to: "/app/dashboard", label: "Account overview", icon: "bi-grid-1x2-fill", meta: "Activity and workspace summary" },
      ],
    },
    {
      title: "Study workspace",
      items: [
        { to: "/app/upload-generate", label: "Generate PDFs", icon: "bi-cloud-arrow-up-fill", meta: "Upload, detect, generate" },
        { to: "/app/generated-pdfs", label: "Generated PDFs", icon: "bi-file-earmark-pdf-fill", meta: "AI output library" },
        { to: "/app/purchased-pdfs", label: "Purchased PDFs", icon: "bi-bag-check-fill", meta: "Buyer library" },
      ],
    },
    ...(developerActive
      ? [
        {
          title: "Seller workspace",
          items: [
            { to: "/app/listed-pdfs", label: "Listed PDFs", icon: "bi-shop", meta: "Public seller catalogue" },
            { to: "/app/wallet", label: "Wallet", icon: "bi-wallet2", meta: "Balance and earnings ledger" },
            { to: "/app/withdrawals", label: "Withdrawals", icon: "bi-cash-stack", meta: "Payout requests" },
          ],
        },
      ]
      : []),
    {
      title: "Account tools",
      items: [
        { to: "/app/notifications", label: "Notifications", icon: "bi-bell-fill", meta: "Signals and updates" },
        { to: "/app/settings", label: "Settings", icon: "bi-sliders2-vertical", meta: "Mode and preference control" },
        { to: "/app/payments", label: "Payment history", icon: "bi-credit-card-2-front-fill", meta: "Receipts and payment records" },
      ],
    },
  ];

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-mark" aria-hidden="true">
              <i className="bi bi-stars" />
            </div>
            <div className="sidebar-brand-copy">
              <span className="layout-kicker">{developerActive ? "Developer Workspace" : "Professional Workspace"}</span>
              <strong className="brand">ExamNova AI</strong>
            </div>
          </div>
          <div className="sidebar-user-card">
            <p className="eyebrow">Control center</p>
            <h2>{user?.name || "Student"}</h2>
            <p className="support-copy">
              {MODE_LABELS[modeAccess.currentMode]} {user?.academicProfile?.semester ? `- Semester ${user.academicProfile.semester}` : ""}
            </p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div className="sidebar-nav-group" key={section.title}>
              <p className="sidebar-section-label">{section.title}</p>
              {section.items.map((item) => (
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
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footnote">
            <strong>{developerActive ? "Developer workspace" : "Professional workspace"}</strong>
            <span>{developerActive ? "Create, publish, sell, and manage payouts." : "Create PDFs, manage your library, and control your account."}</span>
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
              <p className="eyebrow">Profile-centered workspace</p>
              <h1>{user?.name || "User control center"}</h1>
              <p className="support-copy">
                Start in the marketplace, then manage buying, generation, selling, notifications, and settings from a clearer account structure built around your current mode.
              </p>
            </div>
          </div>
          <div className="topbar-chip-group">
            <span className="status-chip"><i className="bi bi-patch-check-fill" />{user?.isEmailVerified ? "Email verified" : "Verification pending"}</span>
            <span className="status-chip"><i className="bi bi-stars" />{MODE_LABELS[modeAccess.currentMode]}</span>
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
