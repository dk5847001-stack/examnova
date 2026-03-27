import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge.jsx";
import {
  formatMarketplaceDate,
  getCountdownParts,
  getCoverSealLabel,
  getListingCardDate,
  isListingReleaseLocked,
} from "../../utils/marketplaceAvailability.js";

export function MarketplaceListingCard({ listing, sellerView = false, action = null }) {
  const [now, setNow] = useState(Date.now());
  const subjectLabel = listing.taxonomy?.subject || "Marketplace PDF";
  const iconSeed = String(subjectLabel || listing.title || "P").trim().charAt(0).toUpperCase();
  const sealLabel = getCoverSealLabel(listing.coverSeal);
  const cardDate = formatMarketplaceDate(getListingCardDate(listing));
  const releaseLocked = isListingReleaseLocked(listing, now);
  const countdown = getCountdownParts(listing.releaseAt, now);
  const coverAlt = `${listing.title || "Marketplace PDF"} cover`;
  const coverArt = listing.coverImageUrl ? (
    <div className="simple-card-cover">
      <img alt={coverAlt} className="simple-card-cover-image" loading="lazy" src={listing.coverImageUrl} />
    </div>
  ) : (
    <div className="marketplace-card-icon simple-card-icon" aria-hidden="true">
      {iconSeed}
    </div>
  );

  useEffect(() => {
    if (!listing?.releaseAt) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [listing?.releaseAt]);

  if (sellerView) {
    return (
      <article className="marketplace-card simple-marketplace-card seller-view">
        <div className="simple-card-topline">
          {sealLabel ? <span className={`simple-cover-seal ${listing.coverSeal}`}>{sealLabel}</span> : <span />}
          <span className="simple-card-date">
            <i className="bi bi-calendar-event" />
            {cardDate || "Date pending"}
          </span>
        </div>
        {coverArt}
        <div className="marketplace-card-copy simple-card-copy">
          <h3>{listing.title}</h3>
        </div>
        <div className="simple-card-chip-row">
          <StatusBadge tone="success">Rs. {listing.priceInr}</StatusBadge>
          <StatusBadge tone={listing.isPublished ? "success" : "warning"}>
            {listing.isPublished ? "Published" : "Draft"}
          </StatusBadge>
          {releaseLocked ? <StatusBadge tone="warning">Upcoming</StatusBadge> : null}
        </div>
        {countdown ? (
          <div className="simple-countdown-card">
            <span className="info-label">Live countdown</span>
            <strong>{countdown.shortLabel}</strong>
          </div>
        ) : null}
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
      <div className="simple-card-topline">
        {sealLabel ? <span className={`simple-cover-seal ${listing.coverSeal}`}>{sealLabel}</span> : <span />}
        <span className="simple-card-date">
          <i className="bi bi-calendar-event" />
          {cardDate || "Date pending"}
        </span>
      </div>
      {coverArt}
      <div className="marketplace-card-copy simple-card-copy">
        <h3>{listing.title}</h3>
      </div>
      {countdown ? (
        <div className="simple-countdown-card">
          <span className="info-label">Unlocks in</span>
          <strong>{countdown.shortLabel}</strong>
        </div>
      ) : null}
      <div className="simple-card-chip-row">
        <StatusBadge tone="success">Rs. {listing.priceInr}</StatusBadge>
        {releaseLocked ? <StatusBadge tone="warning">Upcoming</StatusBadge> : null}
      </div>
      <div className="hero-actions card-actions">
        <Link className="button secondary full-width" to={`/pdf/${listing.slug}`}>
          <i className={`bi ${releaseLocked ? "bi-lock" : "bi-download"}`} />
          Download PDF
        </Link>
        {action}
      </div>
    </article>
  );
}
