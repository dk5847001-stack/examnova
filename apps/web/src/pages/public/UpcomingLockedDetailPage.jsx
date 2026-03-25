import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { fetchUpcomingLockedPdfDetail } from "../../services/api/index.js";
import { buildPageTitle } from "../../utils/seo.js";

export function UpcomingLockedDetailPage() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadItem() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetchUpcomingLockedPdfDetail(slug);
        if (active) {
          setItem(response.data.item);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load upcoming locked PDF.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (slug) {
      loadItem();
    }

    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <>
      <SeoHead
        title={buildPageTitle(item?.title || "Upcoming Locked PDF")}
        description={item?.summary || "Preview upcoming locked exam PDF content before release."}
      />
      {isLoading ? (
        <LoadingCard message="Loading upcoming locked PDF..." />
      ) : error ? (
        <EmptyStateCard title="Upcoming PDF unavailable" description={error} />
      ) : (
        <>
          <PageHero
            eyebrow="Locked release"
            title={item?.title || "Upcoming PDF"}
            description={item?.summary || "This premium exam PDF is visible now and will unlock later for full marketplace availability."}
            metrics={[
              { label: "Status", value: item?.status || "upcoming" },
              { label: "Semester", value: item?.taxonomy?.semester || "TBA" },
              { label: "Release", value: item?.expectedReleaseAt ? new Date(item.expectedReleaseAt).toLocaleDateString() : "Soon" },
            ]}
            actions={
              <>
                <Link className="button secondary" to="/upcoming"><i className="bi bi-hourglass-split" />Browse upcoming PDFs</Link>
                <Link className="button ghost" to="/marketplace"><i className="bi bi-shop" />Go to marketplace</Link>
              </>
            }
          />
          <section className="two-column-grid">
            <article className="detail-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Academic categorization</p>
                  <h2>Built for semester-targeted exam prep</h2>
                </div>
              </div>
              <div className="info-grid">
                <div><span className="info-label">University</span><strong>{item?.taxonomy?.university}</strong></div>
                <div><span className="info-label">Branch</span><strong>{item?.taxonomy?.branch}</strong></div>
                <div><span className="info-label">Year</span><strong>{item?.taxonomy?.year}</strong></div>
                <div><span className="info-label">Semester</span><strong>{item?.taxonomy?.semester}</strong></div>
                <div><span className="info-label">Subject</span><strong>{item?.taxonomy?.subject}</strong></div>
                <div><span className="info-label">Status</span><strong>{item?.status}</strong></div>
              </div>
            </article>
            <article className="detail-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Release posture</p>
                  <h2>Locked until admin release</h2>
                </div>
              </div>
              <p className="support-copy">
                This entry is visible for discovery, semester planning, and exam-prep anticipation. It is not purchasable or downloadable until the admin unlocks it.
              </p>
              <div className="document-meta-row">
                <span>{item?.expectedReleaseAt ? `Expected ${new Date(item.expectedReleaseAt).toLocaleDateString()}` : "Release date to be announced"}</span>
                <span>{item?.adminName || "ExamNova Admin"}</span>
              </div>
            </article>
          </section>
        </>
      )}
    </>
  );
}
