import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { fetchAdminDashboard } from "../../services/api/index.js";

export function AdminProfilePage() {
  const { user, accessToken, refreshProfile } = useAuth();
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadControlCenter() {
      setIsLoading(true);
      setError("");

      try {
        const [, dashboardResponse] = await Promise.all([
          refreshProfile(),
          fetchAdminDashboard(accessToken),
        ]);

        if (active) {
          setSummary(dashboardResponse.data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load the admin control center.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (accessToken) {
      loadControlCenter();
    } else {
      setIsLoading(false);
    }

    return () => {
      active = false;
    };
  }, [accessToken, refreshProfile]);

  if (!user || (isLoading && !summary)) {
    return <LoadingCard message="Loading admin control center..." />;
  }

  const metrics = summary?.metrics || {};
  const adminControlGroups = [
    {
      title: "Admin overview",
      description: "Identity, core platform status, notifications, and settings stay in one clear admin home.",
      links: [
        { to: "/admin/dashboard", label: "Overview dashboard", meta: "Platform health and current operating signals", value: `${metrics.totalUsers || 0} users` },
        { to: "/admin/alerts", label: "Notifications", meta: "Operational alerts and system events", value: "Ops inbox" },
        { to: "/admin/settings", label: "Settings", meta: "Communication and admin workspace preferences", value: user.status || "active" },
        { to: "/marketplace", label: "Review marketplace", meta: "Check the public buying experience directly", value: "Public flow" },
      ],
    },
    {
      title: "Users and content",
      description: "User accounts, listings, uploads, upcoming releases, and moderation are grouped together for faster review.",
      links: [
        { to: "/admin/users", label: "Users", meta: "Account access, status, and lifecycle control", value: metrics.totalUsers || 0 },
        { to: "/admin/listings", label: "Listings", meta: "Marketplace inventory and approval visibility", value: metrics.totalMarketplaceListings || 0 },
        { to: "/admin/uploads", label: "Admin uploads", meta: "Publish and manage admin-owned PDFs", value: metrics.totalAdminUploadedPdfs || 0 },
        { to: "/admin/upcoming", label: "Upcoming locked PDFs", meta: "Stage controlled content releases", value: metrics.totalUpcomingLockedPdfs || 0 },
        { to: "/admin/moderation", label: "Moderation", meta: "Trust, safety, and marketplace quality review", value: "Review queue" },
      ],
    },
    {
      title: "Finance and analytics",
      description: "Revenue, payments, withdrawals, reporting, and auditability stay together so finance review feels deliberate and safe.",
      links: [
        { to: "/admin/withdrawals", label: "Withdrawals", meta: "Approve, reject, and mark seller payouts", value: `${metrics.pendingWithdrawalRequests || 0} pending` },
        { to: "/admin/commerce", label: "Purchases and payments", meta: "Order flow and payment record visibility", value: metrics.totalPayments || 0 },
        { to: "/admin/analytics", label: "Analytics", meta: "Growth, demand, and marketplace performance", value: "Insights" },
        { to: "/admin/audit-logs", label: "Audit logs", meta: "Review admin-side action history", value: "Traceable" },
      ],
    },
  ];

  return (
    <section className="stack-section">
      <PageHero
        eyebrow="Admin control center"
        title="Run ExamNova AI from one organized place"
        description="Admin overview, users, listings, uploads, withdrawals, analytics, notifications, and settings are grouped here so the back office feels premium, predictable, and easy for a new operator to understand."
        metrics={[
          { label: "Users", value: metrics.totalUsers || 0 },
          { label: "Listings", value: metrics.totalMarketplaceListings || 0 },
          { label: "Pending withdrawals", value: metrics.pendingWithdrawalRequests || 0 },
          { label: "Admin revenue", value: `Rs. ${metrics.adminRevenue || 0}` },
        ]}
        actions={
          <>
            <Link className="button primary" to="/admin/dashboard">
              <i className="bi bi-grid-1x2-fill" />
              Open admin overview
            </Link>
            <Link className="button secondary" to="/marketplace">
              <i className="bi bi-shop" />
              Review marketplace
            </Link>
          </>
        }
      />

      {error ? <p className="form-error">{error}</p> : null}

      <div className="two-column-grid">
        <article className="detail-card control-hub-card">
          <SectionHeader
            eyebrow="Admin identity"
            title="Account and access overview"
            description="The essential admin identity and permission context stays visible here so account management never feels hidden."
          />
          <div className="info-grid">
            <div><span className="info-label">Name</span><strong>{user.name || "ExamNova Admin"}</strong></div>
            <div><span className="info-label">Email</span><strong>{user.email || "-"}</strong></div>
            <div><span className="info-label">Role</span><strong>{user.role || "admin"}</strong></div>
            <div><span className="info-label">Status</span><strong>{user.status || "active"}</strong></div>
            <div><span className="info-label">Phone</span><strong>{user.phone || "-"}</strong></div>
            <div><span className="info-label">Email verified</span><strong>{user.isEmailVerified ? "Yes" : "No"}</strong></div>
          </div>
          <div className="hero-actions">
            <Link className="button secondary" to="/admin/settings">Open settings</Link>
            <Link className="button ghost" to="/admin/alerts">Open notifications</Link>
          </div>
        </article>

        <article className="detail-card control-hub-card">
          <SectionHeader
            eyebrow="Platform pulse"
            title="What needs admin attention"
            description="A compact snapshot of platform volume and finance exposure helps keep priority decisions near the top."
          />
          <div className="info-grid">
            <div><span className="info-label">Active users</span><strong>{metrics.activeUsers || 0}</strong></div>
            <div><span className="info-label">Generated PDFs</span><strong>{metrics.totalGeneratedPdfs || 0}</strong></div>
            <div><span className="info-label">Purchases</span><strong>{metrics.totalPurchases || 0}</strong></div>
            <div><span className="info-label">Payments</span><strong>{metrics.totalPayments || 0}</strong></div>
            <div><span className="info-label">Pending withdrawals</span><strong>Rs. {metrics.pendingWithdrawalAmount || 0}</strong></div>
            <div><span className="info-label">Seller earnings</span><strong>Rs. {metrics.totalSellerEarnings || 0}</strong></div>
          </div>
          <div className="hero-actions">
            <Link className="button secondary" to="/admin/withdrawals">Review withdrawals</Link>
            <Link className="button ghost" to="/admin/analytics">Open analytics</Link>
          </div>
        </article>
      </div>

      <section className="stack-section">
        <SectionHeader
          eyebrow="Operations map"
          title="Every major admin area, grouped by job"
          description="Each block below collects related controls so admins can understand where to go without scanning a long, flat dashboard."
        />
        <div className="three-column-grid control-hub-grid">
          {adminControlGroups.map((group) => (
            <article className="detail-card control-hub-card" key={group.title}>
              <div className="control-hub-copy">
                <p className="eyebrow">{group.title}</p>
                <h3>{group.title}</h3>
                <p className="support-copy">{group.description}</p>
              </div>
              <div className="control-link-list">
                {group.links.map((item) => (
                  <Link className="control-link-row" key={item.to} to={item.to}>
                    <div>
                      <strong>{item.label}</strong>
                      <span className="support-copy">{item.meta}</span>
                    </div>
                    <span className="control-link-value">{item.value}</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
