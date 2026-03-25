import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { InternalLinkGrid } from "../../components/ui/InternalLinkGrid.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { MarketplaceListingCard } from "../../components/ui/MarketplaceListingCard.jsx";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import {
  createMarketplaceOrder,
  fetchPublicListingDetail,
  verifyMarketplacePayment,
} from "../../services/api/index.js";
import { loadRazorpayCheckout } from "../../utils/loadRazorpayCheckout.js";
import {
  buildBreadcrumbSchema,
  buildProductSchema,
  buildSeoPayload,
} from "../../utils/seo.js";

function createTaxonomyLink(prefix, value) {
  if (!value) {
    return null;
  }

  return {
    label: value,
    href: `/${prefix}/${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  };
}

export function PdfDetailPage() {
  const { slug } = useParams();
  const { accessToken, isAuthenticated } = useAuth();
  const [state, setState] = useState({ listing: null, relatedListings: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    let active = true;

    async function loadListing() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetchPublicListingDetail(slug);
        if (active) {
          setState(response.data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load marketplace listing.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (slug) {
      loadListing();
    }

    return () => {
      active = false;
    };
  }, [slug]);

  const listing = state.listing;
  const universityLink = createTaxonomyLink("university", listing?.taxonomy?.university);
  const branchLink = createTaxonomyLink("branch", listing?.taxonomy?.branch);
  const semesterLink = createTaxonomyLink("semester", listing?.taxonomy?.semester);
  const subjectLink = createTaxonomyLink("subject", listing?.taxonomy?.subject);
  const examPreparationLink = createTaxonomyLink("exam-preparation", listing?.taxonomy?.subject);
  const importantQuestionsLink = createTaxonomyLink("important-questions", listing?.taxonomy?.subject);
  const seoPayload = listing
    ? buildSeoPayload({
        title: listing.seoTitle || listing.title,
        description:
          listing.seoDescription ||
          listing.description ||
          "Compact exam-ready PDF listing with structured academic categorization.",
        pathname: `/pdf/${listing.slug}`,
        type: "product",
        jsonLd: [
          buildProductSchema({
            title: listing.title,
            description: listing.description,
            pathname: `/pdf/${listing.slug}`,
            priceInr: listing.priceInr,
            sellerName: listing.sellerName,
          }),
          buildBreadcrumbSchema([
            { label: "Home", href: "/" },
            { label: "Marketplace", href: "/marketplace" },
            { label: listing.title, href: `/pdf/${listing.slug}` },
          ]),
        ],
      })
    : null;

  async function handlePurchase() {
    if (!isAuthenticated || !accessToken) {
      setFeedback({ type: "error", message: "Please log in to buy this marketplace PDF." });
      return;
    }

    setFeedback({ type: "", message: "" });
    setIsPurchasing(true);

    try {
      const [RazorpayCheckout, orderResponse] = await Promise.all([
        loadRazorpayCheckout(),
        createMarketplaceOrder(accessToken, listing.id),
      ]);

      if (orderResponse.data.alreadyOwned) {
        setFeedback({
          type: "success",
          message: "You already own this PDF. It is available in your library.",
        });
        return;
      }

      await new Promise((resolve, reject) => {
        const razorpay = new RazorpayCheckout({
          key: orderResponse.data.checkout.key,
          amount: orderResponse.data.checkout.amount,
          currency: orderResponse.data.checkout.currency,
          name: orderResponse.data.checkout.name,
          description: orderResponse.data.checkout.description,
          order_id: orderResponse.data.checkout.orderId,
          notes: orderResponse.data.checkout.notes,
          theme: { color: "#cc6f29" },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled before completion.")),
          },
          handler: async (response) => {
            try {
              await verifyMarketplacePayment(accessToken, {
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
              });
              setFeedback({
                type: "success",
                message: "Marketplace purchase completed successfully. The PDF is now in your library.",
              });
              resolve();
            } catch (requestError) {
              reject(requestError);
            }
          },
        });

        razorpay.open();
      });
    } catch (requestError) {
      setFeedback({ type: "error", message: requestError.message || "Unable to complete marketplace purchase." });
    } finally {
      setIsPurchasing(false);
    }
  }

  return (
    <>
      {seoPayload ? <SeoHead {...seoPayload} /> : null}
      {isLoading ? (
        <LoadingCard message="Loading marketplace PDF detail..." />
      ) : error ? (
        <EmptyStateCard title="Listing unavailable" description={error} />
      ) : (
        <>
          <PageHero
            eyebrow={listing?.taxonomy?.subject || "PDF detail"}
            title={listing?.title || slug || "Listing"}
            description={listing?.description || "Compact exam-ready PDF listing for focused revision."}
            metrics={[
              { label: "Price", value: `Rs. ${listing?.priceInr || 0}` },
              { label: "Views", value: `${listing?.viewCount || 0}` },
              { label: "Access", value: "Permanent" },
            ]}
            actions={
              <>
                <button className="button primary" disabled={isPurchasing} onClick={handlePurchase} type="button">
                  <i className="bi bi-bag-check" />
                  {isPurchasing ? "Opening checkout..." : `Buy for Rs. ${listing?.priceInr || 0}`}
                </button>
                {isAuthenticated ? <Link className="button ghost" to="/app/purchased-pdfs"><i className="bi bi-collection" />Open library</Link> : null}
                <Link className="button secondary" to="/marketplace"><i className="bi bi-arrow-left" />Back to marketplace</Link>
              </>
            }
          />
          {feedback.message ? (
            <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
          ) : null}
          <section className="two-column-grid">
            <article className="detail-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Academic fit</p>
                  <h2>Structured category context</h2>
                </div>
              </div>
              <div className="info-grid">
                <div><span className="info-label">University</span><strong>{listing?.taxonomy?.university}</strong></div>
                <div><span className="info-label">Branch</span><strong>{listing?.taxonomy?.branch}</strong></div>
                <div><span className="info-label">Year</span><strong>{listing?.taxonomy?.year}</strong></div>
                <div><span className="info-label">Semester</span><strong>{listing?.taxonomy?.semester}</strong></div>
                <div><span className="info-label">Subject</span><strong>{listing?.taxonomy?.subject}</strong></div>
                <div><span className="info-label">Price</span><strong>Rs. {listing?.priceInr}</strong></div>
              </div>
              <div className="marketplace-taxonomy">
                {universityLink ? <Link to={universityLink.href}>{universityLink.label}</Link> : null}
                {branchLink ? <Link to={branchLink.href}>{branchLink.label}</Link> : null}
                {semesterLink ? <Link to={semesterLink.href}>{semesterLink.label}</Link> : null}
                {subjectLink ? <Link to={subjectLink.href}>{subjectLink.label}</Link> : null}
              </div>
              <p className="support-copy">
                Sold by {listing?.sellerName || "ExamNova Seller"} ({listing?.sellerSourceLabel || "Seller"}) - {listing?.viewCount || 0} views - Permanent buyer-library access after purchase.
              </p>
            </article>
            <article className="detail-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">Why this PDF</p>
                  <h2>Compact exam-note positioning</h2>
                </div>
              </div>
              <p className="support-copy">{listing?.description}</p>
              <div className="marketplace-taxonomy">
                {(listing?.tags || []).length
                  ? listing.tags.map((tag) => <span key={tag}>{tag}</span>)
                  : <span>Focused revision</span>}
              </div>
              <div className="hero-actions">
                <Link className="button ghost" to={examPreparationLink?.href || "/marketplace"}>
                  Explore exam preparation
                </Link>
                <Link className="button ghost" to={importantQuestionsLink?.href || "/marketplace"}>
                  Important questions
                </Link>
              </div>
            </article>
          </section>
          <section className="three-column-grid">
            <InternalLinkGrid
              links={universityLink ? [universityLink] : []}
              title="University preparation"
            />
            <InternalLinkGrid
              links={branchLink ? [branchLink] : []}
              title="Branch preparation"
            />
            <InternalLinkGrid
              links={semesterLink ? [semesterLink] : []}
              title="Semester preparation"
            />
            <InternalLinkGrid
              links={subjectLink ? [subjectLink] : []}
              title="Subject discovery"
            />
            <InternalLinkGrid
              links={examPreparationLink ? [examPreparationLink] : []}
              title="Exam preparation"
            />
            <InternalLinkGrid
              links={importantQuestionsLink ? [importantQuestionsLink] : []}
              title="Important questions"
            />
          </section>
          <section className="stack-section">
            <div className="section-header">
              <div>
                <p className="eyebrow">Related PDFs</p>
                <h2>More from this subject</h2>
              </div>
            </div>
            {state.relatedListings.length ? (
              <div className="marketplace-grid">
                {state.relatedListings.map((item) => (
                  <MarketplaceListingCard key={item.id} listing={item} />
                ))}
              </div>
            ) : (
              <EmptyStateCard
                title="No related PDFs yet"
                description="As more PDFs are published for this subject, related marketplace recommendations will appear here."
              />
            )}
          </section>
        </>
      )}
    </>
  );
}
