import { useEffect, useState } from "react";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { UpcomingLockedCard } from "../../components/ui/UpcomingLockedCard.jsx";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { fetchUpcomingLockedPdfs } from "../../services/api/index.js";
import { buildPageTitle } from "../../utils/seo.js";

export function UpcomingLockedPage() {
  const [filters, setFilters] = useState({
    university: "",
    branch: "",
    year: "",
    semester: "",
    subject: "",
    currentSemester: "",
  });
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadItems() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetchUpcomingLockedPdfs(filters);
        if (active) {
          setItems(response.data.items);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load upcoming locked PDFs.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      active = false;
    };
  }, [filters]);

  function handleFilterChange(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <>
      <SeoHead
        title={buildPageTitle("Upcoming Locked PDFs")}
        description="Preview locked upcoming exam PDFs by university, branch, semester, and subject before release."
      />
      <PageHero
        eyebrow="Upcoming releases"
        title="See what premium exam content is coming next."
        description="Locked upcoming PDFs help students track what is about to drop for their semester and subject before the content is released into the marketplace."
        metrics={[
          { label: "Visibility", value: "Preview Mode" },
          { label: "Targeting", value: "Semester Smart" },
          { label: "Release", value: "Admin Controlled" },
        ]}
      />
      <section className="two-column-grid marketplace-shell">
        <form className="detail-card marketplace-filters">
          <div className="section-header">
            <div>
              <p className="eyebrow">Locked filters</p>
              <h2>Find relevant upcoming drops</h2>
            </div>
          </div>
          <div className="two-column-grid compact">
            <label className="field"><span>University</span><input className="input" onChange={(event) => handleFilterChange("university", event.target.value)} value={filters.university} /></label>
            <label className="field"><span>Branch</span><input className="input" onChange={(event) => handleFilterChange("branch", event.target.value)} value={filters.branch} /></label>
            <label className="field"><span>Year</span><input className="input" onChange={(event) => handleFilterChange("year", event.target.value)} value={filters.year} /></label>
            <label className="field"><span>Semester</span><input className="input" onChange={(event) => handleFilterChange("semester", event.target.value)} value={filters.semester} /></label>
          </div>
          <div className="two-column-grid compact">
            <label className="field"><span>Subject</span><input className="input" onChange={(event) => handleFilterChange("subject", event.target.value)} value={filters.subject} /></label>
            <label className="field"><span>Current semester highlight</span><input className="input" onChange={(event) => handleFilterChange("currentSemester", event.target.value)} placeholder="Example: Semester 6" value={filters.currentSemester} /></label>
          </div>
        </form>

        <section className="stack-section">
          {error ? <p className="form-error">{error}</p> : null}
          {isLoading ? (
            <LoadingCard message="Loading upcoming locked PDFs..." />
          ) : items.length ? (
            <div className="marketplace-grid">
              {items.map((item) => (
                <UpcomingLockedCard item={item} key={item.id} />
              ))}
            </div>
          ) : (
            <EmptyStateCard
              title="No upcoming locked PDFs match yet"
              description="Try relaxing your filters or check back later for new current-semester releases."
            />
          )}
        </section>
      </section>
    </>
  );
}
