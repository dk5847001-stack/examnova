import { useEffect, useMemo, useState } from "react";
import { AcademicTaxonomyFieldset } from "../../components/ui/AcademicTaxonomyFieldset.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import {
  DEFAULT_UNIVERSITY,
} from "../../features/academic/academicTaxonomy.js";
import {
  MARKETPLACE_CATEGORY_LIMIT,
  MARKETPLACE_CATEGORY_OPTIONS,
  MARKETPLACE_COVER_SEAL_OPTIONS,
  MARKETPLACE_PRICE_RANGE,
  getMarketplaceCategoryLabel,
} from "../../features/marketplace/marketplace.constants.js";
import { useAuth } from "../../hooks/useAuth.js";
import {
  createAdminUpload,
  deleteAdminUpload,
  fetchAdminUploads,
  updateAdminUpload,
} from "../../services/api/index.js";
import {
  formatMarketplaceDate,
  getCoverSealLabel,
  toDateTimeLocalValue,
} from "../../utils/marketplaceAvailability.js";

function createBlankAdminUploadForm() {
  return {
    title: "",
    description: "",
    category: MARKETPLACE_CATEGORY_OPTIONS[0].value,
    priceInr: String(MARKETPLACE_PRICE_RANGE.min),
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
    seoTitle: "",
    seoDescription: "",
    visibility: "draft",
    isFeatured: false,
    releaseAt: "",
    coverSeal: "",
  };
}

function createAdminUploadForm(item = null) {
  if (!item) {
    return createBlankAdminUploadForm();
  }

  return {
    title: item.title || "",
    description: item.description || "",
    category: item.category || MARKETPLACE_CATEGORY_OPTIONS[0].value,
    priceInr: String(item.priceInr || MARKETPLACE_PRICE_RANGE.min),
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
    seoTitle: item.seoTitle || "",
    seoDescription: item.seoDescription || "",
    visibility: item.visibility || "draft",
    isFeatured: Boolean(item.isFeatured),
    releaseAt: toDateTimeLocalValue(item.releaseAt),
    coverSeal: item.coverSeal || "",
  };
}

function appendAdminUploadFormData(target, source) {
  Object.entries(source).forEach(([key, value]) => {
    const normalizedValue =
      key === "releaseAt" ? (value ? new Date(value).toISOString() : "") : value;
    target.append(key, typeof normalizedValue === "boolean" ? String(normalizedValue) : normalizedValue);
  });
}

