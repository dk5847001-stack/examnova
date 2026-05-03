import { CardPlaceholderGrid } from "./CardPlaceholderGrid.jsx";
import { SectionHeader } from "./SectionHeader.jsx";

export function MarketplaceSectionLoading({
  eyebrow,
  title,
  description,
  count = 3,
  variant = "marketplace",
}) {
  return (
    <section className="stack-section">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <CardPlaceholderGrid count={count} variant={variant} />
    </section>
  );
}
