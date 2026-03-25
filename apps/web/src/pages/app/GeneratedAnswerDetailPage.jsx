import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnswerPreviewCard } from "../../components/ui/AnswerPreviewCard.jsx";
import { GeneratedPdfResultCard } from "../../components/ui/GeneratedPdfResultCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SectionHeader } from "../../components/ui/SectionHeader.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import {
  createPrivatePdfOrder,
  downloadFinalPdf,
  getGeneration,
  getPrivatePdfPaymentStatus,
  renderFinalPdf,
  updateGeneratedAnswers,
  verifyPrivatePdfPayment,
} from "../../services/api/index.js";
import { loadRazorpayCheckout } from "../../utils/loadRazorpayCheckout.js";

function getUnlockErrorMessage(error) {
  const requestIdSuffix = error?.requestId ? ` Reference: ${error.requestId}.` : "";

  if (error?.status === 401) {
    return "Your session expired. Please log in again and retry the PDF unlock." + requestIdSuffix;
  }

  if (error?.status === 403) {
    return "This generated PDF is not available for unlock under your current account." + requestIdSuffix;
  }

  if (error?.status === 404) {
    return "This generated PDF could not be found for your account. Reload the page and try again." + requestIdSuffix;
  }

  if (error?.status === 409) {
    return (error.message || "This payment order is no longer valid. Please retry the unlock flow.") + requestIdSuffix;
  }

  if (error?.status === 422) {
    return "The unlock request was invalid. Reload the page once and try again." + requestIdSuffix;
  }

  if (error?.status === 502 || error?.status === 503) {
    return (error.message || "Payment checkout is temporarily unavailable.") + requestIdSuffix;
  }

  if (error?.status >= 500) {
    return "The backend could not start the private PDF payment. Please try again shortly." + requestIdSuffix;
  }

  return (error?.message || "Unable to complete PDF unlock payment.") + requestIdSuffix;
}

export function GeneratedAnswerDetailPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [generation, setGeneration] = useState(null);
  const [draftItems, setDraftItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  useEffect(() => {
    let active = true;

    async function loadGeneration() {
      setIsLoading(true);
      try {
        const response = await getGeneration(accessToken, id);
        if (!active) {
          return;
        }

        setGeneration(response.data.generation);
        setDraftItems(response.data.generation.answerItems || []);
      } catch (error) {
        if (active) {
          setFeedback({ type: "error", message: error.message || "Unable to load generated answers." });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (accessToken && id) {
      loadGeneration();
    }

    return () => {
      active = false;
    };
  }, [accessToken, id]);

  function handleAnswerChange(item, answerText) {
    setDraftItems((current) =>
      current.map((candidate) =>
        candidate.questionId === item.questionId
          ? { ...candidate, answerText }
          : candidate,
      ),
    );
  }

  async function handleSave() {
    setFeedback({ type: "", message: "" });
    setIsSaving(true);

    try {
      const response = await updateGeneratedAnswers(accessToken, id, {
        answerItems: draftItems.map((item) => ({
          questionId: item.questionId,
          answerText: item.answerText,
          order: item.order,
        })),
      });
      setGeneration(response.data.generation);
      setDraftItems(response.data.generation.answerItems || []);
      setFeedback({ type: "success", message: "Answer draft updated successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to save answer updates." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRenderPdf() {
    setFeedback({ type: "", message: "" });
    setIsRendering(true);

    try {
      const response = await renderFinalPdf(accessToken, id);
      setGeneration(response.data.generation);
      setDraftItems(response.data.generation.answerItems || []);
      setFeedback({ type: "success", message: "Final PDF rendered successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to render final PDF." });
    } finally {
      setIsRendering(false);
    }
  }

  async function handleDownloadPdf() {
    try {
      const response = await downloadFinalPdf(accessToken, id);
      const blobUrl = window.URL.createObjectURL(response.blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = generation?.pdfDownloadName || "examnova-notes.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Unable to download final PDF." });
    }
  }

  async function refreshPaymentState() {
    const response = await getPrivatePdfPaymentStatus(accessToken, id);
    setGeneration(response.data.generation);
  }

  async function handleUnlockPdf() {
    if (!accessToken) {
      setFeedback({ type: "error", message: "Your session expired. Please log in again to unlock this PDF." });
      return;
    }

    setFeedback({ type: "", message: "" });
    setIsPaying(true);

    try {
      const [razorpayConstructor, orderResponse] = await Promise.all([
        loadRazorpayCheckout(),
        createPrivatePdfOrder(accessToken, id),
      ]);

      if (orderResponse.data.alreadyUnlocked) {
        setGeneration(orderResponse.data.generation);
        setFeedback({ type: "success", message: "This PDF is already unlocked." });
        return;
      }

      const checkout = orderResponse.data.checkout;
      const generationTitle = orderResponse.data.generation?.title || generation?.title || "ExamNova PDF";

      await new Promise((resolve, reject) => {
        const razorpay = new razorpayConstructor({
          key: checkout.key,
          amount: checkout.amount,
          currency: checkout.currency,
          name: checkout.name,
          description: checkout.description,
          order_id: checkout.orderId,
          notes: checkout.notes,
          theme: { color: "#cc6f29" },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled before completion.")),
          },
          handler: async (response) => {
            try {
              const verification = await verifyPrivatePdfPayment(accessToken, {
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
              });
              setGeneration(verification.data.generation);
              setFeedback({
                type: "success",
                message: `${generationTitle} unlocked successfully. Your download is now available.`,
              });
              resolve();
            } catch (error) {
              reject(error);
            }
          },
        });

        razorpay.open();
      });

      try {
        await refreshPaymentState();
      } catch (error) {
        setFeedback((current) =>
          current.type === "success" && current.message
            ? current
            : { type: "error", message: getUnlockErrorMessage(error) },
        );
      }
    } catch (error) {
      setFeedback({ type: "error", message: getUnlockErrorMessage(error) });
    } finally {
      setIsPaying(false);
    }
  }

  if (isLoading) {
    return <LoadingCard message="Loading generated answer preview..." />;
  }

  return (
    <section className="stack-section">
      <SectionHeader
        eyebrow="Generated answers"
        title={generation?.title || "Generated answer preview"}
        description="Review answer quality, inspect mini-figure plans, and refine any answer before final PDF rendering."
        action={<StatusBadge tone={generation?.generationStatus === "completed" ? "success" : "neutral"}>{generation?.generationStatus}</StatusBadge>}
      />

      {feedback.message ? (
        <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
      ) : null}

      <div className="hero-actions">
        <button className="button primary" disabled={isSaving} onClick={handleSave} type="button">
          {isSaving ? "Saving..." : "Save draft"}
        </button>
        <Link className="button secondary" to="/app/generated-pdfs">
          Back to generated PDFs
        </Link>
      </div>

      <GeneratedPdfResultCard
        generation={generation}
        isPaying={isPaying}
        isRendering={isRendering}
        onDownload={handleDownloadPdf}
        onRender={handleRenderPdf}
        onUnlock={handleUnlockPdf}
      />

      <div className="answer-list">
        {draftItems.map((item) => (
          <AnswerPreviewCard
            editable
            item={item}
            key={`${item.questionId}-${item.order}`}
            onChange={handleAnswerChange}
          />
        ))}
      </div>

      <div className="detail-card">
        <p className="eyebrow">Next step</p>
        <h3>Private unlock is now enforced</h3>
        <p className="support-copy">
          Final PDF generation and secure payment unlock now work as separate steps. The file can be rendered first, but backend-verified payment is required before the private PDF download becomes active.
        </p>
      </div>
    </section>
  );
}
