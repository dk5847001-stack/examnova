import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "../../components/ui/PageHero.jsx";
import { DocumentCard } from "../../components/ui/DocumentCard.jsx";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
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
import { useAuth } from "../../hooks/useAuth.js";
import { archiveDocument, listDocuments, retryParsing, uploadDocument } from "../../services/api/index.js";

const initialUploadForm = {
  sourceCategory: "notes",
  university: DEFAULT_UNIVERSITY,
  branch: "",
  year: "",
  semester: "",
  subject: "",
  description: "",
  examFocus: "",
  questionType: "",
  difficultyLevel: "",
  intendedAudience: "",
  tags: "",
};

export function UploadGeneratePage() {
  const { accessToken } = useAuth();
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState(initialUploadForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const supportedTypes = ["PDF", "DOCX", "TXT"];

  useEffect(() => {
    let active = true;

    async function loadDocuments() {
      setIsLoading(true);
      try {
        const response = await listDocuments(accessToken);
        if (active) {
          setDocuments(response.data.documents);
        }
      } catch (error) {
        if (active) {
          setFeedback({ type: "error", message: error.message || "Unable to load uploaded documents." });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (accessToken) {
      loadDocuments();
    }

    return () => {
      active = false;
    };
  }, [accessToken]);

  async function handleUpload(event) {
    event.preventDefault();

    if (!selectedFile) {
      setFeedback({ type: "error", message: "Please select a document to upload." });
      return;
    }

    setFeedback({ type: "", message: "" });
    setIsUploading(true);

    try {
      const response = await uploadDocument(accessToken, {
        file: selectedFile,
        sourceCategory: form.sourceCategory,
        university: form.university,
        branch: form.branch,
        year: form.year,
        semester: form.semester,
        subject: form.subject,
        description: form.description,
        examFocus: form.examFocus,
        questionType: form.questionType,
        difficultyLevel: form.difficultyLevel,
        intendedAudience: form.intendedAudience,
        tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setDocuments((current) => [response.data.document, ...current]);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setForm((current) => ({
        ...current,
        subject: "",
        description: "",
        examFocus: "",
        questionType: "",
        difficultyLevel: "",
        intendedAudience: "",
        tags: "",
      }));
      setFeedback({ type: "success", message: "Document uploaded successfully. It has entered the parsing pipeline and will be ready for question detection next." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Upload failed." });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(documentId) {
    try {
      await archiveDocument(accessToken, documentId);
      setDocuments((current) => current.filter((document) => document.id !== documentId));
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to archive document." });
    }
  }

  async function handleRetry(documentId) {
    try {
      const response = await retryParsing(accessToken, documentId);
      setDocuments((current) =>
        current.map((document) => (document.id === documentId ? response.data.document : document)),
      );
      setFeedback({ type: "success", message: "Parsing retried successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to retry parsing." });
    }
  }

  return (
    <section className="stack-section">
      <PageHero
        eyebrow="Upload and generate"
        title="Turn raw study material into AI-ready parsed documents."
        description="Upload question banks, notes, assignments, and study material with clear academic context. ExamNova AI validates, stores, and parses each file so zero-knowledge users always know what happens next."
        metrics={[
          { label: "Formats", value: supportedTypes.join(" / ") },
          { label: "Pipeline", value: "Validated" },
          { label: "Output", value: "Question Ready" },
        ]}
        actions={
          <>
            <button className="button primary" onClick={() => fileInputRef.current?.click()} type="button">
              <i className="bi bi-cloud-arrow-up" />
              Choose document
            </button>
            <Link className="button secondary" to="/app/generated-pdfs">
              <i className="bi bi-file-earmark-pdf" />
              View generated PDFs
            </Link>
          </>
        }
      />

      <div className="two-column-grid">
        <form className="detail-card upload-form" onSubmit={handleUpload}>
          <SectionHeader
            eyebrow="Upload"
            title="Guided upload pipeline"
            description={`Supported file types: ${supportedTypes.join(", ")}. Add the correct academic context once so parsing, question detection, generation, and selling stay organized.`}
          />
          <label className="upload-dropzone">
            <input
              className="hidden-input"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
            />
            <strong>{selectedFile ? selectedFile.name : "Drag or choose a document"}</strong>
            <span className="support-copy">
              PDFs, DOCX files, and text documents are supported. Parsing status will be tracked after upload.
            </span>
          </label>
          <label className="field">
            <span>Document category</span>
            <select
              className="input"
              onChange={(event) => setForm((current) => ({ ...current, sourceCategory: event.target.value }))}
              value={form.sourceCategory}
              required
            >
              <option value="notes">Notes</option>
              <option value="assignment">Assignment</option>
              <option value="question_bank">Question bank</option>
              <option value="study_material">Study material</option>
            </select>
          </label>
          <div className="two-column-grid compact">
            <label className="field">
              <span>University</span>
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, university: event.target.value }))} value={form.university} required>
                <option value={DEFAULT_UNIVERSITY}>{DEFAULT_UNIVERSITY}</option>
              </select>
            </label>
            <label className="field">
              <span>Branch</span>
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))} value={form.branch} required>
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
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} value={form.year} required>
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
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, semester: event.target.value }))} value={form.semester} required>
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
              <input className="input" onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Example: Database Management Systems" required value={form.subject} />
            </label>
            <label className="field">
              <span>Tags</span>
              <input className="input" onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="unit 2, revision, short notes" value={form.tags} />
            </label>
          </div>
          <label className="field">
            <span>Description</span>
            <textarea className="input textarea" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Add a short note so you or your team can understand what this document is for later." value={form.description} />
          </label>
          <div className="two-column-grid compact">
            <label className="field">
              <span>Exam focus</span>
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, examFocus: event.target.value }))} value={form.examFocus}>
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
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, questionType: event.target.value }))} value={form.questionType}>
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
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, difficultyLevel: event.target.value }))} value={form.difficultyLevel}>
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
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, intendedAudience: event.target.value }))} value={form.intendedAudience}>
                <option value="">Select intended audience</option>
                {INTENDED_AUDIENCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {feedback.message ? (
            <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
          ) : null}
          <button className="button primary" disabled={isUploading} type="submit">
            {isUploading ? "Uploading and parsing..." : "Upload document"}
          </button>
        </form>

        <article className="detail-card">
          <SectionHeader
            eyebrow="Pipeline"
            title="What happens after upload"
            description="The upload flow is now structured so first-time users can understand how one document turns into a parsed asset, then a generated PDF, and then optionally a marketplace listing."
          />
          <div className="activity-list">
            <article className="activity-item">
              <strong>1. Validation and classification</strong>
              <span className="support-copy">Server-side file checks combine with Sandip University academic taxonomy so every upload starts cleanly.</span>
            </article>
            <article className="activity-item">
              <strong>2. Storage</strong>
              <span className="support-copy">Document metadata, tags, and storage keys are linked to your account so later flows stay organized.</span>
            </article>
            <article className="activity-item">
              <strong>3. Parsing and next steps</strong>
              <span className="support-copy">Text extraction prepares the file for question detection, answer generation, PDF rendering, and selling.</span>
            </article>
          </div>
        </article>
      </div>

      <section className="stack-section">
        <SectionHeader
          eyebrow="Library"
          title="Uploaded documents"
          description="Monitor parsing status, inspect extracted content, and prepare for question detection."
        />
        {isLoading ? (
          <LoadingCard message="Loading uploaded documents..." />
        ) : documents.length ? (
          <div className="document-grid">
            {documents.map((document) => (
              <DocumentCard
                document={document}
                key={document.id}
                onDelete={handleDelete}
                onRetry={handleRetry}
              />
            ))}
          </div>
        ) : (
          <EmptyStateCard
            title="No uploads yet"
            description="Upload your first study document to start building an organized AI-ready document library with clear academic metadata."
          />
        )}
      </section>
    </section>
  );
}
