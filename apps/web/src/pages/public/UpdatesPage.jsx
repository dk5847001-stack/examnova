import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { fetchPlatformUpdates } from "../../services/api/index.js";
import { buildBreadcrumbSchema, buildCollectionSchema, buildSeoPayload } from "../../utils/seo.js";
import { getFrontendUpdates } from "../../features/updates/frontendUpdates.js";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatUpdateDate(value) {
  if (!value) {
    return "Recent";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Recent";
  }

  return dateFormatter.format(parsedDate);
}

function UpdateTimelineSection({ emptyDescription, eyebrow, items, title }) {
  if (!items.length) {
    return (
      <EmptyStateCard
        title={`No ${title.toLowerCase()} yet`}
        description={emptyDescription}
      />
    );
  }

  return (
    <section className="stack-section">
      <div className="section-header">
        <div className="section-header-copy">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="support-copy">
            Latest shipped notes stay sorted by publish time so the freshest changes surface first.
          </p>
        </div>
      </div>

      <div className="updates-timeline-grid">
        {items.map((item) => (
          <article className="detail-card updates-timeline-card" key={item.id}>
            <div className="updates-timeline-card-top">
              <span className="updates-timeline-status">{item.status}</span>
              <span className="updates-timeline-date">{formatUpdateDate(item.publishedAt)}</span>
            </div>

            <div className="updates-timeline-copy">
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
            </div>

            {item.tags?.length ? (
              <div className="updates-timeline-tags">
                {item.tags.map((tag) => (
                  <span key={`${item.id}-${tag}`}>{tag}</span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function UpdatesPage() {
  const frontendUpdates = useMemo(() => getFrontendUpdates(), []);
  const [backendUpdates, setBackendUpdates] = useState([]);
  const [isLoadingBackendUpdates, setIsLoadingBackendUpdates] = useState(true);
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBackendUpdates() {
      setIsLoadingBackendUpdates(true);
      setBackendError("");

      try {
        const response = await fetchPlatformUpdates();
        if (active) {
          setBackendUpdates(response.data.items || []);
        }
      } catch (error) {
        if (active) {
          setBackendError(error.message || "Unable to load backend updates.");
          setBackendUpdates([]);
        }
      } finally {
        if (active) {
          setIsLoadingBackendUpdates(false);
        }
      }
    }

    loadBackendUpdates();

    return () => {
      active = false;
    };
  }, []);

  const latestFrontendDate = frontendUpdates[0]?.publishedAt || "";
  const latestBackendDate = backendUpdates[0]?.publishedAt || "";

  const seoPayload = buildSeoPayload({
    title: "Platform Updates",
    description: "Track shipped frontend and backend improvements across ExamNova AI in one public updates stream.",
    pathname: "/updates",
    jsonLd: [
      buildCollectionSchema({
        title: "Platform Updates",
        description: "Public timeline of shipped frontend and backend improvements across ExamNova AI.",
        pathname: "/updates",
      }),
      buildBreadcrumbSchema([
        { label: "Home", href: "/" },
        { label: "Platform Updates", href: "/updates" },
      ]),
    ],
  });

  return (
    <>
      <SeoHead {...seoPayload} />

      <section className="stack-section updates-page-shell">
        <article className="detail-card updates-hero-card">
          <div className="updates-hero-copy">
            <p className="eyebrow">Shipping log</p>
            <h1>Product and platform updates now have one visible trail.</h1>
            <p className="support-copy">
              This page combines frontend polish notes and backend shipping updates so the public product can surface what changed without digging through commits.
            </p>
          </div>

          <div className="updates-hero-metrics">
            <div className="updates-metric-card">
              <span>Frontend notes</span>
              <strong>{frontendUpdates.length}</strong>
              <small>Latest {formatUpdateDate(latestFrontendDate)}</small>
            </div>
            <div className="updates-metric-card">
              <span>Backend notes</span>
              <strong>{backendUpdates.length}</strong>
              <small>Latest {formatUpdateDate(latestBackendDate)}</small>
            </div>
          </div>

          <div className="hero-actions">
            <Link className="button primary" to="/marketplace">
              <i className="bi bi-grid-1x2-fill" />
              Browse marketplace
            </Link>
            <a className="button secondary" href="#frontend-updates">
              <i className="bi bi-window-sidebar" />
              Frontend timeline
            </a>
            <a className="button ghost" href="#backend-updates">
              <i className="bi bi-hdd-network" />
              Backend timeline
            </a>
          </div>
        </article>

        <section className="updates-summary-grid">
          <article className="detail-card updates-summary-card">
            <p className="eyebrow">Frontend surface</p>
            <h2>UI notes ship from local content files</h2>
            <p className="support-copy">
              Vite loads JSON entries directly, so each new frontend mini update can land without editing page logic again.
            </p>
          </article>
          <article className="detail-card updates-summary-card">
            <p className="eyebrow">Backend surface</p>
            <h2>API notes ship from the public endpoint</h2>
            <p className="support-copy">
              The backend reads update files from disk and exposes them over a dedicated public route for the timeline view.
            </p>
          </article>
        </section>

        <div className="updates-columns">
          <div className="stack-section" id="frontend-updates">
            <UpdateTimelineSection
              emptyDescription="Frontend mini updates will appear here as soon as they are added."
              eyebrow="Frontend timeline"
              items={frontendUpdates}
              title="Interface and UX updates"
            />
          </div>

          <div className="stack-section" id="backend-updates">
            {backendError ? <p className="form-error">{backendError}</p> : null}
            {isLoadingBackendUpdates ? (
              <LoadingCard message="Loading backend updates..." />
            ) : (
              <UpdateTimelineSection
                emptyDescription="Backend mini updates will appear here as soon as they are added."
                eyebrow="Backend timeline"
                items={backendUpdates}
                title="API and content updates"
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
