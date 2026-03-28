export const MARKETPLACE_PRICE_RANGE = {
  min: Number(import.meta.env.VITE_MARKETPLACE_MIN_PRICE || 4),
  max: Number(import.meta.env.VITE_MARKETPLACE_MAX_PRICE || 10),
};

export const MARKETPLACE_CATEGORY_LIMIT = 5;
export const MARKETPLACE_CATEGORY_OPTIONS = [
  { value: "semester_exam", label: "Semester Exam" },
  { value: "cia_exam", label: "CIA Exam" },
];

export const MARKETPLACE_CATEGORY_LABELS = {
  semester_exam: "Semester Exam",
  cia_exam: "CIA Exam",
};

export const MARKETPLACE_COVER_SEAL_OPTIONS = [
  { value: "", label: "No seal" },
  { value: "new", label: "New" },
  { value: "premium", label: "Premium" },
  { value: "popular", label: "Popular" },
  { value: "updated", label: "Updated" },
];

export const MARKETPLACE_COVER_SEAL_LABELS = {
  new: "New",
  premium: "Premium",
  popular: "Popular",
  updated: "Updated",
};

export function getMarketplaceCategoryLabel(category) {
  return MARKETPLACE_CATEGORY_LABELS[category] || "";
}
