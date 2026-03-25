import { useEffect, useState } from "react";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { InternalLinkGrid } from "../../components/ui/InternalLinkGrid.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { MarketplaceListingCard } from "../../components/ui/MarketplaceListingCard.jsx";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { UpcomingLockedCard } from "../../components/ui/UpcomingLockedCard.jsx";
import {
  BRANCH_OPTIONS,
  DEFAULT_UNIVERSITY,
  SEMESTER_OPTIONS,
  YEAR_OPTIONS,
  withAllOption,
} from "../../features/academic/academicTaxonomy.js";
import { SeoHead } from "../../seo/SeoHead.jsx";
import {
  fetchPublicListings,
  fetchSeoDiscoveryIndex,
  fetchUpcomingLockedPdfs,
} from "../../services/api/index.js";
import { buildBreadcrumbSchema, buildCollectionSchema, buildSeoPayload } from "../../utils/seo.js";

export function MarketplacePage() {
  const universityOptions = withAllOption([DEFAULT_UNIVERSITY], "All universities");
  const branchOptions = withAllOption(BRANCH_OPTIONS, "All branches");
  const yearOptions = withAllOption(YEAR_OPTIONS, "All years");
  const semesterOptions = withAllOption(SEMESTER_OPTIONS, "All semesters");

  const [filters, setFilters] = useState({
    search: "",
    university: "",
    branch: "",
    year: "",
    semester: "",
    subject: "",
    sort: "latest",
  });
  const [result, setResult] = useState({ items: [], pagination: null });
  const [upcomingItems, setUpcomingItems] = useState([]);
  const [discoveryIndex, setDiscoveryIndex] = useState(null);
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

  useEffect(() => {
    let active = true;

    async function loadUpcoming() {
      try {
        const response = await fetchUpcomingLockedPdfs({
          semester: filters.semester,
          subject: filters.subject,
        });
        if (active) {
          setUpcomingItems(response.data.items.slice(0, 3));
        }
      } catch {
        if (active) {
          setUpcomingItems([]);
        }
      }
    }

    loadUpcoming();

    return () => {
      active = false;
    };
  }, [filters.semester, filters.subject]);

  useEffect(() => {
    let active = true;

    async function loadDiscoveryIndex() {
      try {
        const response = await fetchSeoDiscoveryIndex();
        if (active) {
          setDiscoveryIndex(response.data);
        }
      } catch {
        if (active) {
          setDiscoveryIndex(null);
        }
      }
    }

    loadDiscoveryIndex();

    return () => {
      active = false;
    };
  }, []);

  function handleFilterChange(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

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
      <PageHero
        eyebrow="Public marketplace"
        title="Find premium study PDFs without guessing where to start."
        description="The marketplace is the main front door to ExamNova AI. Browse clean, searchable Sandip University PDFs by branch, year, semester, and subject, then open a listing and purchase it with a guided flow."
        metrics={[
          { label: "Discovery", value: "Marketplace first" },
          { label: "Filtering", value: "Academic guided" },
          { label: "Access", value: "Buy and save" },
        ]}
      />
      {discoveryIndex ? (
        <section className="three-column-grid">
          <InternalLinkGrid links={discoveryIndex.universities || []} title="Universities" />
          <InternalLinkGrid links={discoveryIndex.branches || []} title="Branches" />
          <InternalLinkGrid links={discoveryIndex.semesters || []} title="Semesters" />
          <InternalLinkGrid links={discoveryIndex.subjects || []} title="Subjects" />
          <InternalLinkGrid links={discoveryIndex.examPreparation || []} title="Exam Preparation" />
          <InternalLinkGrid links={discoveryIndex.importantQuestions || []} title="Important Questions" />
        </section>
      ) : null}
      <section className="two-column-grid marketplace-shell">
        <form className="detail-card marketplace-filters">
          <div className="section-header">
            <div>
              <p className="eyebrow">Browse filters</p>
              <h2>Search and refine</h2>
              <p className="support-copy">Use guided filters to narrow the catalog quickly, even if you are using the platform for the first time.</p>
            </div>
          </div>
          <label className="field">
            <span>Search</span>
            <input className="input" onChange={(event) => handleFilterChange("search", event.target.value)} placeholder="Search by subject, topic, or listing title" value={filters.search} />
          </label>
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
            <label className="field"><span>Subject</span><input className="input" onChange={(event) => handleFilterChange("subject", event.target.value)} placeholder="Example: Operating Systems" value={filters.subject} /></label>
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

        <section className="stack-section">
          {error ? <p className="form-error">{error}</p> : null}
          {isLoading ? (
            <LoadingCard message="Loading marketplace listings..." />
          ) : result.items.length ? (
            <>
              <div className="document-meta-row">
                <span>{result.pagination?.total || result.items.length} listings found</span>
                <span>Open a listing to review details, price, and purchase access</span>
              </div>
              <div className="marketplace-grid">
                {result.items.map((listing) => (
                  <MarketplaceListingCard key={listing.id} listing={listing} />
                ))}
              </div>
              {upcomingItems.length ? (
                <section className="stack-section">
                  <div className="section-header">
                    <div>
                      <p className="eyebrow">Upcoming locked content</p>
                      <h2>Current-semester releases coming soon</h2>
                    </div>
                  </div>
                  <div className="marketplace-grid">
                    {upcomingItems.map((item) => (
                      <UpcomingLockedCard item={item} key={item.id} />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <EmptyStateCard
              title="No marketplace PDFs match yet"
              description="Try adjusting your academic filters or broadening your subject search to discover more exam-ready PDFs."
            />
          )}
        </section>
      </section>
    </>
  );
}
