import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { StatCard } from "../../components/ui/StatCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import {
  hasDeveloperAccess,
  MODE_LABELS,
  normalizeModeAccess,
} from "../../utils/modes.js";

export function UserDashboardPage() {
  const { user, accessToken, dashboardSummary, fetchDashboardSummary } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const modeAccess = normalizeModeAccess(user);
  const developerActive = hasDeveloperAccess(modeAccess);

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
        eyebrow="Account overview"
        title={`A clear view of your ExamNova account, ${user?.name || "Student"}`}
        description={`This overview reflects ${MODE_LABELS[modeAccess.currentMode].toLowerCase()} so zero-knowledge users see the right next steps first instead of a cluttered dashboard.`}
        metrics={[
          { label: "Mode", value: MODE_LABELS[modeAccess.currentMode] },
          { label: "Completion", value: `${dashboardSummary?.overview?.profileCompletionPercent ?? 0}%` },
          { label: "Wallet", value: `Rs ${dashboardSummary?.wallet?.availableBalance ?? 0}` },
          { label: "Unread", value: `${dashboardSummary?.counters?.unreadNotifications ?? 0}` },
        ]}
        actions={
          <>
            <Link className="button primary" to="/app/profile">
              <i className="bi bi-person-badge-fill" />
              Open control center
            </Link>
            {developerActive ? (
              <Link className="button secondary" to="/app/listed-pdfs">
                <i className="bi bi-shop" />
                Open seller workspace
              </Link>
            ) : (
              <Link className="button secondary" to="/app/upload-generate">
                <i className="bi bi-cloud-arrow-up" />
                Open AI workflow
              </Link>
            )}
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
            title="What changed recently"
            description="Notifications and important account events are summarized here so you know what needs attention first."
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
            eyebrow="Next steps"
            title="Open the right area quickly"
            description="These shortcuts map directly to the profile-centered structure, so buying, generating, and account control stay easy to understand."
          />
          <div className="shortcut-grid">
            <Link className="shortcut-card" to="/app/profile">Open control center</Link>
            <Link className="shortcut-card" to="/app/upload-generate">Generate a PDF</Link>
            <Link className="shortcut-card" to="/app/generated-pdfs">View generated PDFs</Link>
            <Link className="shortcut-card" to={developerActive ? "/app/listed-pdfs" : "/app/settings#mode-access"}>
              {developerActive ? "Manage listed PDFs" : "Compare account modes"}
            </Link>
          </div>
        </section>
      </div>

      <div className="three-column-grid">
        <EmptyStateCard
          title="Generated PDFs"
          description={dashboardSummary?.sections?.generatedPdfs?.emptyMessage || "Generated PDFs will appear here after you run the AI workflow."}
          action={<Link className="button secondary" to="/app/generated-pdfs">Open generated PDFs</Link>}
        />
        <EmptyStateCard
          title="Purchased PDFs"
          description={dashboardSummary?.sections?.purchasedPdfs?.emptyMessage || "Purchased PDFs from the marketplace will appear here."}
          action={<Link className="button secondary" to="/app/purchased-pdfs">Open purchased PDFs</Link>}
        />
        <EmptyStateCard
          title="Listed PDFs"
          description={
            developerActive
              ? dashboardSummary?.sections?.listedPdfs?.emptyMessage || "Listed PDFs will appear here."
              : "Developer Mode keeps seller listings hidden until you unlock and switch into that mode."
          }
          action={
            <Link className="button secondary" to={developerActive ? "/app/listed-pdfs" : "/app/settings#mode-access"}>
              {developerActive ? "Open listed PDFs" : "Open mode settings"}
            </Link>
          }
        />
      </div>
    </section>
  );
}
