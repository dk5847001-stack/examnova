import { MARKETPLACE_PRICE_RANGE } from "../../features/marketplace/marketplace.constants.js";
import {
  DEFAULT_UNIVERSITY,
} from "../../features/academic/academicTaxonomy.js";
import { AcademicTaxonomyFieldset } from "./AcademicTaxonomyFieldset.jsx";
import { StudyMetadataFieldset } from "./StudyMetadataFieldset.jsx";

function createBlankMarketplaceForm() {
  return {
    generatedPdfId: "",
    title: "",
    description: "",
    priceInr: MARKETPLACE_PRICE_RANGE.min,
    university: DEFAULT_UNIVERSITY,
    branch: "",
    year: "",
    semester: "",
    subject: "",
    examFocus: "",
    questionType: "",
    difficultyLevel: "",
    intendedAudience: "",
    tags: "",
    visibility: "draft",
  };
}

export function createInitialMarketplaceForm(listing = null) {
  if (!listing) {
    return createBlankMarketplaceForm();
  }

  return {
    generatedPdfId: listing.sourcePdfId || "",
    title: listing.title || "",
    description: listing.description || "",
    priceInr: listing.priceInr || MARKETPLACE_PRICE_RANGE.min,
    university: listing.taxonomy?.university || DEFAULT_UNIVERSITY,
    branch: listing.taxonomy?.branch || "",
    year: listing.taxonomy?.year || "",
    semester: listing.taxonomy?.semester || "",
    subject: listing.taxonomy?.subject || "",
    examFocus: listing.studyMetadata?.examFocus || "",
    questionType: listing.studyMetadata?.questionType || "",
    difficultyLevel: listing.studyMetadata?.difficultyLevel || "",
    intendedAudience: listing.studyMetadata?.intendedAudience || "",
    tags: (listing.tags || []).join(", "),
    visibility: listing.visibility || "draft",
  };
}

