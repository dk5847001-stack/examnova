import { SeoHead } from "../../seo/SeoHead.jsx";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { buildBreadcrumbSchema, buildFaqSchema, buildSeoPayload } from "../../utils/seo.js";

const faqItems = [
  {
    question: "What kind of PDFs are available on ExamNova AI?",
    answer: "ExamNova AI focuses on compact exam-preparation PDFs, important-question packs, and structured revision material across universities, branches, semesters, and subjects.",
  },
  {
    question: "Are marketplace PDFs organized by academic category?",
    answer: "Yes. Public PDFs are categorized by university, branch, year, semester, and subject so students can discover relevant content quickly.",
  },
  {
    question: "Can upcoming locked PDFs be viewed before release?",
    answer: "Yes. Upcoming locked PDFs are publicly visible for discovery, but they remain unavailable for purchase or download until the admin publishes them.",
  },
];

export function FaqPage() {
  const seoPayload = buildSeoPayload({
    title: "FAQ",
    description: "Frequently asked questions about ExamNova AI, public PDFs, exam preparation routes, and content discovery.",
    pathname: "/faq",
    jsonLd: [
      buildFaqSchema(faqItems),
      buildBreadcrumbSchema([
        { label: "Home", href: "/" },
        { label: "FAQ", href: "/faq" },
      ]),
    ],
  });

  return (
    <>
      <SeoHead {...seoPayload} />
      <PageHero
        eyebrow="Support content"
        title="Frequently asked questions"
        description="Answers about public PDF discovery, academic categorization, locked releases, and how ExamNova AI organizes exam-preparation content."
        metrics={[
          { label: "Clarity", value: "Instant" },
          { label: "Coverage", value: "Public Routes" },
          { label: "Signals", value: "Release Aware" },
        ]}
      />
      <section className="stack-section">
        {faqItems.map((item) => (
          <article className="detail-card" key={item.question}>
            <h2>{item.question}</h2>
            <p className="support-copy">{item.answer}</p>
          </article>
        ))}
      </section>
    </>
  );
}
