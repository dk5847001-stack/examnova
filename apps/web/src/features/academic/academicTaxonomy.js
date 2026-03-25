export {
  BRANCH_OPTIONS,
  CONTROLLED_ACADEMIC_OPTIONS,
  DEFAULT_UNIVERSITY,
  DIFFICULTY_LEVEL_OPTIONS,
  EXAM_FOCUS_OPTIONS,
  INTENDED_AUDIENCE_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  SEMESTER_OPTIONS,
  STUDY_METADATA_OPTIONS,
  UNIVERSITY_OPTIONS,
  YEAR_OPTIONS,
} from "../../../../../packages/shared/src/academicTaxonomy.js";

export function withAllOption(options, label = "All") {
  return [{ label, value: "" }, ...options.map((option) => ({ label: option, value: option }))];
}
