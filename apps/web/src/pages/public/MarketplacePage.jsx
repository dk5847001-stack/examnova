import { useEffect, useState } from "react";
import { CardPlaceholderGrid } from "../../components/ui/CardPlaceholderGrid.jsx";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { MarketplaceListingCard } from "../../components/ui/MarketplaceListingCard.jsx";
import { MarketplaceSectionLoading } from "../../components/ui/MarketplaceSectionLoading.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { ServiceListingCard } from "../../components/ui/ServiceListingCard.jsx";
import {
  BRANCH_OPTIONS,
  DEFAULT_UNIVERSITY,
  SEMESTER_OPTIONS,
  YEAR_OPTIONS,
  withAllOption,
} from "../../features/academic/academicTaxonomy.js";
import {
  MARKETPLACE_CATEGORY_LIMIT,
  SERVICE_CATEGORY_OPTIONS,
} from "../../features/marketplace/marketplace.constants.js";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { fetchPublicListings, fetchPublicServices } from "../../services/api/index.js";
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

const MARKETPLACE_SECTION_TABS = [
  {
    value: "exam_micro",
    label: "Micro Download",
    icon: "bi-journal-richtext",
    description: "Semester and CIA exam PDFs",
  },
  {
    value: "notes",
    label: "Notes Download",
    icon: "bi-file-earmark-text-fill",
    description: "Notes and study materials",
  },
  {
    value: "services",
    label: "Services",
    icon: "bi-window-stack",
    description: "Website packages and digital products",
  },
];

const SECTION_COPY = {
  exam_micro: {
    eyebrow: "Exams Micro Download",
    title: "Current semester and CIA exam PDFs",
    description:
      "Use the top slider to switch sections. This tab keeps semester exam and CIA exam PDFs grouped in one focused buying area.",
    searchPlaceholder: "Search exam PDFs by title or subject",
    toolbarEyebrow: "Exam micro",
  },
  notes: {
    eyebrow: "Notes Download",
    title: "Browse notes and study materials",
    description:
      "This section is dedicated to notes, generated answer PDFs, and other study-focused materials that are not part of the exam micro upload flow.",
    searchPlaceholder: "Search notes by title or subject",
    toolbarEyebrow: "Notes",
  },
  services: {
    eyebrow: "Services",
    title: "Buy ready-made websites and digital setups",
    description:
      "Portfolio websites, commercial sites, product showcase templates, and more are grouped here. After purchase, users can unlock ZIP download and repo access.",
    searchPlaceholder: "Search website services by title, category, or stack",
    toolbarEyebrow: "Services",
  },
};

const SERVICE_SECTION_DESCRIPTIONS = {
  portfolio_website: "Personal brands, resumes, creator profiles, and agency-style showcase websites.",
  commercial_website: "Business-ready brochure websites for clients, shops, offices, and service companies.",
  product_website: "Product showcase websites with feature sections, pricing blocks, and launch-style layouts.",
  landing_page: "Single-page campaign, promotion, and lead-capture websites focused on conversions.",
  ecommerce_website: "Storefront-style website kits for catalog browsing and online selling flows.",
};

