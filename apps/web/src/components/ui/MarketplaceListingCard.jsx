import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge.jsx";

export function MarketplaceListingCard({ listing, sellerView = false, action = null }) {
  return (
    <article className="marketplace-card">
      <div className="marketplace-card-header">
        <div>
          <p className="eyebrow">{listing.taxonomy?.subject || "Marketplace PDF"}</p>
          <h3>{listing.title}</h3>
          <p className="support-copy">
            {listing.taxonomy?.university} - {listing.taxonomy?.branch} - {listing.taxonomy?.semester}
          </p>
        </div>
        <div className="topbar-chip-group">
          <StatusBadge tone="success">Rs. {listing.priceInr}</StatusBadge>
          {sellerView ? (
            <StatusBadge tone={listing.isPublished ? "success" : "warning"}>
              {listing.visibility}
            </StatusBadge>
          ) : null}
        </div>
      </div>

      <p className="support-copy">{listing.description || "Compact exam-ready notes prepared for public marketplace discovery."}</p>

      <div className="marketplace-taxonomy">
        <span>{listing.taxonomy?.year}</span>
        <span>{listing.taxonomy?.semester}</span>
        <span>{listing.taxonomy?.subject}</span>
      </div>

      <div className="document-meta-row">
        <span>
          {sellerView
            ? `Views ${listing.viewCount || 0} - Sales ${listing.salesCount || 0}`
            : `${listing.sellerSourceLabel || "Seller"}: ${listing.sellerName || "ExamNova Seller"}`}
        </span>
        <span>{listing.isPublished ? "Published" : "Draft/Unlisted"}</span>
      </div>

      <div className="hero-actions card-actions">
        <Link className="button secondary" to={`/pdf/${listing.slug}`}>
          <i className="bi bi-arrow-up-right" />
          View detail
        </Link>
        {action}
      </div>
    </article>
  );
}
