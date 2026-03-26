import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge.jsx";

export function MarketplaceListingCard({ listing, sellerView = false, action = null }) {
  const studyMetadata = listing.studyMetadata || {};
  const isAdminUpload = listing.sourceType === "admin_upload";
  const sourceLabel = listing.sellerSourceLabel || (isAdminUpload ? "ExamNova Admin" : "Student Seller");
  const sourceTone = isAdminUpload ? "warning" : "neutral";
  const sellerLabel = listing.sellerName || (isAdminUpload ? "ExamNova Team" : "ExamNova Seller");
  const subjectLabel = listing.taxonomy?.subject || "Marketplace PDF";
  const academicSummary = [
    listing.taxonomy?.university,
    listing.taxonomy?.branch,
    listing.taxonomy?.semester ? `Semester ${listing.taxonomy.semester}` : null,
  ]
    .filter(Boolean)
    .join(" - ");
  const iconSeed = String(subjectLabel || listing.title || "P").trim().charAt(0).toUpperCase();
  const studyTags = [
    listing.taxonomy?.year,
    studyMetadata.examFocus,
    studyMetadata.difficultyLevel,
  ].filter(Boolean);

  if (sellerView) {
    return (
      <article className="marketplace-card simple-marketplace-card seller-view">
        <div className="marketplace-card-icon simple-card-icon" aria-hidden="true">
          {iconSeed}
        </div>
        <div className="marketplace-card-copy simple-card-copy">
          <h3>{listing.title}</h3>
          <p className="support-copy">{academicSummary || "Structured academic listing"}</p>
        </div>
        <div className="simple-card-chip-row">
          <StatusBadge tone={sourceTone}>{sourceLabel}</StatusBadge>
          <StatusBadge tone={listing.isPublished ? "success" : "warning"}>
            {listing.isPublished ? "Published" : "Draft"}
          </StatusBadge>
        </div>
        <p className="support-copy simple-card-caption">
          Views {listing.viewCount || 0} - Sales {listing.salesCount || 0} - Seller {sellerLabel}
        </p>
        <div className="marketplace-taxonomy simple-card-tags">
          {studyTags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="hero-actions card-actions">
          <Link className="button secondary full-width" to={`/pdf/${listing.slug}`}>
            <i className="bi bi-arrow-up-right" />
            View detail
          </Link>
          {action}
        </div>
      </article>
    );
  }

  return (
    <article className="marketplace-card simple-marketplace-card buyer-view">
      <div className="marketplace-card-icon simple-card-icon" aria-hidden="true">
        {iconSeed}
      </div>
      <div className="marketplace-card-copy simple-card-copy">
        <h3>{listing.title}</h3>
        <p className="support-copy">{academicSummary || "Structured academic PDF"}</p>
      </div>
      <div className="simple-card-chip-row">
        <StatusBadge tone={sourceTone}>{sourceLabel}</StatusBadge>
        <StatusBadge tone="success">Rs. {listing.priceInr}</StatusBadge>
      </div>
      <p className="support-copy simple-card-caption">
        {listing.description || "Download notes here and purchase securely after opening the PDF page."}
      </p>
      <div className="marketplace-taxonomy simple-card-tags">
        {studyTags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="hero-actions card-actions">
        <Link className="button secondary full-width" to={`/pdf/${listing.slug}`}>
          <i className="bi bi-arrow-up-right" />
          Review PDF
        </Link>
        {action}
      </div>
    </article>
  );
}
