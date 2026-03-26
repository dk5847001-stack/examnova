import {
  DIFFICULTY_LEVEL_OPTIONS,
  EXAM_FOCUS_OPTIONS,
  INTENDED_AUDIENCE_OPTIONS,
  QUESTION_TYPE_OPTIONS,
} from "../../features/academic/academicTaxonomy.js";

function formatClassName(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function StudyMetadataFieldset({
  values,
  onChange,
  className = "",
  eyebrow = "Buyer context",
  title = "Study positioning",
  description = "Optional metadata helps buyers understand whether the PDF is for revision, previous questions, theory practice, or fast exam prep.",
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
          <span className="guided-pill subtle">Optional</span>
          <span className="guided-pill subtle">Improves discovery</span>
        </div>
      </div>

      <div className="two-column-grid compact">
        <label className="field">
          <span>Exam focus</span>
          <select className="input" onChange={(event) => onChange("examFocus", event.target.value)} value={values.examFocus || ""}>
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
          <select className="input" onChange={(event) => onChange("questionType", event.target.value)} value={values.questionType || ""}>
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
          <select className="input" onChange={(event) => onChange("difficultyLevel", event.target.value)} value={values.difficultyLevel || ""}>
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
          <select className="input" onChange={(event) => onChange("intendedAudience", event.target.value)} value={values.intendedAudience || ""}>
            <option value="">Select intended audience</option>
            {INTENDED_AUDIENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