export function AdminUploadsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(createBlankAdminUploadForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [coverImagePreviewUrl, setCoverImagePreviewUrl] = useState("");
  const [currentCoverImageUrl, setCurrentCoverImageUrl] = useState("");
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

  useEffect(() => {
    if (!selectedCoverImage) {
      setCoverImagePreviewUrl("");
      return undefined;
    }

    const objectUrl = window.URL.createObjectURL(selectedCoverImage);
    setCoverImagePreviewUrl(objectUrl);

    return () => window.URL.revokeObjectURL(objectUrl);
  }, [selectedCoverImage]);

  const formTitle = useMemo(
    () => (editingId ? "Edit admin upload" : "Create admin upload"),
    [editingId],
  );
  const categoryUsage = useMemo(
    () =>
      MARKETPLACE_CATEGORY_OPTIONS.reduce((counts, option) => {
        const total = items.filter((item) => (item.category || MARKETPLACE_CATEGORY_OPTIONS[0].value) === option.value).length;
        return {
          ...counts,
          [option.value]: total,
        };
      }, {}),
    [items],
  );

  function handleChange(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEditing(item) {
    setEditingId(item.id);
    setSelectedFile(null);
    setSelectedCoverImage(null);
    setCurrentCoverImageUrl(item.coverImageUrl || "");
    setForm(createAdminUploadForm(item));
  }

  function resetForm() {
    setEditingId("");
    setSelectedFile(null);
    setSelectedCoverImage(null);
    setCurrentCoverImageUrl("");
    setForm(createBlankAdminUploadForm());
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(`Delete "${item.title}"?`);
    if (!confirmed) {
      return;
    }

    setFeedback({ type: "", message: "" });

    try {
      await deleteAdminUpload(accessToken, item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) {
        resetForm();
      }
      setFeedback({ type: "success", message: "Admin PDF deleted successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to delete admin upload." });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback({ type: "", message: "" });

    try {
      if (editingId) {
        const payload = new FormData();
        appendAdminUploadFormData(payload, form);
        if (selectedFile) {
          payload.append("pdf", selectedFile);
        }
        if (selectedCoverImage) {
          payload.append("coverImage", selectedCoverImage);
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
        appendAdminUploadFormData(formData, form);
        if (selectedFile) {
          formData.append("pdf", selectedFile);
        }
        if (selectedCoverImage) {
          formData.append("coverImage", selectedCoverImage);
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

      <section className="stack-section admin-uploads-shell">
        <form className="detail-card form-card" onSubmit={handleSubmit}>
          <SectionHeader
            eyebrow={editingId ? "Edit mode" : "New upload"}
            title={formTitle}
            description="Use this for admin-owned PDFs that should go directly into the marketplace catalog with controlled academic taxonomy and premium buyer-facing metadata."
          />
          <article className="guided-inline-card">
            <div className="guided-inline-card-copy">
              <strong>Admin uploads publish from a tightly controlled academic catalog.</strong>
              <p className="support-copy">
                University, branch, year, and semester stay locked to approved Sandip University options so the public marketplace remains clean for first-time students.
              </p>
              <p className="support-copy">
                Category slots: {MARKETPLACE_CATEGORY_OPTIONS.map((option) => `${option.label} ${categoryUsage[option.value] || 0}/${MARKETPLACE_CATEGORY_LIMIT}`).join(" | ")}
              </p>
            </div>
            <div className="guided-pill-row">
              <span className="guided-pill">Admin owned</span>
              <span className="guided-pill">Marketplace synced</span>
              <span className="guided-pill">Category capped</span>
              <span className="guided-pill">Controlled taxonomy</span>
              <span className="guided-pill">Timed release</span>
            </div>
          </article>
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
          <label className="field">
            <span>{editingId ? "Replace cover image (optional)" : "Cover image (optional)"}</span>
            <input
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="input"
              onChange={(event) => setSelectedCoverImage(event.target.files?.[0] || null)}
              type="file"
            />
          </label>
          <p className="support-copy">
            This uploaded image will show on marketplace cards and on the public PDF detail page.
          </p>
          {coverImagePreviewUrl || currentCoverImageUrl ? (
            <figure className="cover-upload-preview">
              <img
                alt={`${form.title || "PDF"} cover preview`}
                className="cover-upload-preview-image"
                src={coverImagePreviewUrl || currentCoverImageUrl}
              />
              <figcaption className="support-copy">
                {selectedCoverImage ? "Selected cover image preview" : "Current marketplace cover image"}
              </figcaption>
            </figure>
          ) : null}
          <label className="field"><span>Title</span><input className="input" onChange={(event) => handleChange("title", event.target.value)} placeholder="Example: DBMS End-Sem Important Questions" required value={form.title} /></label>
          <div className="two-column-grid compact">
            <label className="field">
              <span>Category</span>
              <select className="input" onChange={(event) => handleChange("category", event.target.value)} value={form.category}>
                {MARKETPLACE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({categoryUsage[option.value] || 0}/{MARKETPLACE_CATEGORY_LIMIT})
                  </option>
                ))}
              </select>
            </label>
            <label className="field"><span>Price (Rs.)</span><input className="input" max={MARKETPLACE_PRICE_RANGE.max} min={MARKETPLACE_PRICE_RANGE.min} onChange={(event) => handleChange("priceInr", event.target.value)} type="number" value={form.priceInr} /></label>
            <label className="field">
              <span>Visibility</span>
              <select className="input" onChange={(event) => handleChange("visibility", event.target.value)} value={form.visibility}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="unlisted">Unlisted</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label className="field">
              <span>Go live date & time</span>
              <input className="input" onChange={(event) => handleChange("releaseAt", event.target.value)} type="datetime-local" value={form.releaseAt} />
            </label>
            <label className="field">
              <span>Cover seal</span>
              <select className="input" onChange={(event) => handleChange("coverSeal", event.target.value)} value={form.coverSeal}>
                {MARKETPLACE_COVER_SEAL_OPTIONS.map((option) => (
                  <option key={option.value || "no-seal"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <AcademicTaxonomyFieldset
            description="These normalized academic fields drive marketplace filters and keep the public catalog consistent across admin and seller uploads."
            onChange={handleChange}
            values={form}
          />
          <details className="guided-disclosure" open={Boolean(editingId)}>
            <summary>Optional marketplace polish</summary>
            <div className="stack-section">
              <label className="field"><span>SEO title</span><input className="input" onChange={(event) => handleChange("seoTitle", event.target.value)} value={form.seoTitle} /></label>
              <label className="field"><span>SEO description</span><textarea className="input" onChange={(event) => handleChange("seoDescription", event.target.value)} rows={3} value={form.seoDescription} /></label>
              <label className="checkbox-row">
                <input checked={form.isFeatured} onChange={(event) => handleChange("isFeatured", event.target.checked)} type="checkbox" />
                <span>Feature this admin upload in public discovery</span>
              </label>
            </div>
          </details>
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
                <div className="marketplace-taxonomy">
                  {item.taxonomy?.university ? <span>{item.taxonomy.university}</span> : null}
                  {item.taxonomy?.branch ? <span>{item.taxonomy.branch}</span> : null}
                  {item.taxonomy?.year ? <span>{item.taxonomy.year}</span> : null}
                  {item.taxonomy?.semester ? <span>Semester {item.taxonomy.semester}</span> : null}
                </div>
                <div className="topbar-chip-group">
                  <StatusBadge tone="neutral">
                    {getMarketplaceCategoryLabel(item.category || MARKETPLACE_CATEGORY_OPTIONS[0].value)}
                  </StatusBadge>
                  <StatusBadge tone={item.visibility === "published" ? "success" : "warning"}>
                    {item.visibility}
                  </StatusBadge>
                  {item.coverSeal ? <StatusBadge tone="neutral">{getCoverSealLabel(item.coverSeal)}</StatusBadge> : null}
                  {item.isFeatured ? <StatusBadge tone="success">Featured</StatusBadge> : null}
                </div>
                <span className="support-copy">
                  {item.releaseAt
                    ? `Go live: ${formatMarketplaceDate(item.releaseAt)}`
                    : `Available now since ${formatMarketplaceDate(item.publishedAt || item.createdAt)}`}
                </span>
                <div className="hero-actions">
                  <button className="button secondary" onClick={() => startEditing(item)} type="button">
                    Edit metadata
                  </button>
                  <button className="button ghost" onClick={() => handleDelete(item)} type="button">
                    Delete
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
