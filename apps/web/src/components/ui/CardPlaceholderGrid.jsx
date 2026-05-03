const PLACEHOLDER_KEYS = Array.from({ length: 6 }, (_, index) => `placeholder-${index}`);

function PlaceholderLine({ width = "w-100", size = "" }) {
  const sizeClassName = size ? ` ${size}` : "";

  return <span className={`placeholder placeholder-glow ${width}${sizeClassName}`} aria-hidden="true" />;
}

function MarketplacePlaceholderCard() {
  return (
    <article className="marketplace-card simple-marketplace-card placeholder-card" aria-hidden="true">
      <div className="simple-card-topline">
        <PlaceholderLine width="w-25" />
        <PlaceholderLine width="w-35" />
      </div>
      <div className="simple-card-cover placeholder-block placeholder-cover" />
      <div className="marketplace-card-copy simple-card-copy placeholder-stack">
        <PlaceholderLine width="w-75" size="placeholder-lg" />
        <PlaceholderLine width="w-50" />
      </div>
      <div className="simple-countdown-card placeholder-stack">
        <PlaceholderLine width="w-35" />
        <PlaceholderLine width="w-50" size="placeholder-lg" />
      </div>
      <div className="simple-card-chip-row placeholder-chip-row">
        <PlaceholderLine width="w-25" />
        <PlaceholderLine width="w-25" />
      </div>
      <div className="hero-actions card-actions">
        <span className="placeholder placeholder-glow placeholder-button w-100" />
      </div>
    </article>
  );
}

function ServicePlaceholderCard() {
  return (
    <article className="marketplace-card service-listing-card placeholder-card" aria-hidden="true">
      <div className="simple-card-cover service-card-cover placeholder-block placeholder-cover" />
      <div className="marketplace-card-copy simple-card-copy placeholder-stack">
        <PlaceholderLine width="w-35" />
        <PlaceholderLine width="w-75" size="placeholder-lg" />
        <PlaceholderLine width="w-100" />
        <PlaceholderLine width="w-50" />
      </div>
      <div className="marketplace-taxonomy placeholder-chip-row">
        <PlaceholderLine width="w-25" />
        <PlaceholderLine width="w-25" />
        <PlaceholderLine width="w-25" />
      </div>
      <div className="service-card-price-row placeholder-row">
        <PlaceholderLine width="w-25" size="placeholder-lg" />
        <PlaceholderLine width="w-35" />
      </div>
      <div className="hero-actions card-actions">
        <span className="placeholder placeholder-glow placeholder-button w-35" />
        <span className="placeholder placeholder-glow placeholder-button w-35" />
      </div>
    </article>
  );
}

function UpcomingPlaceholderCard() {
  return (
    <article className="marketplace-card upcoming-card placeholder-card" aria-hidden="true">
      <div className="marketplace-card-header">
        <div className="placeholder-stack">
          <PlaceholderLine width="w-35" />
          <PlaceholderLine width="w-75" size="placeholder-lg" />
          <PlaceholderLine width="w-50" />
        </div>
        <div className="placeholder-stack placeholder-end">
          <PlaceholderLine width="w-25" />
          <PlaceholderLine width="w-35" />
        </div>
      </div>
      <div className="placeholder-stack">
        <PlaceholderLine width="w-100" />
        <PlaceholderLine width="w-75" />
      </div>
      <div className="marketplace-taxonomy placeholder-chip-row">
        <PlaceholderLine width="w-25" />
        <PlaceholderLine width="w-25" />
        <PlaceholderLine width="w-35" />
      </div>
      <div className="document-meta-row placeholder-row">
        <PlaceholderLine width="w-25" />
        <PlaceholderLine width="w-35" />
      </div>
      <div className="hero-actions">
        <span className="placeholder placeholder-glow placeholder-button w-50" />
      </div>
    </article>
  );
}

function LibraryPlaceholderCard() {
  return (
    <article className="marketplace-card service-listing-card placeholder-card" aria-hidden="true">
      <div className="marketplace-card-header">
        <div className="placeholder-stack">
          <PlaceholderLine width="w-35" />
          <PlaceholderLine width="w-75" size="placeholder-lg" />
          <PlaceholderLine width="w-50" />
        </div>
        <div className="placeholder-stack placeholder-end">
          <PlaceholderLine width="w-25" />
          <PlaceholderLine width="w-35" />
        </div>
      </div>
      <div className="marketplace-taxonomy placeholder-chip-row">
        <PlaceholderLine width="w-25" />
        <PlaceholderLine width="w-25" />
        <PlaceholderLine width="w-35" />
      </div>
      <div className="hero-actions">
        <span className="placeholder placeholder-glow placeholder-button w-35" />
        <span className="placeholder placeholder-glow placeholder-button w-35" />
        <span className="placeholder placeholder-glow placeholder-button w-35" />
      </div>
    </article>
  );
}

function resolveVariant(variant) {
  switch (variant) {
    case "service":
      return ServicePlaceholderCard;
    case "upcoming":
      return UpcomingPlaceholderCard;
    case "library":
      return LibraryPlaceholderCard;
    case "marketplace":
    default:
      return MarketplacePlaceholderCard;
  }
}

export function CardPlaceholderGrid({
  count = 6,
  variant = "marketplace",
  className = "marketplace-grid simple-marketplace-grid",
  ariaLabel = "Loading cards",
}) {
  const PlaceholderCard = resolveVariant(variant);

  return (
    <div className={className} aria-label={ariaLabel} role="status">
      {PLACEHOLDER_KEYS.slice(0, count).map((key) => (
        <PlaceholderCard key={`${variant}-${key}`} />
      ))}
      <span className="visually-hidden">Loading content</span>
    </div>
  );
}
