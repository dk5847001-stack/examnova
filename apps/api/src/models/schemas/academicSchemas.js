import mongoose from "mongoose";
import {
  BRANCH_OPTIONS,
  DEFAULT_UNIVERSITY,
  DIFFICULTY_LEVEL_OPTIONS,
  EXAM_FOCUS_OPTIONS,
  INTENDED_AUDIENCE_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  SEMESTER_OPTIONS,
  UNIVERSITY_OPTIONS,
  YEAR_OPTIONS,
} from "../../../../../packages/shared/src/academicTaxonomy.js";

const OPTIONAL_EXAM_FOCUS_OPTIONS = ["", ...EXAM_FOCUS_OPTIONS];
const OPTIONAL_QUESTION_TYPE_OPTIONS = ["", ...QUESTION_TYPE_OPTIONS];
const OPTIONAL_DIFFICULTY_LEVEL_OPTIONS = ["", ...DIFFICULTY_LEVEL_OPTIONS];
const OPTIONAL_INTENDED_AUDIENCE_OPTIONS = ["", ...INTENDED_AUDIENCE_OPTIONS];
const OPTIONAL_UNIVERSITY_OPTIONS = ["", ...UNIVERSITY_OPTIONS];
const OPTIONAL_BRANCH_OPTIONS = ["", ...BRANCH_OPTIONS];
const OPTIONAL_YEAR_OPTIONS = ["", ...YEAR_OPTIONS];
const OPTIONAL_SEMESTER_OPTIONS = ["", ...SEMESTER_OPTIONS];

export const requiredAcademicTaxonomySchema = new mongoose.Schema(
  {
    university: {
      type: String,
      required: true,
      trim: true,
      index: true,
      enum: UNIVERSITY_OPTIONS,
      default: DEFAULT_UNIVERSITY,
    },
    branch: { type: String, required: true, trim: true, index: true, enum: BRANCH_OPTIONS },
    year: { type: String, required: true, trim: true, enum: YEAR_OPTIONS },
    semester: { type: String, required: true, trim: true, index: true, enum: SEMESTER_OPTIONS },
    subject: { type: String, required: true, trim: true, index: true },
  },
  { _id: false },
);

export const optionalAcademicTaxonomySchema = new mongoose.Schema(
  {
    university: {
      type: String,
      default: "",
      trim: true,
      index: true,
      enum: OPTIONAL_UNIVERSITY_OPTIONS,
    },
    branch: { type: String, default: "", trim: true, index: true, enum: OPTIONAL_BRANCH_OPTIONS },
    year: { type: String, default: "", trim: true, enum: OPTIONAL_YEAR_OPTIONS },
    semester: { type: String, default: "", trim: true, index: true, enum: OPTIONAL_SEMESTER_OPTIONS },
    subject: { type: String, default: "", trim: true, index: true },
  },
  { _id: false },
);

export const studyMetadataSchema = new mongoose.Schema(
  {
    examFocus: { type: String, default: "", trim: true, enum: OPTIONAL_EXAM_FOCUS_OPTIONS },
    questionType: { type: String, default: "", trim: true, enum: OPTIONAL_QUESTION_TYPE_OPTIONS },
    difficultyLevel: {
      type: String,
      default: "",
      trim: true,
      enum: OPTIONAL_DIFFICULTY_LEVEL_OPTIONS,
    },
    intendedAudience: {
      type: String,
      default: "",
      trim: true,
      enum: OPTIONAL_INTENDED_AUDIENCE_OPTIONS,
    },
    tags: { type: [String], default: [] },
  },
  { _id: false },
);
