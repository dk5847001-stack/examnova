import { useEffect, useState } from "react";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import {
  MarketplaceListingForm,
  createInitialMarketplaceForm,
} from "../../components/ui/MarketplaceListingForm.jsx";
import { MarketplaceListingCard } from "../../components/ui/MarketplaceListingCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { DEFAULT_UNIVERSITY } from "../../features/academic/academicTaxonomy.js";
import { useAuth } from "../../hooks/useAuth.js";
import {
  createMarketplaceListing,
  fetchEligibleGeneratedPdfs,
  fetchMyListings,
  updateMarketplaceListing,
} from "../../services/api/index.js";

function applyEligiblePdfDefaults(currentForm, selectedPdf) {
  if (!selectedPdf) {
    return currentForm;
  }

  return {
    ...currentForm,
    generatedPdfId: selectedPdf.id,
    title: selectedPdf.suggestedListingTitle || selectedPdf.title || currentForm.title,
    university: selectedPdf.taxonomy?.university || DEFAULT_UNIVERSITY,
    branch: selectedPdf.taxonomy?.branch || "",
    year: selectedPdf.taxonomy?.year || "",
    semester: selectedPdf.taxonomy?.semester || "",
    subject: selectedPdf.taxonomy?.subject || "",
    examFocus: selectedPdf.studyMetadata?.examFocus || "",
    questionType: selectedPdf.studyMetadata?.questionType || "",
    difficultyLevel: selectedPdf.studyMetadata?.difficultyLevel || "",
    intendedAudience: selectedPdf.studyMetadata?.intendedAudience || "",
  };
}

function buildMarketplaceListingFormData(form, coverImageFile = null) {
  const payload = new FormData();
  payload.append("generatedPdfId", form.generatedPdfId);
  payload.append("title", form.title);
  payload.append("description", form.description);
  payload.append("priceInr", String(form.priceInr));
  payload.append("university", form.university);
  payload.append("branch", form.branch);
  payload.append("year", form.year);
  payload.append("semester", form.semester);
  payload.append("subject", form.subject);
  payload.append("examFocus", form.examFocus);
  payload.append("questionType", form.questionType);
  payload.append("difficultyLevel", form.difficultyLevel);
  payload.append("intendedAudience", form.intendedAudience);
  payload.append("visibility", form.visibility);
  payload.append("tags", form.tags);
  payload.append("releaseAt", form.releaseAt ? new Date(form.releaseAt).toISOString() : "");
  payload.append("coverSeal", form.coverSeal);

  if (coverImageFile) {
    payload.append("coverImage", coverImageFile);
  }

  return payload;
}

export function ListedPdfsPage() {
  const { accessToken } = useAuth();
  const [eligiblePdfs, setEligiblePdfs] = useState([]);
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState(createInitialMarketplaceForm());
  const [selectedCoverImage, setSelectedCoverImage] = useState(null);
  const [coverImagePreviewUrl, setCoverImagePreviewUrl] = useState("");
  const [currentCoverImageUrl, setCurrentCoverImageUrl] = useState("");
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

  useEffect(() => {
    if (!selectedCoverImage) {
      setCoverImagePreviewUrl("");
      return undefined;
    }

    const objectUrl = window.URL.createObjectURL(selectedCoverImage);
    setCoverImagePreviewUrl(objectUrl);

    return () => window.URL.revokeObjectURL(objectUrl);
  }, [selectedCoverImage]);

  function handleChange(field, value) {
    setForm((current) => {
      if (field !== "generatedPdfId" || editingId) {
        return {
          ...current,
          [field]: value,
        };
      }

      const selectedPdf = eligiblePdfs.find((item) => item.id === value);
      if (!selectedPdf) {
        return {
          ...current,
          generatedPdfId: value,
        };
      }

      return applyEligiblePdfDefaults(current, selectedPdf);
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback({ type: "", message: "" });
    setIsSubmitting(true);

    const payload = buildMarketplaceListingFormData(form, selectedCoverImage);

    try {
      const response = editingId
        ? await updateMarketplaceListing(accessToken, editingId, payload)
        : await createMarketplaceListing(accessToken, payload);

      const listing = response.data.listing;
      setListings((current) => {
        const filtered = current.filter((item) => item.id !== listing.id);
        return [listing, ...filtered];
      });
      if (!editingId && listing.sourcePdfId) {
        setEligiblePdfs((current) => current.filter((item) => item.id !== listing.sourcePdfId));
      }
      setForm(createInitialMarketplaceForm());
      setSelectedCoverImage(null);
      setCurrentCoverImageUrl("");
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
    setSelectedCoverImage(null);
    setCurrentCoverImageUrl(listing.coverImageUrl || "");
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
        description="Publish eligible generated PDFs with controlled Sandip University taxonomy, guided seller metadata, and a cleaner public marketplace presentation."
      />
      {feedback.message ? (
        <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
      ) : null}

      <div className="two-column-grid marketplace-shell">
        <MarketplaceListingForm
          coverImagePreviewUrl={coverImagePreviewUrl || currentCoverImageUrl}
          eligiblePdfs={eligiblePdfs}
          form={form}
          isEditing={Boolean(editingId)}
          isSubmitting={isSubmitting}
          onChange={handleChange}
          onCoverImageChange={setSelectedCoverImage}
          onSubmit={handleSubmit}
          selectedCoverImageName={selectedCoverImage?.name || ""}
          submitLabel={editingId ? "Update listing" : "Create listing"}
        />

        <section className="stack-section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Seller listings</p>
              <h2>Your public PDF catalogue</h2>
              <p className="support-copy">
                Draft and published listings stay connected to your generated PDFs while keeping university, branch, year, and semester normalized for cleaner browsing.
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
              description="Choose one finalized generated PDF, let ExamNova autofill the academic taxonomy, and publish your first public marketplace listing."
            />
          )}
        </section>
      </div>
    </section>
  );
}
