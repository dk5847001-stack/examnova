import { useEffect, useMemo, useState } from "react";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
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
import {
  createAdminUpload,
  fetchAdminUploads,
  updateAdminUpload,
} from "../../services/api/index.js";

const initialForm = {
  title: "",
  description: "",
  priceInr: "4",
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
  coverImageUrl: "",
  seoTitle: "",
  seoDescription: "",
  visibility: "draft",
  isFeatured: false,
};

export function AdminUploadsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    let active = true;

    async function loadUploads() {
      setIsLoading(true);
      try {
        const response = await fetchAdminUploads(accessToken);
        if (active) {
          setItems(response.data.items);
        }
      } catch (error) {
        if (active) {
          setFeedback({ type: "error", message: error.message || "Unable to load admin uploads." });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (accessToken) {
      loadUploads();
    }

    return () => {
      active = false;
    };
  }, [accessToken]);

  const formTitle = useMemo(
    () => (editingId ? "Edit admin upload" : "Create admin upload"),
    [editingId],
  );

  function handleChange(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEditing(item) {
    setEditingId(item.id);
    setSelectedFile(null);
    setForm({
      title: item.title || "",
      description: item.description || "",
      priceInr: String(item.priceInr || 4),
      university: item.taxonomy?.university || DEFAULT_UNIVERSITY,
      branch: item.taxonomy?.branch || "",
      year: item.taxonomy?.year || "",
      semester: item.taxonomy?.semester || "",
      subject: item.taxonomy?.subject || "",
      examFocus: item.studyMetadata?.examFocus || "",
      questionType: item.studyMetadata?.questionType || "",
      difficultyLevel: item.studyMetadata?.difficultyLevel || "",
      intendedAudience: item.studyMetadata?.intendedAudience || "",
      tags: (item.tags || []).join(", "),
      coverImageUrl: item.coverImageUrl || "",
      seoTitle: item.seoTitle || "",
      seoDescription: item.seoDescription || "",
      visibility: item.visibility || "draft",
      isFeatured: Boolean(item.isFeatured),
    });
  }

  function resetForm() {
    setEditingId("");
    setSelectedFile(null);
    setForm(initialForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      if (editingId) {
        const payload = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          payload.append(key, typeof value === "boolean" ? String(value) : value);
        });
        if (selectedFile) {
          payload.append("pdf", selectedFile);
        }

        const response = await updateAdminUpload(accessToken, editingId, payload);
        setItems((current) => current.map((item) => (item.id === editingId ? response.data.item : item)));
        setFeedback({
          type: "success",
          message: selectedFile
            ? "Admin-uploaded PDF and file source updated successfully."
            : "Admin-uploaded PDF updated successfully.",
        });
      } else {
        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          formData.append(key, typeof value === "boolean" ? String(value) : value);
        });
        if (selectedFile) {
          formData.append("pdf", selectedFile);
        }
        const response = await createAdminUpload(accessToken, formData);
        setItems((current) => [response.data.item, ...current]);
        setFeedback({ type: "success", message: "Admin PDF uploaded successfully." });
      }

      resetForm();
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to save admin upload." });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <LoadingCard message="Loading admin uploads..." />;
  }

  return (
    <section className="stack-section">
      <SectionHeader
        eyebrow="Admin uploads"
        title="Direct premium PDF publishing"
        description="Upload admin-owned PDFs, classify them with the controlled academic taxonomy, and publish them cleanly into the marketplace."
      />
      {feedback.message ? (
        <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
      ) : null}

      <section className="two-column-grid admin-grid">
        <form className="detail-card form-card" onSubmit={handleSubmit}>
          <SectionHeader
            eyebrow={editingId ? "Edit mode" : "New upload"}
            title={formTitle}
            description="Use this for admin-owned PDFs that should go directly into the marketplace catalog with strong buyer-facing metadata."
          />
          <label className="field">
            <span>{editingId ? "Replace PDF file (optional)" : "PDF file"}</span>
            <input
              accept="application/pdf"
              className="input"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              required={!editingId}
              type="file"
            />
          </label>
          {editingId ? (
            <p className="support-copy">
              Upload a replacement PDF here if an existing marketplace file is missing or needs to be repaired without changing old purchases.
            </p>
          ) : null}
          <label className="field"><span>Title</span><input className="input" onChange={(event) => handleChange("title", event.target.value)} placeholder="Example: DBMS End-Sem Important Questions" required value={form.title} /></label>
          <label className="field"><span>Description</span><textarea className="input" onChange={(event) => handleChange("description", event.target.value)} placeholder="Explain what this PDF covers and why a student should buy it." rows={4} value={form.description} /></label>
          <div className="two-column-grid compact">
            <label className="field"><span>Price (Rs.)</span><input className="input" max="10" min="4" onChange={(event) => handleChange("priceInr", event.target.value)} type="number" value={form.priceInr} /></label>
            <label className="field">
              <span>Visibility</span>
              <select className="input" onChange={(event) => handleChange("visibility", event.target.value)} value={form.visibility}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="unlisted">Unlisted</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <div className="two-column-grid compact">
            <label className="field">
              <span>University</span>
              <select className="input" onChange={(event) => handleChange("university", event.target.value)} value={form.university} required>
                <option value={DEFAULT_UNIVERSITY}>{DEFAULT_UNIVERSITY}</option>
              </select>
            </label>
            <label className="field">
              <span>Branch</span>
              <select className="input" onChange={(event) => handleChange("branch", event.target.value)} value={form.branch} required>
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
              <select className="input" onChange={(event) => handleChange("year", event.target.value)} value={form.year} required>
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
              <select className="input" onChange={(event) => handleChange("semester", event.target.value)} value={form.semester} required>
                <option value="">Select semester</option>
                {SEMESTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Semester {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field"><span>Subject</span><input className="input" onChange={(event) => handleChange("subject", event.target.value)} placeholder="Example: Operating Systems" required value={form.subject} /></label>
          <div className="two-column-grid compact">
            <label className="field">
              <span>Exam focus</span>
              <select className="input" onChange={(event) => handleChange("examFocus", event.target.value)} value={form.examFocus}>
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
              <select className="input" onChange={(event) => handleChange("questionType", event.target.value)} value={form.questionType}>
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
              <select className="input" onChange={(event) => handleChange("difficultyLevel", event.target.value)} value={form.difficultyLevel}>
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
              <select className="input" onChange={(event) => handleChange("intendedAudience", event.target.value)} value={form.intendedAudience}>
                <option value="">Select intended audience</option>
                {INTENDED_AUDIENCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field"><span>Tags</span><input className="input" onChange={(event) => handleChange("tags", event.target.value)} placeholder="exam, important, revision" value={form.tags} /></label>
          <label className="field"><span>Cover image URL</span><input className="input" onChange={(event) => handleChange("coverImageUrl", event.target.value)} value={form.coverImageUrl} /></label>
          <label className="field"><span>SEO title</span><input className="input" onChange={(event) => handleChange("seoTitle", event.target.value)} value={form.seoTitle} /></label>
          <label className="field"><span>SEO description</span><textarea className="input" onChange={(event) => handleChange("seoDescription", event.target.value)} rows={3} value={form.seoDescription} /></label>
          <label className="checkbox-row">
            <input checked={form.isFeatured} onChange={(event) => handleChange("isFeatured", event.target.checked)} type="checkbox" />
            <span>Feature this admin upload in public discovery</span>
          </label>
          <div className="hero-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : editingId ? "Save changes" : "Upload PDF"}
            </button>
            {editingId ? <button className="button ghost" onClick={resetForm} type="button">Cancel edit</button> : null}
          </div>
        </form>

        <section className="stack-section">
          <SectionHeader
            eyebrow="Uploaded inventory"
            title="Admin-owned PDF catalog"
            description="Each upload keeps a linked marketplace listing in sync."
          />
          <div className="activity-list">
            {items.map((item) => (
              <article className="activity-item" key={item.id}>
                <strong>{item.title}</strong>
                <span className="support-copy">
                  {item.taxonomy?.subject} - Semester {item.taxonomy?.semester} - Rs. {item.priceInr}
                </span>
                <div className="topbar-chip-group">
                  <StatusBadge tone={item.visibility === "published" ? "success" : "warning"}>
                    {item.visibility}
                  </StatusBadge>
                  {item.isFeatured ? <StatusBadge tone="success">Featured</StatusBadge> : null}
                </div>
                <div className="hero-actions">
                  <button className="button secondary" onClick={() => startEditing(item)} type="button">
                    Edit metadata
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </section>
  );
}
