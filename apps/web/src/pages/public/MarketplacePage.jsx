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
  const [result, setResult] = useState({ items: [], pagination: null });
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

  const totalListings = result.pagination?.total || result.items.length;
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
        <div className="simple-marketplace-header">
          <p className="eyebrow">PDF Marketplace</p>
          <h1>Download Notes</h1>
          <p className="support-copy">
            Choose your subject, open a PDF card, and purchase securely. The public website is intentionally focused only on PDF browsing and buying.
          </p>
        </div>

        <form className="detail-card simple-marketplace-toolbar" onSubmit={(event) => event.preventDefault()}>
          <div className="simple-marketplace-toolbar-head">
            <SectionHeader
              eyebrow="Browse PDFs"
              title={`${isLoading ? "Loading..." : totalListings} PDF${totalListings === 1 ? "" : "s"} ready to review`}
              description="Use filters only if you need them. Otherwise, scroll the cards below and open the PDF you want."
            />
            {hasActiveFilters ? (
              <button className="button ghost" onClick={handleResetFilters} type="button">
                <i className="bi bi-arrow-counterclockwise" />
                Clear filters
              </button>
            ) : null}
          </div>

          <div className="simple-marketplace-toolbar-grid">
            <label className="field">
              <span>Search</span>
              <input
                className="input"
                onChange={(event) => handleFilterChange("search", event.target.value)}
                placeholder="Search by title or subject"
                value={filters.search}
              />
            </label>
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
            <label className="field">
              <span>Subject</span>
              <input
                className="input"
                onChange={(event) => handleFilterChange("subject", event.target.value)}
                placeholder="Example: Operating Systems"
                value={filters.subject}
              />
            </label>
            <label className="field">
              <span>Sort</span>
              <select className="input" onChange={(event) => handleFilterChange("sort", event.target.value)} value={filters.sort}>
                <option value="latest">Latest</option>
                <option value="popularity">Popularity</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </label>
          </div>
        </form>

        {error ? <p className="form-error">{error}</p> : null}

        {isLoading ? (
          <LoadingCard message="Loading PDFs..." />
        ) : result.items.length ? (
          <div className="marketplace-grid simple-marketplace-grid">
            {result.items.map((listing) => (
              <MarketplaceListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
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
        )}
      </section>
    </>
  );
}