export function MarketplacePage() {
  const universityOptions = withAllOption([DEFAULT_UNIVERSITY], "All universities");
  const branchOptions = withAllOption(BRANCH_OPTIONS, "All branches");
  const yearOptions = withAllOption(YEAR_OPTIONS, "All years");
  const semesterOptions = withAllOption(SEMESTER_OPTIONS, "All semesters");

  const [activeSection, setActiveSection] = useState("exam_micro");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [result, setResult] = useState({
    items: [],
    categoryGroups: {},
    notesItems: [],
    upcomingItems: [],
    pagination: null,
  });
  const [services, setServices] = useState([]);
  const [isListingLoading, setIsListingLoading] = useState(true);
  const [isServiceLoading, setIsServiceLoading] = useState(true);
  const [listingError, setListingError] = useState("");
  const [serviceError, setServiceError] = useState("");
  const effectiveListingFilters =
    activeSection === "exam_micro"
      ? filters
      : {
          ...DEFAULT_FILTERS,
          search: filters.search,
        };

  useEffect(() => {
    let active = true;

    async function loadListings() {
      setIsListingLoading(true);
      setListingError("");

      try {
        const response = await fetchPublicListings(effectiveListingFilters);
        if (active) {
          setResult(response.data);
        }
      } catch (requestError) {
        if (active) {
          setListingError(requestError.message || "Unable to load marketplace listings.");
        }
      } finally {
        if (active) {
          setIsListingLoading(false);
        }
      }
    }

    loadListings();

    return () => {
      active = false;
    };
  }, [
    activeSection,
    filters.branch,
    filters.search,
    filters.semester,
    filters.sort,
    filters.subject,
    filters.university,
    filters.year,
  ]);

  useEffect(() => {
    let active = true;

    async function loadServices() {
      setIsServiceLoading(true);
      setServiceError("");

      try {
        const response = await fetchPublicServices({ search: filters.search });
        if (active) {
          setServices(response.data.items || []);
        }
      } catch (requestError) {
        if (active) {
          setServiceError(requestError.message || "Unable to load website services.");
        }
      } finally {
        if (active) {
          setIsServiceLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      active = false;
    };
  }, [filters.search]);

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
  const categoryGroups = result.categoryGroups || {};
  const semesterExamItems = categoryGroups.semesterExam || [];
  const ciaExamItems = categoryGroups.ciaExam || [];
  const notesItems = result.notesItems || [];
  const serviceSections = SERVICE_CATEGORY_OPTIONS
    .map((option) => ({
      ...option,
      items: services.filter((item) => item.category === option.value),
    }))
    .filter((section) => section.items.length > 0);
  const examCount = semesterExamItems.length + ciaExamItems.length;
  const hasExamItems = examCount > 0;
  const hasNoteItems = notesItems.length > 0;
  const hasServiceItems = services.length > 0;
  const hasActiveFilters = Object.entries(filters).some(([key, value]) =>
    key === "sort" ? value !== DEFAULT_FILTERS.sort : Boolean(value),
  );
  const activeCopy = SECTION_COPY[activeSection];
  const showAcademicFilters = activeSection === "exam_micro";
  const activeSectionCount =
    activeSection === "exam_micro" ? examCount : activeSection === "notes" ? notesItems.length : services.length;
  const showResetButton = activeSection === "exam_micro" && hasActiveFilters;
  const toolbarNote =
    activeSection === "notes"
      ? "Notes tab uses only the search bar. Academic filters are reserved for the micro download section."
      : "Services tab uses only the search bar. Academic filters are reserved for the micro download section.";

  const sliderTabs = MARKETPLACE_SECTION_TABS.map((tab) => ({
    ...tab,
    count:
      tab.value === "exam_micro"
        ? examCount
        : tab.value === "notes"
          ? notesItems.length
          : services.length,
  }));

  const seoPayload = buildSeoPayload({
    title: "Marketplace",
    description: "Browse exam PDFs, notes, and ready-made website services on ExamNova AI.",
    pathname: "/marketplace",
    jsonLd: [
      buildCollectionSchema({
        title: "Marketplace",
        description: "Public marketplace for exam PDFs, notes, and ready-made website services.",
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
        <article className="detail-card marketplace-section-slider-shell">
          <div
            aria-label="Marketplace sections"
            className="marketplace-section-slider"
            role="tablist"
          >
            {sliderTabs.map((tab) => (
              <button
                aria-selected={activeSection === tab.value}
                className={`marketplace-section-tab${activeSection === tab.value ? " active" : ""}`}
                key={tab.value}
                onClick={() => setActiveSection(tab.value)}
                role="tab"
                type="button"
              >
                <span className="marketplace-section-tab-icon" aria-hidden="true">
                  <i className={`bi ${tab.icon}`} />
                </span>
                <span className="marketplace-section-tab-copy">
                  <strong>{tab.label}</strong>
                  <small>{tab.description}</small>
                </span>
                <span className="marketplace-section-tab-count">{tab.count}</span>
              </button>
            ))}
          </div>
        </article>

        <div className="simple-marketplace-header compact">
          <p className="eyebrow">{activeCopy.eyebrow}</p>
          <h1>{activeCopy.title}</h1>
          <p className="support-copy">{activeCopy.description}</p>
        </div>

        <form className={`detail-card simple-marketplace-toolbar${activeSection === "services" ? " service-mode" : ""}`} onSubmit={(event) => event.preventDefault()}>
          <div className="simple-marketplace-toolbar-head compact">
            <div>
              <p className="eyebrow">{activeCopy.toolbarEyebrow}</p>
              <h2>
                {activeSectionCount} items ready
              </h2>
            </div>
          </div>

          <label className="simple-marketplace-search-field">
            <span className="visually-hidden">Search marketplace</span>
            <div className="simple-marketplace-search-input">
              <i className="bi bi-search" />
              <input
                className="input"
                onChange={(event) => handleFilterChange("search", event.target.value)}
                placeholder={activeCopy.searchPlaceholder}
                type="search"
                value={filters.search}
              />
            </div>
          </label>

          {showAcademicFilters ? (
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
                <i className="bi bi-diagram-3" />
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

              {showResetButton ? (
                <button className="simple-mini-filter action" onClick={handleResetFilters} type="button">
                  <i className="bi bi-arrow-counterclockwise" />
                  <span>Reset</span>
                </button>
              ) : null}
            </div>
          ) : (
            <div className="marketplace-section-inline-note">
              <i className="bi bi-info-circle" />
              <span>{toolbarNote}</span>
            </div>
          )}
        </form>

        {activeSection === "exam_micro" ? (
          <section className="stack-section">
            <SectionHeader
              eyebrow="Exams Micro Download"
              title="Current exam PDF sections"
              description={`Semester exam and CIA exam cards stay separate here. Each exam category can surface up to ${MARKETPLACE_CATEGORY_LIMIT} live PDFs.`}
            />

            {listingError ? <p className="form-error">{listingError}</p> : null}
            {isListingLoading ? (
              <section className="stack-section">
                <MarketplaceSectionLoading
                  eyebrow="Semester Exam"
                  title="Current semester exam PDFs"
                  description={`Live mode section for semester exams. Showing up to ${MARKETPLACE_CATEGORY_LIMIT} PDFs.`}
                  count={3}
                />
                <MarketplaceSectionLoading
                  eyebrow="CIA Exam"
                  title="Current CIA exam PDFs"
                  description={`Live mode section for CIA exams. Showing up to ${MARKETPLACE_CATEGORY_LIMIT} PDFs.`}
                  count={3}
                />
              </section>
            ) : null}

            {!isListingLoading && !listingError && hasExamItems ? (
              <section className="stack-section">
                {semesterExamItems.length ? (
                  <section className="stack-section">
                    <SectionHeader
                      eyebrow="Semester Exam"
                      title="Current semester exam PDFs"
                      description={`Live mode section for semester exams. Showing up to ${MARKETPLACE_CATEGORY_LIMIT} PDFs.`}
                    />
                    <div className="marketplace-grid simple-marketplace-grid">
                      {semesterExamItems.map((listing) => (
                        <MarketplaceListingCard key={listing.id} listing={listing} />
                      ))}
                    </div>
                  </section>
                ) : null}

                {ciaExamItems.length ? (
                  <section className="stack-section">
                    <SectionHeader
                      eyebrow="CIA Exam"
                      title="Current CIA exam PDFs"
                      description={`Live mode section for CIA exams. Showing up to ${MARKETPLACE_CATEGORY_LIMIT} PDFs.`}
                    />
                    <div className="marketplace-grid simple-marketplace-grid">
                      {ciaExamItems.map((listing) => (
                        <MarketplaceListingCard key={listing.id} listing={listing} />
                      ))}
                    </div>
                  </section>
                ) : null}
              </section>
            ) : null}

            {!isListingLoading && !listingError && !hasExamItems ? (
              <EmptyStateCard
                title="No exam micro PDFs found"
                description={
                  hasActiveFilters
                    ? "Try clearing a few academic filters to see more semester and CIA exam PDFs."
                    : "Published semester and CIA exam PDFs will appear here as soon as admin uploads them."
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
        ) : null}

        {activeSection === "notes" ? (
          <section className="stack-section">
            <SectionHeader
              eyebrow="Notes Download"
              title="Browse notes and study materials"
              description="Notes, generated answer PDFs, and other non-exam marketplace content stay together in this section."
            />

            {listingError ? <p className="form-error">{listingError}</p> : null}
            {isListingLoading ? <CardPlaceholderGrid count={6} variant="marketplace" /> : null}

            {!isListingLoading && !listingError && hasNoteItems ? (
              <div className="marketplace-grid simple-marketplace-grid">
                {notesItems.map((listing) => (
                  <MarketplaceListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : null}

            {!isListingLoading && !listingError && !hasNoteItems ? (
              <EmptyStateCard
                title="No notes match these filters yet"
                description={
                  hasActiveFilters
                    ? "Try widening your search or clearing branch, year, and semester filters."
                    : "Published notes will appear here as soon as they are available."
                }
              />
            ) : null}

            {!isListingLoading && !listingError && upcomingCount ? (
              <section className="stack-section">
                <SectionHeader
                  eyebrow="Upcoming PDFs"
                  title="Scheduled releases"
                  description="These PDFs are already listed and will unlock automatically when their go-live time arrives."
                />
                <div className="marketplace-grid simple-marketplace-grid">
                  {result.upcomingItems.map((listing) => (
                    <MarketplaceListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        ) : null}

        {activeSection === "services" ? (
          <section className="stack-section">
            <SectionHeader
              eyebrow="Services"
              title="Buy ready-made websites and digital setups"
              description="Portfolio websites, commercial business sites, product showcase templates, and more are available here with ZIP delivery after purchase."
            />

            {serviceError ? <p className="form-error">{serviceError}</p> : null}
            {isServiceLoading ? (
              <section className="stack-section">
                {SERVICE_CATEGORY_OPTIONS.slice(0, 2).map((section) => (
                  <MarketplaceSectionLoading
                    eyebrow="Service category"
                    title={section.label}
                    description={SERVICE_SECTION_DESCRIPTIONS[section.value]}
                    count={3}
                    key={section.value}
                    variant="service"
                  />
                ))}
              </section>
            ) : null}

            {!isServiceLoading && !serviceError && hasServiceItems ? (
              <section className="stack-section">
                {serviceSections.map((section) => (
                  <section className="stack-section" key={section.value}>
                    <SectionHeader
                      eyebrow="Service category"
                      title={section.label}
                      description={SERVICE_SECTION_DESCRIPTIONS[section.value]}
                    />
                    <div className="marketplace-grid simple-marketplace-grid">
                      {section.items.map((service) => (
                        <ServiceListingCard key={service.id} service={service} />
                      ))}
                    </div>
                  </section>
                ))}
              </section>
            ) : null}

            {!isServiceLoading && !serviceError && !hasServiceItems ? (
              <EmptyStateCard
                title="No website services found"
                description={
                  filters.search
                    ? "Try a shorter search keyword to browse more website service cards."
                    : "Admin-created website service cards will appear here after they are published."
                }
              />
            ) : null}
          </section>
        ) : null}
      </section>
    </>
  );
}
