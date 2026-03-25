import { MARKETPLACE_PRICE_RANGE } from "../../features/marketplace/marketplace.constants.js";
import {
  BRANCH_OPTIONS,
  DEFAULT_UNIVERSITY,
  DIFFICULTY_LEVEL_OPTIONS,
  EXAM_FOCUS_OPTIONS,
  INTENDED_AUDIENCE_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  SEMESTER_OPTIONS,
  YEAR_OPTIONS,
} from "../../features/academic/academicTaxonomy.js";

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
      </div>

      <label className="field">
        <span>Description</span>
        <textarea className="input textarea" onChange={(event) => onChange("description", event.target.value)} placeholder="Tell buyers what they will get, which exam it helps with, and why it is useful." value={form.description} />
      </label>

      <div className="two-column-grid compact">
        <label className="field">
          <span>University</span>
          <select className="input" onChange={(event) => onChange("university", event.target.value)} value={form.university} required>
            <option value={DEFAULT_UNIVERSITY}>{DEFAULT_UNIVERSITY}</option>
          </select>
        </label>
        <label className="field">
          <span>Branch</span>
          <select className="input" onChange={(event) => onChange("branch", event.target.value)} value={form.branch} required>
            <option value="">Select branch</option>
            {BRANCH_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Year</span>
          <select className="input" onChange={(event) => onChange("year", event.target.value)} value={form.year} required>
            <option value="">Select year</option>
            {YEAR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Semester</span>
          <select className="input" onChange={(event) => onChange("semester", event.target.value)} value={form.semester} required>
            <option value="">Select semester</option>
            {SEMESTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Semester {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="two-column-grid compact">
        <label className="field">
          <span>Subject</span>
          <input className="input" onChange={(event) => onChange("subject", event.target.value)} placeholder="Example: Operating Systems" required value={form.subject} />
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

      <div className="two-column-grid compact">
        <label className="field">
          <span>Exam focus</span>
          <select className="input" onChange={(event) => onChange("examFocus", event.target.value)} value={form.examFocus}>
            <option value="">Select exam focus</option>
            {EXAM_FOCUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Question type</span>
          <select className="input" onChange={(event) => onChange("questionType", event.target.value)} value={form.questionType}>
            <option value="">Select question type</option>
            {QUESTION_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Difficulty level</span>
          <select className="input" onChange={(event) => onChange("difficultyLevel", event.target.value)} value={form.difficultyLevel}>
            <option value="">Select difficulty</option>
            {DIFFICULTY_LEVEL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Intended audience</span>
          <select className="input" onChange={(event) => onChange("intendedAudience", event.target.value)} value={form.intendedAudience}>
            <option value="">Select intended audience</option>
            {INTENDED_AUDIENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Tags</span>
        <input
          className="input"
          onChange={(event) => onChange("tags", event.target.value)}
          placeholder="os, unit 3, revision, viva"
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
