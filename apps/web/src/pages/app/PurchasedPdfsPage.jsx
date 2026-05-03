import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CardPlaceholderGrid } from "../../components/ui/CardPlaceholderGrid.jsx";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { getServiceCategoryLabel } from "../../features/marketplace/marketplace.constants.js";
import { useAuth } from "../../hooks/useAuth.js";
import { downloadLibraryItem, fetchLibrary } from "../../services/api/index.js";

function sanitizeFileName(value) {
  return String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function triggerDownload(blob, fileName) {
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}

function buildDownloadName(item, responseFileName) {
  if (responseFileName) {
    return responseFileName;
  }

  const baseName =
    sanitizeFileName(
      item.title || (item.resourceKind === "service" ? "website-package" : "marketplace-pdf"),
    ) || (item.resourceKind === "service" ? "website-package" : "marketplace-pdf");

  return `${baseName}.${item.resourceKind === "service" ? "zip" : "pdf"}`;
}

export function PurchasedPdfsPage() {
  const { accessToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!location.state?.message) {
      return;
    }

    setFeedback(location.state.message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    let active = true;

    async function loadLibrary() {
      setIsLoading(true);

      try {
        const response = await fetchLibrary(accessToken);
        if (active) {
          setItems(response.data.items);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load your purchased library.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (accessToken) {
      loadLibrary();
    }

    return () => {
      active = false;
    };
  }, [accessToken]);

  async function handleDownload(item) {
    try {
      const response = await downloadLibraryItem(accessToken, item.id);
      triggerDownload(response.blob, buildDownloadName(item, response.filename));
    } catch (requestError) {
      setError(
        requestError.message ||
          (item.resourceKind === "service"
            ? "Unable to download purchased website ZIP."
            : "Unable to download purchased PDF."),
      );
    }
  }

  return (
    <section className="stack-section">
      <SectionHeader
        eyebrow="Library"
        title="Purchased library"
        description="Your paid PDFs and website services stay here with re-download access, purchase history, and quick action links."
      />
      {feedback ? <p className="form-success">{feedback}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? (
        <CardPlaceholderGrid
          ariaLabel="Loading purchased library"
          count={6}
          variant="library"
          className="marketplace-grid"
        />
      ) : items.length ? (
        <div className="marketplace-grid">
          {items.map((item) => {
            const isService = item.resourceKind === "service";
            const detailHref = item.slug ? (isService ? `/services/${item.slug}` : `/pdf/${item.slug}`) : "";

            return (
              <article className="marketplace-card service-listing-card" key={item.id}>
                <div className="marketplace-card-header">
                  <div>
                    <p className="eyebrow">
                      {isService
                        ? getServiceCategoryLabel(item.serviceDetails?.category) || "Website service"
                        : item.taxonomy?.subject || "Purchased PDF"}
                    </p>
                    <h3>{item.title}</h3>
                    <p className="support-copy">
                      Bought on {new Date(item.purchasedAt).toLocaleDateString()} - Seller: {item.sellerName}
                    </p>
                  </div>
                  <div className="topbar-chip-group">
                    <span className="status-chip">Rs. {item.amountInr}</span>
                    <span className="status-chip muted">
                      {isService ? "Website access" : item.buyerAccessState}
                    </span>
                  </div>
                </div>

                <div className="marketplace-taxonomy">
                  {isService ? (
                    <>
                      {(item.serviceDetails?.techStack || []).map((tech) => (
                        <span key={`${item.id}-${tech}`}>{tech}</span>
                      ))}
                      {item.serviceDetails?.shortDescription ? (
                        <span>{item.serviceDetails.shortDescription}</span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {item.taxonomy?.university ? <span>{item.taxonomy.university}</span> : null}
                      {item.taxonomy?.branch ? <span>{item.taxonomy.branch}</span> : null}
                      {item.taxonomy?.semester ? <span>Semester {item.taxonomy.semester}</span> : null}
                      {item.taxonomy?.subject ? <span>{item.taxonomy.subject}</span> : null}
                      {item.studyMetadata?.examFocus ? <span>{item.studyMetadata.examFocus}</span> : null}
                    </>
                  )}
                </div>

                <div className="hero-actions">
                  {detailHref ? (
                    <Link className="button secondary" to={detailHref}>
                      <i className="bi bi-window-stack" />
                      View details
                    </Link>
                  ) : null}
                  {isService && item.serviceDetails?.demoUrl ? (
                    <a className="button ghost" href={item.serviceDetails.demoUrl} rel="noreferrer" target="_blank">
                      <i className="bi bi-box-arrow-up-right" />
                      Live demo
                    </a>
                  ) : null}
                  {isService && item.serviceDetails?.repoUrl ? (
                    <a className="button ghost" href={item.serviceDetails.repoUrl} rel="noreferrer" target="_blank">
                      <i className="bi bi-github" />
                      GitHub repo
                    </a>
                  ) : null}
                  <button className="button primary" onClick={() => handleDownload(item)} type="button">
                    <i className={`bi ${isService ? "bi-file-earmark-zip" : "bi-download"}`} />
                    {isService ? "Download ZIP" : "Download PDF"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyStateCard
          title="No purchases yet"
          description="When you buy exam PDFs, notes, or website services from the marketplace, they will appear here for permanent re-download."
          action={
            <Link className="button secondary" to="/marketplace">
              <i className="bi bi-shop" />
              Browse marketplace
            </Link>
          }
        />
      )}
    </section>
  );
}
