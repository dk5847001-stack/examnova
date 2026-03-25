import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { InternalLinkGrid } from "../../components/ui/InternalLinkGrid.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { MarketplaceListingCard } from "../../components/ui/MarketplaceListingCard.jsx";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { UpcomingLockedCard } from "../../components/ui/UpcomingLockedCard.jsx";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { fetchSeoLandingPage } from "../../services/api/index.js";
import {
  buildBreadcrumbSchema,
  buildCollectionSchema,
  buildFaqSchema,
  buildSeoPayload,
} from "../../utils/seo.js";

export function SeoLandingPage({ forcedType = "" }) {
  const params = useParams();
  const slug = params.slug;
  const type = forcedType || params.type;
  const [state, setState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const pathname = useMemo(() => (type && slug ? `/${type}/${slug}` : "/"), [slug, type]);

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetchSeoLandingPage(type, slug);
        if (active) {
          setState(response.data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load public landing page.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (type && slug) {
      loadPage();
    }

    return () => {
      active = false;
    };
  }, [slug, type]);

  const seoPayload = state
    ? buildSeoPayload({
        title: state.meta?.title || state.heading,
        description: state.meta?.description || state.intro,
        pathname,
        jsonLd: [
          buildCollectionSchema({
            title: state.meta?.title || state.heading,
            description: state.meta?.description || state.intro,
            pathname,
          }),
          buildBreadcrumbSchema(state.breadcrumbs || []),
          buildFaqSchema(state.faqItems || []),
        ],
      })
    : null;

  return (
    <>
      {seoPayload ? <SeoHead {...seoPayload} /> : null}
      {isLoading ? (
        <LoadingCard message="Loading SEO landing page..." />
      ) : error ? (
        <EmptyStateCard title="Landing page unavailable" description={error} />
      ) : (
        <>
          <PageHero
            eyebrow={`${state.type} discovery`}
            title={state.heading}
            description={state.intro}
            metrics={[
              { label: "Listings", value: `${state.stats?.listingCount || 0}` },
              { label: "Upcoming", value: `${state.stats?.upcomingCount || 0}` },
              { label: "Focus", value: state.label },
            ]}
            actions={
              <>
                <Link className="button secondary" to="/marketplace">
                  <i className="bi bi-grid-1x2" />
                  Browse marketplace
                </Link>
                <Link className="button ghost" to="/upcoming">
                  <i className="bi bi-hourglass-split" />
                  Explore upcoming PDFs
                </Link>
              </>
            }
          />

          <section className="two-column-grid">
            <article className="detail-card">
              <h3>Why this page matters</h3>
              <p className="support-copy">
                This page groups public exam PDFs, internal links, and upcoming content around {state.label}, making it easier for students and search engines to discover focused preparation resources.
              </p>
              <div className="info-grid">
                <div><span className="info-label">Published PDFs</span><strong>{state.stats?.listingCount || 0}</strong></div>
                <div><span className="info-label">Upcoming locked PDFs</span><strong>{state.stats?.upcomingCount || 0}</strong></div>
              </div>
            </article>
            <article className="detail-card">
              <h3>FAQ</h3>
              <div className="activity-list">
                {(state.faqItems || []).map((item) => (
                  <article className="activity-item" key={item.question}>
                    <strong>{item.question}</strong>
                    <span className="support-copy">{item.answer}</span>
                  </article>
                ))}
              </div>
            </article>
          </section>

          <section className="stack-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Featured results</p>
                <h2>Best matching public PDFs</h2>
              </div>
            </div>
            {state.featuredListings?.length ? (
              <div className="marketplace-grid">
                {state.featuredListings.map((listing) => (
                  <MarketplaceListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <EmptyStateCard
                title="No public PDFs yet"
                description="As more relevant PDFs are published for this collection, they will appear here."
              />
            )}
          </section>

          {state.upcomingLocked?.length ? (
            <section className="stack-section">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Upcoming content</p>
                  <h2>Locked PDFs tied to this collection</h2>
                </div>
              </div>
              <div className="marketplace-grid">
                {state.upcomingLocked.map((item) => (
                  <UpcomingLockedCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="three-column-grid">
            <InternalLinkGrid links={state.relatedLinks?.universities} title="Universities" />
            <InternalLinkGrid links={state.relatedLinks?.branches} title="Branches" />
            <InternalLinkGrid links={state.relatedLinks?.semesters} title="Semesters" />
            <InternalLinkGrid links={state.relatedLinks?.subjects} title="Subjects" />
            <InternalLinkGrid
              links={state.relatedLinks?.examPreparation ? [state.relatedLinks.examPreparation] : []}
              title="Exam Preparation"
            />
            <InternalLinkGrid
              links={state.relatedLinks?.importantQuestions ? [state.relatedLinks.importantQuestions] : []}
              title="Important Questions"
            />
          </section>
        </>
      )}
    </>
  );
}
