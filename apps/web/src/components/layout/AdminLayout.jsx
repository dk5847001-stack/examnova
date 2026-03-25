import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

const adminNavItems = [
  { to: "/admin/dashboard", label: "Overview", icon: "bi-grid-1x2-fill", meta: "Platform summary" },
  { to: "/admin/analytics", label: "Analytics", icon: "bi-bar-chart-fill", meta: "Growth intelligence" },
  { to: "/admin/moderation", label: "Moderation", icon: "bi-shield-exclamation", meta: "Risk review" },
  { to: "/admin/alerts", label: "Alerts", icon: "bi-broadcast-pin", meta: "Operational pulse" },
  { to: "/admin/audit-logs", label: "Audit logs", icon: "bi-clock-history", meta: "Action history" },
  { to: "/admin/uploads", label: "Admin uploads", icon: "bi-cloud-upload-fill", meta: "Owned inventory" },
  { to: "/admin/upcoming", label: "Upcoming locked", icon: "bi-hourglass-split", meta: "Release queue" },
  { to: "/admin/users", label: "Users", icon: "bi-people-fill", meta: "Account control" },
  { to: "/admin/listings", label: "Listings", icon: "bi-shop-window", meta: "Marketplace oversight" },
  { to: "/admin/commerce", label: "Commerce", icon: "bi-credit-card-2-front-fill", meta: "Payments and purchases" },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: "bi-cash-coin", meta: "Payout review" },
];

export function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="dashboard-shell admin-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-mark" aria-hidden="true">
              <i className="bi bi-cpu-fill" />
            </div>
            <div className="sidebar-brand-copy">
              <span className="layout-kicker">Admin Control</span>
              <strong className="brand">Operations Center</strong>
            </div>
          </div>
          <div className="sidebar-user-card">
            <p className="eyebrow">Ops posture</p>
            <h2>Admin Console</h2>
            <p className="support-copy">
              Users, listings, commerce, payout review, and release intelligence live here.
            </p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {adminNavItems.map((item) => (
            <NavLink className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`} key={item.to} to={item.to}>
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
            <strong>Ops posture</strong>
            <span>Content, risk, finance, and user health in one console.</span>
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
            <div className="identity-orb">A</div>
            <div className="dashboard-topbar-copy">
              <p className="eyebrow">Admin AI command</p>
              <h1>Operational intelligence</h1>
              <p className="support-copy">Monitor growth, content, finance, risk, and release systems from one premium control surface.</p>
            </div>
          </div>
          <div className="topbar-chip-group">
            <span className="status-chip"><i className="bi bi-activity" />Ops live</span>
            <span className="status-chip muted"><i className="bi bi-shield-lock-fill" />Admin</span>
          </div>
        </header>
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
