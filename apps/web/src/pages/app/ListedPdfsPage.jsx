import { useEffect, useState } from "react";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import {
  MarketplaceListingForm,
  createInitialMarketplaceForm,
} from "../../components/ui/MarketplaceListingForm.jsx";
import { MarketplaceListingCard } from "../../components/ui/MarketplaceListingCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import {
  createMarketplaceListing,
  fetchEligibleGeneratedPdfs,
  fetchMyListings,
  updateMarketplaceListing,
} from "../../services/api/index.js";

export function ListedPdfsPage() {
  const { accessToken } = useAuth();
  const [eligiblePdfs, setEligiblePdfs] = useState([]);
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState(createInitialMarketplaceForm());
  const [editingId, setEditingId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    let active = true;

    async function loadMarketplaceData() {
      setIsLoading(true);
      try {
        const [eligibleResponse, listingsResponse] = await Promise.all([
          fetchEligibleGeneratedPdfs(accessToken),
          fetchMyListings(accessToken),
        ]);

        if (!active) {
          return;
        }

        setEligiblePdfs(eligibleResponse.data.items);
        setListings(listingsResponse.data.items);
      } catch (error) {
        if (active) {
          setFeedback({ type: "error", message: error.message || "Unable to load seller marketplace data." });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (accessToken) {
      loadMarketplaceData();
    }

    return () => {
      active = false;
    };
  }, [accessToken]);

  function handleChange(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback({ type: "", message: "" });
    setIsSubmitting(true);

    const payload = {
      generatedPdfId: form.generatedPdfId,
      title: form.title,
      description: form.description,
      priceInr: Number(form.priceInr),
      university: form.university,
      branch: form.branch,
      year: form.year,
      semester: form.semester,
      subject: form.subject,
      examFocus: form.examFocus,
      questionType: form.questionType,
      difficultyLevel: form.difficultyLevel,
      intendedAudience: form.intendedAudience,
      visibility: form.visibility,
      tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean),
    };

    try {
      const response = editingId
        ? await updateMarketplaceListing(accessToken, editingId, payload)
        : await createMarketplaceListing(accessToken, payload);

      const listing = response.data.listing;
      setListings((current) => {
        const filtered = current.filter((item) => item.id !== listing.id);
        return [listing, ...filtered];
      });
      setForm(createInitialMarketplaceForm());
      setEditingId("");
      setFeedback({
        type: "success",
        message: editingId ? "Marketplace listing updated successfully." : "Marketplace listing created successfully.",
      });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to save marketplace listing." });
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditing(listing) {
    setEditingId(listing.id);
    setForm(createInitialMarketplaceForm(listing));
  }

  if (isLoading) {
    return <LoadingCard message="Loading seller marketplace workspace..." />;
  }

  return (
    <section className="stack-section">
      <SectionHeader
        eyebrow="Marketplace"
        title="Listed PDFs"
        description="Publish eligible generated PDFs with full academic categorization, manage pricing, and monitor listing readiness for public discovery."
      />
      {feedback.message ? (
        <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
      ) : null}

      <div className="two-column-grid marketplace-shell">
        <MarketplaceListingForm
          eligiblePdfs={eligiblePdfs}
          form={form}
          isEditing={Boolean(editingId)}
          isSubmitting={isSubmitting}
          onChange={handleChange}
          onSubmit={handleSubmit}
          submitLabel={editingId ? "Update listing" : "Create listing"}
        />

        <section className="stack-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Seller listings</p>
              <h2>Your public PDF catalogue</h2>
              <p className="support-copy">
                Draft and published listings stay connected to your generated PDFs so later sales, wallet credits, and purchase analytics can plug in cleanly.
              </p>
            </div>
          </div>

          {listings.length ? (
            <div className="marketplace-grid">
              {listings.map((listing) => (
                <MarketplaceListingCard
                  action={
                    <button className="button ghost" onClick={() => startEditing(listing)} type="button">
                      Edit
                    </button>
                  }
                  key={listing.id}
                  listing={listing}
                  sellerView
                />
              ))}
            </div>
          ) : (
            <EmptyStateCard
              title="No listings yet"
              description="Choose one of your finalized generated PDFs and publish your first public marketplace listing."
            />
          )}
        </section>
      </div>
    </section>
  );
}
