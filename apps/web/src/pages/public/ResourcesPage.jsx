import { Link } from "react-router-dom";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { buildBreadcrumbSchema, buildCollectionSchema, buildSeoPayload } from "../../utils/seo.js";

const resourceGroups = [
  {
    title: "University landing pages",
    description: "Browse public PDFs and exam-preparation material by university-specific context.",
    href: "/marketplace",
  },
  {
    title: "Subject preparation pages",
    description: "Discover subject-linked PDFs, internal links, and upcoming content for exam revision.",
    href: "/marketplace",
  },
  {
    title: "Upcoming locked releases",
    description: "Track current-semester content that is visible now and unlocking later.",
    href: "/upcoming",
  },
];

export function ResourcesPage() {
  const seoPayload = buildSeoPayload({
    title: "Study Resources",
    description: "Explore public study resources, exam-preparation collections, and academic discovery routes on ExamNova AI.",
    pathname: "/resources",
    jsonLd: [
      buildCollectionSchema({
        title: "Study Resources",
        description: "Public study resources and internal discovery routes on ExamNova AI.",
        pathname: "/resources",
      }),
      buildBreadcrumbSchema([
        { label: "Home", href: "/" },
        { label: "Resources", href: "/resources" },
      ]),
    ],
  });

  return (
    <>
      <SeoHead {...seoPayload} />
      <PageHero
        eyebrow="Study resources"
        title="Public discovery routes for exam preparation"
        description="Use these public entry points to explore semester, subject, and university-based exam resources with strong internal linking."
        metrics={[
          { label: "Routes", value: "Linked" },
          { label: "Discovery", value: "Structured" },
          { label: "Depth", value: "Search Ready" },
        ]}
      />
      <section className="card-grid">
        {resourceGroups.map((item) => (
          <article className="detail-card" key={item.title}>
            <h2>{item.title}</h2>
            <p className="support-copy">{item.description}</p>
            <div className="hero-actions">
              <Link className="button secondary" to={item.href}>
                Open resource
              </Link>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
