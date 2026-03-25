import { MARKETPLACE_PRICE_RANGE } from "../../features/marketplace/marketplace.constants.js";

const initialFormState = {
  generatedPdfId: "",
  title: "",
  description: "",
  priceInr: MARKETPLACE_PRICE_RANGE.min,
  university: "",
  branch: "",
  year: "",
  semester: "",
  subject: "",
  tags: "",
  visibility: "draft",
};

export function createInitialMarketplaceForm(listing = null) {
  if (!listing) {
    return initialFormState;
  }

  return {
    generatedPdfId: listing.sourcePdfId || "",
    title: listing.title || "",
    description: listing.description || "",
    priceInr: listing.priceInr || MARKETPLACE_PRICE_RANGE.min,
    university: listing.taxonomy?.university || "",
    branch: listing.taxonomy?.branch || "",
    year: listing.taxonomy?.year || "",
    semester: listing.taxonomy?.semester || "",
    subject: listing.taxonomy?.subject || "",
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
  return (
    <form className="detail-card marketplace-form" onSubmit={onSubmit}>
      <div className="section-header">
        <div>
          <p className="eyebrow">{isEditing ? "Edit listing" : "Create listing"}</p>
          <h3>{isEditing ? "Update marketplace metadata" : "Publish a generated PDF"}</h3>
          <p className="support-copy">
            Choose an eligible generated PDF, add academic categorization, and set a price between Rs. {MARKETPLACE_PRICE_RANGE.min} and Rs. {MARKETPLACE_PRICE_RANGE.max}.
          </p>
        </div>
      </div>

      <label className="field">
        <span>Eligible generated PDF</span>
        <select
          className="input"
          disabled={isEditing}
          onChange={(event) => onChange("generatedPdfId", event.target.value)}
          value={form.generatedPdfId}
        >
          <option value="">Select a generated PDF</option>
          {eligiblePdfs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title} - {item.pageCount || 0} pages
            </option>
          ))}
        </select>
      </label>

      <div className="two-column-grid compact">
        <label className="field">
          <span>Title</span>
          <input className="input" onChange={(event) => onChange("title", event.target.value)} value={form.title} />
        </label>
        <label className="field">
          <span>Price</span>
          <input
            className="input"
            max={MARKETPLACE_PRICE_RANGE.max}
            min={MARKETPLACE_PRICE_RANGE.min}
            onChange={(event) => onChange("priceInr", event.target.value)}
            step="1"
            type="number"
            value={form.priceInr}
          />
        </label>
      </div>

      <label className="field">
        <span>Description</span>
        <textarea className="input textarea" onChange={(event) => onChange("description", event.target.value)} value={form.description} />
      </label>

      <div className="two-column-grid compact">
        <label className="field">
          <span>University</span>
          <input className="input" onChange={(event) => onChange("university", event.target.value)} value={form.university} />
        </label>
        <label className="field">
          <span>Branch</span>
          <input className="input" onChange={(event) => onChange("branch", event.target.value)} value={form.branch} />
        </label>
        <label className="field">
          <span>Year</span>
          <input className="input" onChange={(event) => onChange("year", event.target.value)} value={form.year} />
        </label>
        <label className="field">
          <span>Semester</span>
          <input className="input" onChange={(event) => onChange("semester", event.target.value)} value={form.semester} />
        </label>
      </div>

      <div className="two-column-grid compact">
        <label className="field">
          <span>Subject</span>
          <input className="input" onChange={(event) => onChange("subject", event.target.value)} value={form.subject} />
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
        <span>Tags</span>
        <input
          className="input"
          onChange={(event) => onChange("tags", event.target.value)}
          placeholder="os, unit 3, revision"
          value={form.tags}
        />
      </label>

      <div className="hero-actions">
        <button className="button primary" disabled={isSubmitting} type="submit">
          <i className={`bi ${isEditing ? "bi-pencil-square" : "bi-rocket-takeoff"}`} />
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
