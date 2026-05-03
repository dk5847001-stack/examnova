import { useEffect, useState } from "react";
import { CardPlaceholderGrid } from "../../components/ui/CardPlaceholderGrid.jsx";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { UpcomingLockedCard } from "../../components/ui/UpcomingLockedCard.jsx";
import {
  BRANCH_OPTIONS,
  DEFAULT_UNIVERSITY,
  SEMESTER_OPTIONS,
  YEAR_OPTIONS,
  withAllOption,
} from "../../features/academic/academicTaxonomy.js";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { fetchUpcomingLockedPdfs } from "../../services/api/index.js";
import { buildPageTitle } from "../../utils/seo.js";

export function UpcomingLockedPage() {
  const universityOptions = withAllOption([DEFAULT_UNIVERSITY], "All universities");
  const branchOptions = withAllOption(BRANCH_OPTIONS, "All branches");
  const yearOptions = withAllOption(YEAR_OPTIONS, "All years");
  const semesterOptions = withAllOption(SEMESTER_OPTIONS, "All semesters");

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
        description="Locked upcoming PDFs help students understand what is about to drop for their semester and subject before the content is released into the marketplace."
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
              <p className="support-copy">Use the same academic structure as the live marketplace so the public catalog feels consistent and easy to browse.</p>
            </div>
          </div>
          <div className="two-column-grid compact">
            <label className="field">
              <span>University</span>
              <select className="input" onChange={(event) => handleFilterChange("university", event.target.value)} value={filters.university}>
                {universityOptions.map((option) => (
                  <option key={option.value || "all-university"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Branch</span>
              <select className="input" onChange={(event) => handleFilterChange("branch", event.target.value)} value={filters.branch}>
                {branchOptions.map((option) => (
                  <option key={option.value || "all-branch"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Year</span>
              <select className="input" onChange={(event) => handleFilterChange("year", event.target.value)} value={filters.year}>
                {yearOptions.map((option) => (
                  <option key={option.value || "all-year"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Semester</span>
              <select className="input" onChange={(event) => handleFilterChange("semester", event.target.value)} value={filters.semester}>
                {semesterOptions.map((option) => (
                  <option key={option.value || "all-semester"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="two-column-grid compact">
            <label className="field"><span>Subject</span><input className="input" onChange={(event) => handleFilterChange("subject", event.target.value)} placeholder="Example: Software Engineering" value={filters.subject} /></label>
            <label className="field">
              <span>Current semester highlight</span>
              <select className="input" onChange={(event) => handleFilterChange("currentSemester", event.target.value)} value={filters.currentSemester}>
                {semesterOptions.map((option) => (
                  <option key={`current-${option.value || "all"}`} value={option.value}>
                    {option.label === "All semesters" ? "No highlight" : option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </form>

        <section className="stack-section">
          {error ? <p className="form-error">{error}</p> : null}
          {isLoading ? (
            <CardPlaceholderGrid
              ariaLabel="Loading upcoming locked PDFs"
              count={6}
              variant="upcoming"
              className="marketplace-grid"
            />
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