export function MarketplaceListingForm({
  eligiblePdfs,
  form,
  isSubmitting,
  onChange,
  onSubmit,
  submitLabel,
  isEditing = false,
}) {
  const selectedEligiblePdf = eligiblePdfs.find((item) => item.id === form.generatedPdfId);
  const hasEligiblePdfs = eligiblePdfs.length > 0;
  const submitDisabled = isSubmitting || (!isEditing && !hasEligiblePdfs);

  return (
    <form className="detail-card marketplace-form" onSubmit={onSubmit}>
      <div className="section-header">
        <div>
          <p className="eyebrow">{isEditing ? "Edit listing" : "Create listing"}</p>
          <h3>{isEditing ? "Update marketplace metadata" : "Publish a marketplace-ready PDF"}</h3>
          <p className="support-copy">
            Choose a finished generated PDF, classify it with the controlled Sandip University taxonomy, and add buyer-facing details that make the listing easy to understand.
          </p>
        </div>
      </div>

      <article className="guided-inline-card">
        <div className="guided-inline-card-copy">
          <strong>{isEditing ? "This listing is already linked to its source PDF." : "Listings start from a completed generated PDF."}</strong>
          <p className="support-copy">
            {isEditing
              ? "You can update buyer-facing details and academic classification here, but the original generated PDF source stays locked."
              : "Pick a finalized generated PDF and ExamNova will prefill the academic taxonomy from its source document so your public listing stays clean and searchable."}
          </p>
        </div>
        <div className="guided-pill-row">
          <span className="guided-pill">Controlled categories</span>
          <span className="guided-pill">Public-safe metadata</span>
        </div>
      </article>

      <label className="field">
        <span>Eligible generated PDF</span>
        <select
          className="input"
          disabled={isEditing}
          onChange={(event) => onChange("generatedPdfId", event.target.value)}
          required
          value={form.generatedPdfId}
        >
          <option value="">Select a generated PDF</option>
          {isEditing && form.generatedPdfId && !selectedEligiblePdf ? (
            <option value={form.generatedPdfId}>Current linked generated PDF</option>
          ) : null}
          {eligiblePdfs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.suggestedListingTitle || item.title} - {item.taxonomy?.subject || item.sourceDocumentTitle || "Academic PDF"} - {item.pageCount || 0} pages
            </option>
          ))}
        </select>
      </label>

      {!hasEligiblePdfs && !isEditing ? (
        <article className="guided-inline-card">
          <div className="guided-inline-card-copy">
            <strong>No finalized generated PDFs are ready to list yet.</strong>
            <p className="support-copy">
              Complete one PDF in Professional or Developer Mode first. Only finished generated PDFs can be published as marketplace listings.
            </p>
          </div>
        </article>
      ) : null}

      {selectedEligiblePdf ? (
        <article className="guided-source-preview">
          <div className="guided-source-preview-header">
            <div>
              <p className="eyebrow">Autofill source</p>
              <h3>{selectedEligiblePdf.sourceDocumentTitle || selectedEligiblePdf.title}</h3>
            </div>
            <div className="guided-pill-row">
              <span className="guided-pill">{selectedEligiblePdf.pageCount || 0} pages</span>
              <span className="guided-pill">{selectedEligiblePdf.questionCount || 0} questions</span>
            </div>
          </div>
          <div className="marketplace-taxonomy">
            {selectedEligiblePdf.taxonomy?.university ? <span>{selectedEligiblePdf.taxonomy.university}</span> : null}
            {selectedEligiblePdf.taxonomy?.branch ? <span>{selectedEligiblePdf.taxonomy.branch}</span> : null}
            {selectedEligiblePdf.taxonomy?.year ? <span>{selectedEligiblePdf.taxonomy.year}</span> : null}
            {selectedEligiblePdf.taxonomy?.semester ? <span>Semester {selectedEligiblePdf.taxonomy.semester}</span> : null}
            {selectedEligiblePdf.taxonomy?.subject ? <span>{selectedEligiblePdf.taxonomy.subject}</span> : null}
          </div>
          <p className="support-copy">
            ExamNova will prefill title suggestions and academic taxonomy from this source. You can still refine the buyer-facing title, description, price, and optional study tags below.
          </p>
        </article>
      ) : null}

      <div className="two-column-grid compact">
        <label className="field">
          <span>Title</span>
          <input className="input" onChange={(event) => onChange("title", event.target.value)} placeholder="Example: Operating Systems Unit 3 Important Questions" required value={form.title} />
        </label>
        <label className="field">
          <span>Price (Rs.)</span>
          <input
            className="input"
            max={MARKETPLACE_PRICE_RANGE.max}
            min={MARKETPLACE_PRICE_RANGE.min}
            onChange={(event) => onChange("priceInr", event.target.value)}
            step="1"
            type="number"
            value={form.priceInr}
            required
          />
        </label>
        <label className="field">
          <span>Visibility</span>
          <select className="input" onChange={(event) => onChange("visibility", event.target.value)} value={form.visibility}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="unlisted">Unlisted</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span>Description</span>
        <textarea className="input textarea" onChange={(event) => onChange("description", event.target.value)} placeholder="Tell buyers what they will get, which exam it helps with, and why it is useful." value={form.description} />
      </label>

      <AcademicTaxonomyFieldset
        description="These fields are the public marketplace filters students actually browse. Keeping them normalized makes your listing easier to find."
        onChange={onChange}
        values={form}
      />

      <StudyMetadataFieldset onChange={onChange} values={form} />

      <details className="guided-disclosure">
        <summary>Optional marketplace polish</summary>
        <div className="stack-section">
          <label className="field">
            <span>Tags</span>
            <input
              className="input"
              onChange={(event) => onChange("tags", event.target.value)}
              placeholder="os, unit 3, revision, viva"
              value={form.tags}
            />
          </label>
          <p className="support-copy">
            Use short comma-separated tags only when they genuinely help search clarity. Avoid repeating branch, semester, or university because those are already controlled above.
          </p>
        </div>
      </details>

      <div className="hero-actions">
        <button className="button primary" disabled={submitDisabled} type="submit">
          <i className={`bi ${isEditing ? "bi-pencil-square" : "bi-rocket-takeoff"}`} />
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
