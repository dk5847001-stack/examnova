import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { StatCard } from "../../components/ui/StatCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { useAuth } from "../../hooks/useAuth.js";

export function UserDashboardPage() {
  const { user, accessToken, dashboardSummary, fetchDashboardSummary } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      setIsLoading(true);
      setError("");

      try {
        await fetchDashboardSummary();
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(requestError.message || "Unable to load dashboard summary.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      active = false;
    };
  }, [accessToken]);

  if (isLoading && !dashboardSummary) {
    return <LoadingCard message="Loading your dashboard..." />;
  }

  return (
    <section className="stack-section">
      <PageHero
        eyebrow="Dashboard"
        title={`Welcome, ${user?.name || "Student"}`}
        description="This overview is designed to become the command center for uploads, generated PDFs, marketplace activity, wallet movement, and notifications."
        metrics={[
          { label: "Completion", value: `${dashboardSummary?.overview?.profileCompletionPercent ?? 0}%` },
          { label: "Wallet", value: `Rs ${dashboardSummary?.wallet?.availableBalance ?? 0}` },
          { label: "Unread", value: `${dashboardSummary?.counters?.unreadNotifications ?? 0}` },
        ]}
        actions={
          <>
            <Link className="button primary" to="/app/upload-generate">
              <i className="bi bi-cloud-arrow-up" />
              Upload document
            </Link>
            <Link className="button secondary" to="/marketplace">
              <i className="bi bi-shop" />
              Explore marketplace
            </Link>
          </>
        }
      />

      {error ? <p className="form-error">{error}</p> : null}

      <section className="card-grid">
        <StatCard label="Profile completion" value={`${dashboardSummary?.overview?.profileCompletionPercent ?? 0}%`} />
        <StatCard label="Generated PDFs" value={dashboardSummary?.counters?.generatedPdfs ?? 0} />
        <StatCard label="Purchased PDFs" value={dashboardSummary?.counters?.purchasedPdfs ?? 0} />
        <StatCard label="Listed PDFs" value={dashboardSummary?.counters?.listedPdfs ?? 0} />
        <StatCard label="Wallet balance" value={`Rs ${dashboardSummary?.wallet?.availableBalance ?? 0}`} />
        <StatCard label="Unread notifications" value={dashboardSummary?.counters?.unreadNotifications ?? 0} />
      </section>

      <div className="two-column-grid">
        <section className="detail-card">
          <SectionHeader
            eyebrow="Latest activity"
            title="Recent account activity"
            description="Notifications and key account events are summarized here."
          />
          {dashboardSummary?.latestActivity?.length ? (
            <div className="activity-list">
              {dashboardSummary.latestActivity.map((item) => (
                <article className="activity-item" key={item.id}>
                  <strong>{item.title}</strong>
                  <span className="support-copy">
                    {item.type} - {new Date(item.createdAt).toLocaleString()}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyStateCard
              title="No recent activity"
              description="As your uploads, purchases, and notifications grow, the latest items will appear here."
            />
          )}
        </section>

        <section className="detail-card">
          <SectionHeader
            eyebrow="Shortcuts"
            title="Quick actions"
            description="Jump into the most important account areas from one place."
          />
          <div className="shortcut-grid">
            <Link className="shortcut-card" to="/app/upload-generate">Generate PDF</Link>
            <Link className="shortcut-card" to="/app/generated-pdfs">View generated PDFs</Link>
            <Link className="shortcut-card" to="/app/wallet">Open wallet</Link>
            <Link className="shortcut-card" to="/app/profile">Edit profile</Link>
          </div>
        </section>
      </div>

      <div className="three-column-grid">
        <EmptyStateCard
          title="Generated PDFs"
          description={dashboardSummary?.sections?.generatedPdfs?.emptyMessage || "Generated PDFs will appear here."}
          action={<Link className="button secondary" to="/app/generated-pdfs">Open section</Link>}
        />
        <EmptyStateCard
          title="Purchased PDFs"
          description={dashboardSummary?.sections?.purchasedPdfs?.emptyMessage || "Purchased PDFs will appear here."}
          action={<Link className="button secondary" to="/app/purchased-pdfs">Open section</Link>}
        />
        <EmptyStateCard
          title="Listed PDFs"
          description={dashboardSummary?.sections?.listedPdfs?.emptyMessage || "Listed PDFs will appear here."}
          action={<Link className="button secondary" to="/app/listed-pdfs">Open section</Link>}
        />
      </div>
    </section>
  );
}
