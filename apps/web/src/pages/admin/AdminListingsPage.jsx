import { useEffect, useState } from "react";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import {
  MARKETPLACE_COVER_SEAL_OPTIONS,
  getMarketplaceCategoryLabel,
} from "../../features/marketplace/marketplace.constants.js";
import { useAuth } from "../../hooks/useAuth.js";
import {
  deleteAdminListing,
  fetchAdminListings,
  updateAdminListing,
  updateAdminListingStatus,
} from "../../services/api/index.js";
import {
  formatMarketplaceDate,
  getCoverSealLabel,
  toDateTimeLocalValue,
} from "../../utils/marketplaceAvailability.js";

function createListingEditForm(item = null) {
  if (!item) {
    return {
      title: "",
      priceInr: 4,
      releaseAt: "",
      coverSeal: "",
    };
  }

  return {
    title: item.title || "",
    priceInr: item.priceInr || 4,
    releaseAt: toDateTimeLocalValue(item.releaseAt),
    coverSeal: item.coverSeal || "",
  };
}

export function AdminListingsPage() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(createListingEditForm());
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    let active = true;
    async function loadListings() {
      setIsLoading(true);
      try {
        const response = await fetchAdminListings(accessToken);
        if (active) {
          setItems(response.data.items);
        }
      } catch (error) {
        if (active) {
          setFeedback({ type: "error", message: error.message || "Unable to load listings." });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    if (accessToken) {
      loadListings();
    }
    return () => {
      active = false;
    };
  }, [accessToken]);

  async function handleAction(listingId, action) {
    try {
      const response = await updateAdminListingStatus(accessToken, listingId, { action });
      setItems((current) => current.map((item) => (item.id === listingId ? response.data.listing : item)));
      setFeedback({ type: "success", message: `Listing ${action} action completed successfully.` });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to update listing status." });
    }
  }

  function startEditing(item) {
    setEditingId(item.id);
    setForm(createListingEditForm(item));
  }

  function resetEditing() {
    setEditingId("");
    setForm(createListingEditForm());
  }

  async function handleSaveEdit(event) {
    event.preventDefault();

    try {
      const response = await updateAdminListing(accessToken, editingId, {
        title: form.title,
        priceInr: Number(form.priceInr),
        releaseAt: form.releaseAt ? new Date(form.releaseAt).toISOString() : "",
        coverSeal: form.coverSeal,
      });
      setItems((current) => current.map((item) => (item.id === editingId ? response.data.listing : item)));
      setFeedback({ type: "success", message: "Listing metadata updated successfully." });
      resetEditing();
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to update listing metadata." });
    }
  }

  async function handleDelete(listingId) {
    const confirmed = window.confirm("Delete this marketplace listing?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteAdminListing(accessToken, listingId);
      setItems((current) => current.filter((item) => item.id !== listingId));
      if (editingId === listingId) {
        resetEditing();
      }
      setFeedback({ type: "success", message: "Listing deleted successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to delete listing." });
    }
  }

  if (isLoading) {
    return <LoadingCard message="Loading admin listings..." />;
  }

  return (
    <section className="stack-section">
      <SectionHeader
        eyebrow="Admin listings"
        title="Marketplace oversight"
        description="Inspect ownership, publication state, and quickly unlist or republish public PDFs when the marketplace needs intervention."
      />
      {feedback.message ? (
        <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
      ) : null}
      {editingId ? (
        <form className="detail-card form-card" onSubmit={handleSaveEdit}>
          <SectionHeader
            eyebrow="Edit listing"
            title="Admin marketplace listing editor"
            description="Admins can directly update any public seller listing metadata from here."
          />
          <div className="two-column-grid compact">
            <label className="field">
              <span>Title</span>
              <input className="input" onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} value={form.title} />
            </label>
            <label className="field">
              <span>Price (Rs.)</span>
              <input className="input" min="4" max="10" type="number" onChange={(event) => setForm((current) => ({ ...current, priceInr: event.target.value }))} value={form.priceInr} />
            </label>
            <label className="field">
              <span>Go live date & time</span>
              <input className="input" type="datetime-local" onChange={(event) => setForm((current) => ({ ...current, releaseAt: event.target.value }))} value={form.releaseAt} />
            </label>
            <label className="field">
              <span>Cover seal</span>
              <select className="input" onChange={(event) => setForm((current) => ({ ...current, coverSeal: event.target.value }))} value={form.coverSeal}>
                {MARKETPLACE_COVER_SEAL_OPTIONS.map((option) => (
                  <option key={option.value || "no-seal"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="hero-actions">
            <button className="button primary" type="submit">Save changes</button>
            <button className="button ghost" onClick={resetEditing} type="button">Cancel</button>
          </div>
        </form>
      ) : null}
      <div className="activity-list">
        {items.map((item) => (
          <article className="activity-item" key={item.id}>
            <strong>{item.title}</strong>
            <span className="support-copy">
              {item.sellerName} - {item.taxonomy?.subject} - Rs. {item.priceInr}
            </span>
            <div className="topbar-chip-group">
              {getMarketplaceCategoryLabel(item.category || (item.sourceType === "admin_upload" ? "semester_exam" : "")) ? (
                <StatusBadge tone="neutral">
                  {getMarketplaceCategoryLabel(item.category || (item.sourceType === "admin_upload" ? "semester_exam" : ""))}
                </StatusBadge>
              ) : null}
              <StatusBadge tone={item.isPublished ? "success" : "warning"}>{item.visibility}</StatusBadge>
              <StatusBadge tone={item.moderationStatus === "restricted" ? "danger" : "success"}>
                {item.moderationStatus}
              </StatusBadge>
              {item.coverSeal ? <StatusBadge tone="neutral">{getCoverSealLabel(item.coverSeal)}</StatusBadge> : null}
            </div>
            <span className="support-copy">
              {item.releaseAt ? `Go live: ${formatMarketplaceDate(item.releaseAt)}` : "Available now"}
            </span>
            <div className="hero-actions">
              <button className="button secondary" onClick={() => startEditing(item)} type="button">
                Edit metadata
              </button>
              <button className="button ghost danger" onClick={() => handleDelete(item.id)} type="button">
                Delete
              </button>
              {item.isPublished ? (
                <button className="button ghost danger" onClick={() => handleAction(item.id, "unlist")} type="button">
                  Unlist
                </button>
              ) : (
                <button className="button secondary" onClick={() => handleAction(item.id, "publish")} type="button">
                  Publish
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
