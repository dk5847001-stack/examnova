import {
  BRANCH_OPTIONS,
  DEFAULT_UNIVERSITY,
  SEMESTER_OPTIONS,
  UNIVERSITY_OPTIONS,
  YEAR_OPTIONS,
} from "../../features/academic/academicTaxonomy.js";

function formatClassName(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function AcademicTaxonomyFieldset({
  values,
  onChange,
  className = "",
  eyebrow = "Controlled taxonomy",
  title = "Academic classification",
  description = "Every marketplace PDF uses the same Sandip University structure so students can filter quickly without confusing category names.",
  helperNote = "University, branch, year, and semester are locked to approved options only. Subject stays editable so each listing can describe the exact paper or topic.",
  subjectLabel = "Subject",
  subjectPlaceholder = "Example: Operating Systems",
}) {
  return (
    <section className={formatClassName("guided-fieldset", className)}>
      <div className="guided-fieldset-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
          <p className="support-copy">{description}</p>
        </div>
        <div className="guided-pill-row">
          <span className="guided-pill">Sandip only</span>
          <span className="guided-pill">{BRANCH_OPTIONS.length} branches</span>
          <span className="guided-pill">Sem 1 to 8</span>
        </div>
      </div>

      <p className="guided-fieldset-note">
        <i className="bi bi-shield-check" />
        <span>{helperNote}</span>
      </p>

      <div className="two-column-grid compact">
        <label className="field">
          <span>University</span>
          <select className="input" onChange={(event) => onChange("university", event.target.value)} required value={values.university || DEFAULT_UNIVERSITY}>
            {UNIVERSITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Branch</span>
          <select className="input" onChange={(event) => onChange("branch", event.target.value)} required value={values.branch || ""}>
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
          <select className="input" onChange={(event) => onChange("year", event.target.value)} required value={values.year || ""}>
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
          <select className="input" onChange={(event) => onChange("semester", event.target.value)} required value={values.semester || ""}>
            <option value="">Select semester</option>
            {SEMESTER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Semester {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>{subjectLabel}</span>
        <input
          className="input"
          onChange={(event) => onChange("subject", event.target.value)}
          placeholder={subjectPlaceholder}
          required
          value={values.subject || ""}
        />
      </label>
    </section>
  );
}
