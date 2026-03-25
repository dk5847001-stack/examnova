import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge.jsx";

export function MarketplaceListingCard({ listing, sellerView = false, action = null }) {
  const studyMetadata = listing.studyMetadata || {};

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
        {listing.taxonomy?.year ? <span>{listing.taxonomy.year}</span> : null}
        {listing.taxonomy?.semester ? <span>Semester {listing.taxonomy.semester}</span> : null}
        {studyMetadata.examFocus ? <span>{studyMetadata.examFocus}</span> : null}
        {studyMetadata.questionType ? <span>{studyMetadata.questionType}</span> : null}
        {studyMetadata.difficultyLevel ? <span>{studyMetadata.difficultyLevel}</span> : null}
      </div>

      <div className="document-meta-row">
        <span>
          {sellerView
            ? `Views ${listing.viewCount || 0} - Sales ${listing.salesCount || 0}`
            : `${listing.sellerSourceLabel || "Seller"}: ${listing.sellerName || "ExamNova Seller"}`}
        </span>
        <span>{sellerView ? (listing.isPublished ? "Published" : "Draft/Unlisted") : "Permanent library access"}</span>
      </div>

      <div className="hero-actions card-actions">
        <Link className={sellerView ? "button secondary" : "button primary"} to={`/pdf/${listing.slug}`}>
          <i className="bi bi-arrow-up-right" />
          {sellerView ? "View detail" : "View & buy"}
        </Link>
        {action}
      </div>
    </article>
  );
}
