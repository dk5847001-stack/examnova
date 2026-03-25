import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { InternalLinkGrid } from "../../components/ui/InternalLinkGrid.jsx";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { StatCard } from "../../components/ui/StatCard.jsx";
import { UpcomingLockedCard } from "../../components/ui/UpcomingLockedCard.jsx";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { fetchSeoDiscoveryIndex, fetchUpcomingLockedPdfs } from "../../services/api/index.js";
import { buildBreadcrumbSchema, buildCollectionSchema, buildOrganizationSchema, buildSeoPayload } from "../../utils/seo.js";

export function HomePage() {
  const [upcomingItems, setUpcomingItems] = useState([]);
  const [discoveryIndex, setDiscoveryIndex] = useState(null);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadUpcoming() {
      try {
        const response = await fetchUpcomingLockedPdfs({});
        if (active) {
          setUpcomingItems(response.data.items.slice(0, 3));
        }
      } catch {
        if (active) {
          setUpcomingItems([]);
        }
      } finally {
        if (active) {
          setIsLoadingUpcoming(false);
        }
      }
    }

    loadUpcoming();

    return () => {
      active = false;
    };
  }, []);

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

  const seoPayload = buildSeoPayload({
    title: "Premium Exam Prep Platform",
    description:
      "Generate compact exam-ready answer PDFs, discover university and subject-based study content, and explore structured public exam-preparation landing pages.",
    pathname: "/",
    jsonLd: [
      buildOrganizationSchema(),
      buildCollectionSchema({
        title: "ExamNova AI Home",
        description:
          "Public entry point for compact exam-ready PDFs, subject collections, university landing pages, and semester-linked exam preparation content.",
        pathname: "/",
      }),
      buildBreadcrumbSchema([{ label: "Home", href: "/" }]),
    ],
  });

  return (
    <>
      <SeoHead {...seoPayload} />
      <PageHero
        eyebrow="Premium exam-tech"
        title="From raw study material to compact exam-ready PDFs."
        description="ExamNova AI is built for structured uploads, AI-assisted answer generation, clean PDF output, and a search-friendly PDF marketplace."
        metrics={[
          { label: "Private unlock", value: `Rs. ${import.meta.env.VITE_PRIVATE_PDF_PRICE || 4}` },
          { label: "Marketplace", value: "Rs. 4 to Rs. 10" },
          { label: "Seller share", value: "70%" },
        ]}
        actions={
          <>
            <Link className="button primary" to="/signup">
              <i className="bi bi-rocket-takeoff" />
              Create account
            </Link>
            <Link className="button secondary" to="/marketplace">
              <i className="bi bi-grid-1x2" />
              Explore marketplace
            </Link>
            <Link className="button ghost" to="/upcoming">
              <i className="bi bi-hourglass-split" />
              View upcoming locks
            </Link>
          </>
        }
      />

      <section className="card-grid">
        <StatCard label="Private PDF unlock" value={`Rs. ${import.meta.env.VITE_PRIVATE_PDF_PRICE || 4}`} />
        <StatCard label="Marketplace pricing" value="Rs. 4 to Rs. 10" />
        <StatCard label="Seller share" value="70%" />
      </section>

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

      <section className="stack-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Upcoming semester drops</p>
            <h2>Locked content students can discover before release</h2>
            <p className="support-copy">
              Admin-curated current-semester PDFs can now appear in public discovery before they are unlocked for purchase.
            </p>
          </div>
          <Link className="button secondary" to="/upcoming">
            Browse all upcoming PDFs
          </Link>
        </div>

        {isLoadingUpcoming ? (
          <LoadingCard message="Loading upcoming locked PDFs..." />
        ) : upcomingItems.length ? (
          <div className="marketplace-grid">
            {upcomingItems.map((item) => (
              <UpcomingLockedCard item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <EmptyStateCard
            title="No locked releases published yet"
            description="As admins queue new semester-relevant PDFs, locked previews will appear here."
          />
        )}
      </section>
    </>
  );
}
