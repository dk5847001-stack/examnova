export const UNIVERSITY_OPTIONS = ["SANDIP UNIVERSITY"];

export const BRANCH_OPTIONS = ["B.Tech", "BCA", "BBA", "MBA", "Other"];

export const YEAR_OPTIONS = ["2024", "2025", "2026", "2027", "2028"];

export const SEMESTER_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export const EXAM_FOCUS_OPTIONS = [
  "Important questions",
  "Unit-wise prep",
  "Previous papers",
  "Quick revision",
  "Full syllabus",
];

export const QUESTION_TYPE_OPTIONS = [
  "Mixed",
  "Short answer",
  "Long answer",
  "MCQ",
  "Theory",
  "Practical",
];

export const DIFFICULTY_LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];

export const INTENDED_AUDIENCE_OPTIONS = [
  "First-time learner",
  "Exam revision",
  "Last-minute prep",
  "Top scorer prep",
  "Backlog recovery",
];

export const DEFAULT_UNIVERSITY = UNIVERSITY_OPTIONS[0];

export const CONTROLLED_ACADEMIC_OPTIONS = {
  university: UNIVERSITY_OPTIONS,
  branch: BRANCH_OPTIONS,
  year: YEAR_OPTIONS,
  semester: SEMESTER_OPTIONS,
};

export const STUDY_METADATA_OPTIONS = {
  examFocus: EXAM_FOCUS_OPTIONS,
  questionType: QUESTION_TYPE_OPTIONS,
  difficultyLevel: DIFFICULTY_LEVEL_OPTIONS,
  intendedAudience: INTENDED_AUDIENCE_OPTIONS,
};

export function findCanonicalOption(value, options = []) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  return options.find((option) => option.toLowerCase() === normalized) || "";
}
