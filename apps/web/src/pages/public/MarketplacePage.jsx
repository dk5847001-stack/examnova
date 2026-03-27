import { useEffect, useState } from "react";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { MarketplaceListingCard } from "../../components/ui/MarketplaceListingCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import {
  BRANCH_OPTIONS,
  DEFAULT_UNIVERSITY,
  SEMESTER_OPTIONS,
  YEAR_OPTIONS,
  withAllOption,
} from "../../features/academic/academicTaxonomy.js";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { fetchPublicListings } from "../../services/api/index.js";
import { buildBreadcrumbSchema, buildCollectionSchema, buildSeoPayload } from "../../utils/seo.js";

const DEFAULT_FILTERS = {
  search: "",
  university: "",
  branch: "",
  year: "",
  semester: "",
  subject: "",
  sort: "latest",
};

export function MarketplacePage() {
  const universityOptions = withAllOption([DEFAULT_UNIVERSITY], "All universities");
  const branchOptions = withAllOption(BRANCH_OPTIONS, "All branches");
  const yearOptions = withAllOption(YEAR_OPTIONS, "All years");
  const semesterOptions = withAllOption(SEMESTER_OPTIONS, "All semesters");

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [result, setResult] = useState({ items: [], upcomingItems: [], pagination: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadListings() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetchPublicListings(filters);
        if (active) {
          setResult(response.data);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load marketplace listings.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadListings();

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

  function handleResetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  const totalLiveListings = result.pagination?.total || result.items.length;
  const upcomingCount = result.upcomingItems?.length || 0;
  const totalListings = totalLiveListings + upcomingCount;
  const marketplaceCards = [...result.items, ...(result.upcomingItems || [])];
  const hasActiveFilters = Object.entries(filters).some(([key, value]) =>
    key === "sort" ? value !== DEFAULT_FILTERS.sort : Boolean(value),
  );

  const seoPayload = buildSeoPayload({
    title: "Marketplace",
    description: "Browse university, branch, semester, and subject-based exam PDFs on ExamNova AI.",
    pathname: "/marketplace",
    jsonLd: [
      buildCollectionSchema({
        title: "Marketplace",
        description: "Public marketplace for university, semester, branch, and subject-based exam PDFs.",
        pathname: "/marketplace",
      }),
      buildBreadcrumbSchema([
        { label: "Home", href: "/" },
        { label: "Marketplace", href: "/marketplace" },
      ]),
    ],
  });

  return (
    <>
      <SeoHead {...seoPayload} />

      <section className="stack-section simple-marketplace-page">
        <div className="simple-marketplace-header compact">
          <p className="eyebrow">PDF Marketplace</p>
          <h1>Download Notes</h1>
          <p className="support-copy">
            Choose your subject, open a PDF card, and purchase securely. The public website is intentionally focused only on PDF browsing and buying.
          </p>
        </div>

        <form className="detail-card simple-marketplace-toolbar" onSubmit={(event) => event.preventDefault()}>
          <div className="simple-marketplace-toolbar-head compact">
            <div>
              <p className="eyebrow">Browse PDFs</p>
              <h2>{isLoading ? "Loading PDFs..." : `${totalListings} PDF${totalListings === 1 ? "" : "s"} ready`}</h2>
            </div>
          </div>

          <label className="field simple-marketplace-search-field">
            <span className="visually-hidden">Search PDFs</span>
            <div className="simple-marketplace-search-input">
              <i className="bi bi-search" />
              <input
                className="input"
                onChange={(event) => handleFilterChange("search", event.target.value)}
                placeholder="Search by title or subject"
                value={filters.search}
              />
            </div>
          </label>

          <div className="simple-marketplace-mini-filters">
            <label className="simple-mini-filter">
              <i className="bi bi-building" />
              <select className="input" onChange={(event) => handleFilterChange("university", event.target.value)} value={filters.university}>
                {universityOptions.map((option) => (
                  <option key={option.value || "all-university"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="simple-mini-filter">
              <i className="bi bi-diagram-3-fill" />
              <select className="input" onChange={(event) => handleFilterChange("branch", event.target.value)} value={filters.branch}>
                {branchOptions.map((option) => (
                  <option key={option.value || "all-branch"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="simple-mini-filter">
              <i className="bi bi-calendar4-event" />
              <select className="input" onChange={(event) => handleFilterChange("year", event.target.value)} value={filters.year}>
                {yearOptions.map((option) => (
                  <option key={option.value || "all-year"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="simple-mini-filter">
              <i className="bi bi-collection-fill" />
              <select className="input" onChange={(event) => handleFilterChange("semester", event.target.value)} value={filters.semester}>
                {semesterOptions.map((option) => (
                  <option key={option.value || "all-semester"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="simple-mini-filter">
              <i className="bi bi-sort-down" />
              <select className="input" onChange={(event) => handleFilterChange("sort", event.target.value)} value={filters.sort}>
                <option value="latest">Latest</option>
                <option value="popularity">Popularity</option>
                <option value="price_asc">Price Low-High</option>
                <option value="price_desc">Price High-Low</option>
              </select>
            </label>
            {hasActiveFilters ? (
              <button className="simple-mini-filter action" onClick={handleResetFilters} type="button">
                <i className="bi bi-arrow-counterclockwise" />
                <span>Reset</span>
              </button>
            ) : null}
          </div>
        </form>

        {error ? <p className="form-error">{error}</p> : null}

        {isLoading ? <LoadingCard message="Loading PDFs..." /> : null}

        {!isLoading && marketplaceCards.length ? (
          <section className="stack-section">
            <SectionHeader
              eyebrow="All PDFs"
              title={`${totalListings} card${totalListings === 1 ? "" : "s"} in one grid`}
              description="Live and upcoming PDFs stay together in the same line-based grid."
            />
            <div className="marketplace-grid simple-marketplace-grid">
              {marketplaceCards.map((listing) => (
                <MarketplaceListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </section>
        ) : null}

        {!isLoading && !marketplaceCards.length ? (
          <EmptyStateCard
            title="No PDFs match these filters yet"
            description={
              hasActiveFilters
                ? "Try clearing some filters or searching more broadly."
                : "Published PDFs will appear here as soon as they are available."
            }
            action={
              hasActiveFilters ? (
                <button className="button primary" onClick={handleResetFilters} type="button">
                  <i className="bi bi-arrow-counterclockwise" />
                  Reset filters
                </button>
              ) : null
            }
          />
        ) : null}
      </section>
    </>
  );
}
