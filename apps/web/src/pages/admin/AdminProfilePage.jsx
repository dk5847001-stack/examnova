import { useEffect } from "react";
import { Link } from "react-router-dom";
import { InfoGridCard } from "../../components/ui/InfoGridCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { useAuth } from "../../hooks/useAuth.js";

const adminControlLinks = [
  { to: "/admin/dashboard", label: "Admin overview", description: "Monitor platform health and core admin metrics." },
  { to: "/admin/users", label: "Users", description: "Manage accounts, access, and user lifecycle issues." },
  { to: "/admin/listings", label: "Listings", description: "Review public marketplace supply and listing status." },
  { to: "/admin/uploads", label: "Admin uploads", description: "Publish admin-owned premium PDFs." },
  { to: "/admin/upcoming", label: "Upcoming locked PDFs", description: "Stage and release upcoming content drops." },
  { to: "/admin/commerce", label: "Purchases & payments", description: "Inspect commerce activity and payment records." },
  { to: "/admin/withdrawals", label: "Withdrawals", description: "Review payout requests and seller cash flow." },
  { to: "/admin/analytics", label: "Analytics", description: "Track demand, revenue, and marketplace growth." },
  { to: "/admin/alerts", label: "Notifications", description: "See operational alerts and system-level updates." },
  { to: "/admin/moderation", label: "Moderation", description: "Handle trust, safety, and review workflows." },
  { to: "/admin/settings", label: "Settings", description: "Manage admin communication and workspace preferences." },
  { to: "/marketplace", label: "Open marketplace", description: "Review the public buying experience directly." },
];

export function AdminProfilePage() {
  const { user, accessToken, refreshProfile } = useAuth();

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [accessToken, refreshProfile]);

  if (!user) {
    return <LoadingCard message="Loading admin profile..." />;
  }

  return (
    <section className="stack-section">
      <PageHero
        eyebrow="Admin profile"
        title="Admin control center"
        description="Keep your admin identity, operational overview, and platform-management shortcuts in one place so the ExamNova AI back office stays clear and easy to run."
        metrics={[
          { label: "Role", value: user.role || "admin" },
          { label: "Status", value: user.status || "active" },
          { label: "Verified", value: user.isEmailVerified ? "Yes" : "Pending" },
        ]}
        actions={
          <>
            <Link className="button primary" to="/marketplace">
              <i className="bi bi-shop" />
              Review marketplace
            </Link>
            <Link className="button secondary" to="/admin/dashboard">
              <i className="bi bi-grid-1x2-fill" />
              Open admin overview
            </Link>
          </>
        }
      />

      <div className="two-column-grid">
        <InfoGridCard
          title="Admin account overview"
          items={[
            { label: "Name", value: user.name || "ExamNova Admin" },
            { label: "Email", value: user.email || "-" },
            { label: "Role", value: user.role || "admin" },
            { label: "Status", value: user.status || "active" },
            { label: "Phone", value: user.phone || "-" },
            { label: "Email verified", value: user.isEmailVerified ? "Yes" : "No" },
          ]}
        />
        <InfoGridCard
          title="Admin identity"
          items={[
            { label: "University", value: user.academicProfile?.university || "-" },
            { label: "Branch", value: user.academicProfile?.branch || "-" },
            { label: "Year", value: user.academicProfile?.year || "-" },
            { label: "Semester", value: user.academicProfile?.semester ? `Semester ${user.academicProfile.semester}` : "-" },
            { label: "Bio", value: user.bio || "Add a short admin bio to personalize the control center." },
            { label: "Avatar URL", value: user.avatarUrl || "-" },
          ]}
        />
      </div>

      <section className="stack-section">
        <SectionHeader
          eyebrow="Operations"
          title="Admin management shortcuts"
          description="Every major admin function is grouped here so platform control lives in one predictable place."
        />
        <div className="shortcut-grid">
          {adminControlLinks.map((item) => (
            <Link className="shortcut-card" key={item.to} to={item.to}>
              <strong>{item.label}</strong>
              <span className="support-copy">{item.description}</span>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
