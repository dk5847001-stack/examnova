import { useEffect, useState } from "react";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import {
  BRANCH_OPTIONS,
  DEFAULT_UNIVERSITY,
  SEMESTER_OPTIONS,
  YEAR_OPTIONS,
} from "../../features/academic/academicTaxonomy.js";
import { useAuth } from "../../hooks/useAuth.js";
import {
  createAdminUpcoming,
  fetchAdminUpcoming,
  fetchAdminUploads,
  updateAdminUpcoming,
  updateAdminUpcomingStatus,
} from "../../services/api/index.js";

const initialForm = {
  adminUploadId: "",
  title: "",
  summary: "",
  university: DEFAULT_UNIVERSITY,
  branch: "",
  year: "",
  semester: "",
  subject: "",
  tags: "",
  coverImageUrl: "",
  status: "upcoming",
  visibility: true,
  isFeatured: false,
  visibilityStartAt: "",
  expectedReleaseAt: "",
};

export function AdminUpcomingPdfsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const [upcomingResponse, uploadsResponse] = await Promise.all([
          fetchAdminUpcoming(accessToken),
          fetchAdminUploads(accessToken),
        ]);

        if (active) {
          setItems(upcomingResponse.data.items);
          setUploads(uploadsResponse.data.items);
        }
      } catch (error) {
        if (active) {
          setFeedback({ type: "error", message: error.message || "Unable to load upcoming locked PDFs." });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (accessToken) {
      loadData();
    }

    return () => {
      active = false;
    };
  }, [accessToken]);

  function handleChange(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function populateFromUpload(uploadId) {
    const selected = uploads.find((item) => item.id === uploadId);
    if (!selected) {
      handleChange("adminUploadId", uploadId);
      return;
    }

    setForm((current) => ({
      ...current,
      adminUploadId: uploadId,
      title: current.title || selected.title || "",
      summary: current.summary || selected.description || "",
      university: current.university || selected.taxonomy?.university || DEFAULT_UNIVERSITY,
      branch: current.branch || selected.taxonomy?.branch || "",
      year: current.year || selected.taxonomy?.year || "",
      semester: current.semester || selected.taxonomy?.semester || "",
      subject: current.subject || selected.taxonomy?.subject || "",
      coverImageUrl: current.coverImageUrl || selected.coverImageUrl || "",
      tags: current.tags || (selected.tags || []).join(", "),
    }));
  }

  function startEditing(item) {
    setEditingId(item.id);
    setForm({
      adminUploadId: item.adminUploadId || "",
      title: item.title || "",
      summary: item.summary || "",
      university: item.taxonomy?.university || DEFAULT_UNIVERSITY,
      branch: item.taxonomy?.branch || "",
      year: item.taxonomy?.year || "",
      semester: item.taxonomy?.semester || "",
      subject: item.taxonomy?.subject || "",
      tags: (item.tags || []).join(", "),
      coverImageUrl: item.coverImageUrl || "",
      status: item.status || "upcoming",
      visibility: Boolean(item.visibility),
      isFeatured: Boolean(item.isFeatured),
      visibilityStartAt: item.visibilityStartAt ? String(item.visibilityStartAt).slice(0, 10) : "",
      expectedReleaseAt: item.expectedReleaseAt ? String(item.expectedReleaseAt).slice(0, 10) : "",
    });
  }

  function resetForm() {
    setEditingId("");
    setForm(initialForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      const response = editingId
        ? await updateAdminUpcoming(accessToken, editingId, form)
        : await createAdminUpcoming(accessToken, form);

      setItems((current) => {
        if (editingId) {
          return current.map((item) => (item.id === editingId ? response.data.item : item));
        }
        return [response.data.item, ...current];
      });

      setFeedback({
        type: "success",
        message: editingId
          ? "Upcoming locked PDF updated successfully."
          : "Upcoming locked PDF created successfully.",
      });
      resetForm();
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to save upcoming locked PDF." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAction(itemId, action) {
    try {
      const response = await updateAdminUpcomingStatus(accessToken, itemId, { action });
      setItems((current) => current.map((item) => (item.id === itemId ? response.data.item : item)));
      setFeedback({ type: "success", message: `Upcoming item ${action} action completed successfully.` });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to update upcoming item status." });
    }
  }

  if (isLoading) {
    return <LoadingCard message="Loading upcoming locked PDFs..." />;
  }

  return (
    <section className="stack-section">
      <SectionHeader
        eyebrow="Upcoming locked"
        title="Coming-soon release management"
        description="Stage current-semester PDF drops, surface them publicly in locked mode, and unlock them into the marketplace when they are ready."
      />
      {feedback.message ? (
        <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
      ) : null}

      <section className="two-column-grid admin-grid">
        <form className="detail-card form-card" onSubmit={handleSubmit}>
          <SectionHeader
            eyebrow={editingId ? "Edit upcoming" : "New locked entry"}
            title={editingId ? "Edit upcoming locked PDF" : "Create upcoming locked PDF"}
            description="Link to an admin upload when a later publish action should unlock a real marketplace product."
          />
          <label className="field">
            <span>Linked admin upload</span>
            <select className="input" onChange={(event) => populateFromUpload(event.target.value)} value={form.adminUploadId}>
              <option value="">No linked upload</option>
              {uploads.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field"><span>Title</span><input className="input" onChange={(event) => handleChange("title", event.target.value)} placeholder="Example: Semester 6 OS Smart Revision Pack" required value={form.title} /></label>
          <label className="field"><span>Summary</span><textarea className="input" onChange={(event) => handleChange("summary", event.target.value)} placeholder="Tell students what is coming and why they should watch for the release." rows={4} value={form.summary} /></label>
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
          <label className="field"><span>Subject</span><input className="input" onChange={(event) => handleChange("subject", event.target.value)} placeholder="Example: Computer Networks" required value={form.subject} /></label>
          <label className="field"><span>Tags</span><input className="input" onChange={(event) => handleChange("tags", event.target.value)} value={form.tags} /></label>
          <label className="field"><span>Cover image URL</span><input className="input" onChange={(event) => handleChange("coverImageUrl", event.target.value)} value={form.coverImageUrl} /></label>
          <div className="two-column-grid compact">
            <label className="field">
              <span>Status</span>
              <select className="input" onChange={(event) => handleChange("status", event.target.value)} value={form.status}>
                <option value="draft">Draft</option>
                <option value="upcoming">Upcoming</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="field"><span>Visible from</span><input className="input" onChange={(event) => handleChange("visibilityStartAt", event.target.value)} type="date" value={form.visibilityStartAt} /></label>
            <label className="field"><span>Expected release</span><input className="input" onChange={(event) => handleChange("expectedReleaseAt", event.target.value)} type="date" value={form.expectedReleaseAt} /></label>
          </div>
          <label className="checkbox-row">
            <input checked={form.visibility} onChange={(event) => handleChange("visibility", event.target.checked)} type="checkbox" />
            <span>Visible in public upcoming discovery</span>
          </label>
          <label className="checkbox-row">
            <input checked={form.isFeatured} onChange={(event) => handleChange("isFeatured", event.target.checked)} type="checkbox" />
            <span>Highlight for current-semester discovery</span>
          </label>
          <div className="hero-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : editingId ? "Save changes" : "Create upcoming entry"}
            </button>
            {editingId ? <button className="button ghost" onClick={resetForm} type="button">Cancel edit</button> : null}
          </div>
        </form>

        <section className="stack-section">
          <SectionHeader
            eyebrow="Upcoming queue"
            title="Locked release lineup"
            description="Use status transitions to schedule, publish, archive, or cancel premium content."
          />
          <div className="activity-list">
            {items.map((item) => (
              <article className="activity-item" key={item.id}>
                <strong>{item.title}</strong>
                <span className="support-copy">
                  {item.taxonomy?.subject} - {item.taxonomy?.semester} - {item.expectedReleaseAt ? new Date(item.expectedReleaseAt).toLocaleDateString() : "No release date"}
                </span>
                <div className="topbar-chip-group">
                  <StatusBadge tone={item.status === "upcoming" ? "warning" : item.status === "published" ? "success" : "neutral"}>
                    {item.status}
                  </StatusBadge>
                  {item.isFeatured ? <StatusBadge tone="success">Featured</StatusBadge> : null}
                </div>
                <div className="hero-actions">
                  <button className="button secondary" onClick={() => startEditing(item)} type="button">Edit</button>
                  <button className="button ghost" onClick={() => handleAction(item.id, "schedule")} type="button">Schedule</button>
                  <button className="button ghost" onClick={() => handleAction(item.id, "publish")} type="button">Publish</button>
                  <button className="button ghost" onClick={() => handleAction(item.id, "cancel")} type="button">Cancel</button>
                  <button className="button ghost danger" onClick={() => handleAction(item.id, "archive")} type="button">Archive</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </section>
  );
}
