import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { SeoHead } from "../../seo/SeoHead.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import {
  createMarketplaceOrder,
  createPublicMarketplaceOrder,
  downloadGuestLibraryItem,
  downloadLibraryItem,
  fetchPublicListingDetail,
  verifyMarketplacePayment,
  verifyPublicMarketplacePayment,
} from "../../services/api/index.js";
import { loadRazorpayCheckout } from "../../utils/loadRazorpayCheckout.js";
import { formatMarketplaceDate, getCountdownParts, isListingReleaseLocked } from "../../utils/marketplaceAvailability.js";
import { buildBreadcrumbSchema, buildProductSchema, buildSeoPayload } from "../../utils/seo.js";

const DEFAULT_FEEDBACK = { type: "", message: "", detail: "", showGuestDownload: false, showAccountDownload: false };
const STEPS = [
  { id: 1, icon: "bi-lightning-charge", title: "Name, payment, auto-download", label: "One secure action" },
  { id: 2, icon: "bi-receipt-cutoff", title: "Optional payment receipt", label: "Download slip if needed" },
];

function normalizeGuestName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function getGuestPurchaseStorageKey(listingId) {
  return `examnova:guest-marketplace-access:${listingId}`;
}

function readGuestStorage(key) {
  if (typeof window === "undefined") return null;

  const sessionValue = window.sessionStorage.getItem(key);
  if (sessionValue) {
    return sessionValue;
  }

  const legacyLocalValue = window.localStorage.getItem(key);
  if (legacyLocalValue) {
    window.sessionStorage.setItem(key, legacyLocalValue);
    window.localStorage.removeItem(key);
    return legacyLocalValue;
  }

  return null;
}

function readGuestPurchaseAccess(listingId) {
  if (typeof window === "undefined" || !listingId) return null;
  const storageKey = getGuestPurchaseStorageKey(listingId);
  try {
    const rawValue = readGuestStorage(storageKey);
    if (!rawValue) return null;
    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue?.purchaseId || !parsedValue?.token) return null;
    if (parsedValue.expiresAt && new Date(parsedValue.expiresAt).getTime() <= Date.now()) {
      window.sessionStorage.removeItem(storageKey);
      window.localStorage.removeItem(storageKey);
      return null;
    }
    return parsedValue;
  } catch {
    window.sessionStorage.removeItem(storageKey);
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

function storeGuestPurchaseAccess(listingId, access) {
  if (typeof window === "undefined" || !listingId || !access?.purchaseId || !access?.token) return;
  const storageKey = getGuestPurchaseStorageKey(listingId);
  window.sessionStorage.setItem(storageKey, JSON.stringify(access));
  window.localStorage.removeItem(storageKey);
}

function clearGuestPurchaseAccess(listingId) {
  if (typeof window === "undefined" || !listingId) return;
  const storageKey = getGuestPurchaseStorageKey(listingId);
  window.localStorage.removeItem(storageKey);
  window.sessionStorage.removeItem(storageKey);
}

function sanitizeDownloadName(value, fallback) {
  const sanitizedValue = String(value || "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .trim();

  return sanitizedValue || fallback;
}

function triggerBlobDownload(blob, title) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizeDownloadName(title, "marketplace-pdf")}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function triggerBase64Download(fileName, mimeType, contentBase64) {
  const binary = window.atob(String(contentBase64 || ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const url = window.URL.createObjectURL(new Blob([bytes], { type: mimeType || "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = sanitizeDownloadName(fileName, "payment-slip.pdf");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function getStepState(stepId, step, hasDownloadAccess, pdfDownloadStatus) {
  if (stepId === 1 && hasDownloadAccess) return "complete";
  if (stepId === 2 && pdfDownloadStatus === "downloaded") return "complete";
  if (stepId === 2 && hasDownloadAccess) return "active";
  if (stepId === step) return "active";
  return "upcoming";
}

export function PdfDetailPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { accessToken, isAuthenticated, user } = useAuth();
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isGuestDownloading, setIsGuestDownloading] = useState(false);
  const [isAccountDownloading, setIsAccountDownloading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(DEFAULT_FEEDBACK);
  const [guestFullName, setGuestFullName] = useState("");
  const [guestAccess, setGuestAccess] = useState(null);
  const [accountPurchaseId, setAccountPurchaseId] = useState("");
  const [receiptSlip, setReceiptSlip] = useState(null);
  const [receiptStatus, setReceiptStatus] = useState("idle");
  const [pdfDownloadStatus, setPdfDownloadStatus] = useState("idle");
  const [wizardStep, setWizardStep] = useState(1);
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const autoPurchaseAttemptedRef = useRef(false);
  const wasCheckoutOpenRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function loadListing() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetchPublicListingDetail(slug);
        if (active) setListing(response.data.listing || null);
      } catch (requestError) {
        if (active) setError(requestError.message || "Unable to load marketplace listing.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    if (slug) loadListing();
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (isAuthenticated && user?.name && !guestFullName) setGuestFullName(user.name);
  }, [guestFullName, isAuthenticated, user?.name]);

  useEffect(() => {
    if (!listing?.id) return;
    const storedGuestAccess = readGuestPurchaseAccess(listing.id);
    setGuestAccess(storedGuestAccess);
    if (storedGuestAccess?.buyerName) setGuestFullName(storedGuestAccess.buyerName);
    if (storedGuestAccess) {
      setPdfDownloadStatus((current) => (current === "downloaded" ? current : "ready"));
      setFeedback((current) =>
        current.message
          ? current
          : {
              type: "success",
              message: `Your download access for "${listing.title}" is still active on this device.`,
              detail: storedGuestAccess.expiresAt
                ? `Secure guest access remains active until ${new Date(storedGuestAccess.expiresAt).toLocaleString()}.`
                : "",
              showGuestDownload: true,
              showAccountDownload: false,
            },
      );
    }
  }, [listing?.id, listing?.title]);

  useEffect(() => {
    if (!listing?.releaseAt) return undefined;
    const intervalId = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [listing?.releaseAt]);

  useEffect(() => {
    autoPurchaseAttemptedRef.current = false;
  }, [slug]);

  const selectedBuyerName = normalizeGuestName(guestFullName);
  const releaseLocked = isListingReleaseLocked(listing, countdownNow);
  const releaseCountdown = getCountdownParts(listing?.releaseAt, countdownNow);
  const releaseLabel = formatMarketplaceDate(listing?.releaseAt || listing?.publishedAt || listing?.createdAt);
  const coverAlt = `${listing?.title || "PDF"} cover`;
  const isCheckoutOpen = searchParams.get("checkout") === "1" || searchParams.get("buy") === "1";
  const hasDownloadAccess = Boolean((feedback.showGuestDownload && guestAccess?.purchaseId) || (feedback.showAccountDownload && accountPurchaseId));
  const progressValue = pdfDownloadStatus === "downloaded" ? 100 : hasDownloadAccess ? 76 : isPurchasing ? 54 : 20;

  useEffect(() => {
    if (!isCheckoutOpen) {
      wasCheckoutOpenRef.current = false;
      return;
    }
    if (!wasCheckoutOpenRef.current) {
      setWizardStep(hasDownloadAccess ? 2 : 1);
      if (!hasDownloadAccess) {
        setReceiptStatus("idle");
        setPdfDownloadStatus("idle");
      }
      wasCheckoutOpenRef.current = true;
    }
  }, [hasDownloadAccess, isCheckoutOpen]);

  useEffect(() => {
    if (!isCheckoutOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCheckoutOpen]);

  useEffect(() => {
    if (!hasDownloadAccess) return;
    setWizardStep(2);
    setPdfDownloadStatus((current) => (current === "downloaded" ? current : "ready"));
  }, [hasDownloadAccess]);

  function openCheckoutWizard(step = 1) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("checkout", "1");
    nextParams.delete("buy");
    setSearchParams(nextParams);
    setWizardStep(step);
  }

  function closeCheckoutWizard() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("checkout");
    nextParams.delete("buy");
    setSearchParams(nextParams, { replace: true });
  }

  async function downloadReceiptSlip(receipt, { silent = false } = {}) {
    if (!receipt?.contentBase64) return;
    setReceiptStatus("downloading");
    try {
      triggerBase64Download(receipt.fileName, receipt.mimeType, receipt.contentBase64);
      setReceiptStatus("downloaded");
    } catch (downloadError) {
      setReceiptStatus("error");
      if (!silent) {
        setFeedback((current) => ({
          ...current,
          type: "error",
          message: "Payment succeeded, but the receipt slip could not be downloaded automatically.",
          detail: "Use the receipt button in step 2 again.",
        }));
      }
      throw downloadError;
    }
  }

  async function handleGuestDownload(access = guestAccess, { silent = false } = {}) {
    if (!access?.purchaseId || !access?.token) {
      if (!silent) setFeedback({ ...DEFAULT_FEEDBACK, type: "error", message: "Secure guest download is not ready yet." });
      return;
    }

    setIsGuestDownloading(true);
    setPdfDownloadStatus("downloading");
    try {
      const response = await downloadGuestLibraryItem(access.purchaseId, access.token);
      triggerBlobDownload(response.blob, listing?.title);
      setPdfDownloadStatus("downloaded");
    } catch (requestError) {
      setPdfDownloadStatus("error");
      if (requestError.status === 401 || requestError.status === 403) {
        clearGuestPurchaseAccess(listing?.id);
        setGuestAccess(null);
      }
      if (!silent) {
        setFeedback({
          type: "error",
          message: requestError.message || "Unable to download your PDF.",
          detail: "Use the PDF button in step 2 again.",
          showGuestDownload: false,
          showAccountDownload: false,
        });
      }
      throw requestError;
    } finally {
      setIsGuestDownloading(false);
    }
  }

  async function handleAccountDownload(purchaseId = accountPurchaseId, { silent = false } = {}) {
    if (!accessToken || !purchaseId) {
      if (!silent) setFeedback({ ...DEFAULT_FEEDBACK, type: "error", message: "Your account download is not ready yet." });
      return;
    }

    setIsAccountDownloading(true);
    setPdfDownloadStatus("downloading");
    try {
      const response = await downloadLibraryItem(accessToken, purchaseId);
      triggerBlobDownload(response.blob, listing?.title);
      setPdfDownloadStatus("downloaded");
    } catch (requestError) {
      setPdfDownloadStatus("error");
      if (!silent) {
        setFeedback({
          type: "error",
          message: requestError.message || "Unable to download this PDF from your account.",
          detail: "Use the step 2 PDF button again.",
          showGuestDownload: false,
          showAccountDownload: Boolean(purchaseId),
        });
      }
      throw requestError;
    } finally {
      setIsAccountDownloading(false);
    }
  }

  async function handleAuthenticatedPurchase() {
    if (!accessToken) throw new Error("Your session is still loading. Please try again in a moment.");
    if (!selectedBuyerName) throw new Error("Enter your full name before continuing.");

    const [RazorpayCheckout, orderResponse] = await Promise.all([
      loadRazorpayCheckout(),
      createMarketplaceOrder(accessToken, listing.id, selectedBuyerName),
    ]);

    if (orderResponse.data.alreadyOwned) {
      const existingPurchaseId = orderResponse.data?.purchase?.id || "";
      setAccountPurchaseId(existingPurchaseId);
      setWizardStep(2);
      setPdfDownloadStatus("ready");
      try {
        await handleAccountDownload(existingPurchaseId, { silent: true });
        setFeedback({
          type: "success",
          message: `You already own "${listing.title}". The download started from your account access.`,
          detail: "",
          showGuestDownload: false,
          showAccountDownload: Boolean(existingPurchaseId),
        });
      } catch {
        setFeedback({
          type: "success",
          message: `You already own "${listing.title}".`,
          detail: "Step 2 is ready. Use the PDF download button there if needed.",
          showGuestDownload: false,
          showAccountDownload: Boolean(existingPurchaseId),
        });
      }
      return;
    }

    const checkout = orderResponse.data?.checkout;
    if (!checkout?.orderId || !checkout?.key) throw new Error("Payment checkout is not available right now. Please try again in a moment.");

    const purchaseResult = await new Promise((resolve, reject) => {
      const razorpay = new RazorpayCheckout({
        key: checkout.key,
        amount: checkout.amount,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        order_id: checkout.orderId,
        notes: checkout.notes,
        prefill: checkout.prefill || { name: selectedBuyerName },
        theme: { color: "#1f63ff" },
        modal: { ondismiss: () => reject(new Error("Payment was cancelled before completion.")) },
        handler: async (response) => {
          try {
            const verificationResponse = await verifyMarketplacePayment(accessToken, {
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });
            resolve({ purchaseId: verificationResponse.data?.purchase?.id || "", receipt: verificationResponse.data?.receipt || null });
          } catch (requestError) {
            reject(requestError);
          }
        },
      });
      razorpay.open();
    });

    if (!purchaseResult.purchaseId) throw new Error("Payment succeeded, but account download access could not be prepared.");
    setAccountPurchaseId(purchaseResult.purchaseId);
    setWizardStep(2);
    setPdfDownloadStatus("ready");
    if (purchaseResult.receipt) {
      setReceiptSlip(purchaseResult.receipt);
      await downloadReceiptSlip(purchaseResult.receipt, { silent: true }).catch(() => {});
    }
    try {
      await handleAccountDownload(purchaseResult.purchaseId, { silent: true });
      setFeedback({
        type: "success",
        message: `Payment successful. "${listing.title}" is now downloading from your account access.`,
        detail: "The payment slip was also prepared automatically.",
        showGuestDownload: false,
        showAccountDownload: true,
      });
    } catch {
      setFeedback({
        type: "success",
        message: `Payment successful. "${listing.title}" is unlocked in your account.`,
        detail: "Step 2 is ready. Use the download button below if the file did not start automatically.",
        showGuestDownload: false,
        showAccountDownload: true,
      });
    }
  }

  async function handlePublicPurchase() {
    if (!selectedBuyerName) throw new Error("Enter your full name before continuing.");

    const [RazorpayCheckout, orderResponse] = await Promise.all([
      loadRazorpayCheckout(),
      createPublicMarketplaceOrder(listing.id, selectedBuyerName),
    ]);

    const checkout = orderResponse.data?.checkout;
    if (!checkout?.orderId || !checkout?.key) throw new Error("Payment checkout is not available right now. Please try again in a moment.");

    const verificationResult = await new Promise((resolve, reject) => {
      const razorpay = new RazorpayCheckout({
        key: checkout.key,
        amount: checkout.amount,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        order_id: checkout.orderId,
        notes: checkout.notes,
        prefill: checkout.prefill || { name: selectedBuyerName },
        theme: { color: "#1f63ff" },
        modal: { ondismiss: () => reject(new Error("Payment was cancelled before completion.")) },
        handler: async (response) => {
          try {
            const verificationResponse = await verifyPublicMarketplacePayment({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });
            const verifiedGuestAccess = verificationResponse.data?.guestAccess;
            if (!verifiedGuestAccess?.purchaseId || !verifiedGuestAccess?.token) {
              throw new Error("Payment succeeded, but secure download access could not be prepared.");
            }
            resolve({ guestAccess: { ...verifiedGuestAccess, buyerName: selectedBuyerName }, receipt: verificationResponse.data?.receipt || null });
          } catch (requestError) {
            reject(requestError);
          }
        },
      });
      razorpay.open();
    });

    storeGuestPurchaseAccess(listing.id, verificationResult.guestAccess);
    setGuestAccess(verificationResult.guestAccess);
    setGuestFullName(selectedBuyerName);
    setWizardStep(2);
    setPdfDownloadStatus("ready");
    if (verificationResult.receipt) {
      setReceiptSlip(verificationResult.receipt);
      await downloadReceiptSlip(verificationResult.receipt, { silent: true }).catch(() => {});
    }
    setFeedback({
      type: "success",
      message: `Payment successful. "${listing.title}" is ready to download.`,
      detail: verificationResult.guestAccess.expiresAt
        ? `Guest access remains active until ${new Date(verificationResult.guestAccess.expiresAt).toLocaleString()}.`
        : "Step 2 is now ready for your PDF download.",
      showGuestDownload: true,
      showAccountDownload: false,
    });

    try {
      await handleGuestDownload(verificationResult.guestAccess, { silent: true });
    } catch {
      setFeedback({
        type: "success",
        message: `Payment successful. "${listing.title}" is unlocked.`,
        detail: "Use the step 2 download button below if the file did not start automatically.",
        showGuestDownload: true,
        showAccountDownload: false,
      });
    }
  }

  async function handlePurchase() {
    if (!listing?.id) return;
    if (releaseLocked) {
      setFeedback({
        type: "error",
        message: `This PDF will unlock on ${formatMarketplaceDate(listing.releaseAt)}.`,
        detail: "Payment and download stay disabled until the scheduled release time arrives.",
        showGuestDownload: false,
        showAccountDownload: false,
      });
      return;
    }

    setFeedback(DEFAULT_FEEDBACK);
    setIsPurchasing(true);
    setWizardStep(1);
    try {
      if (isAuthenticated) await handleAuthenticatedPurchase();
      else await handlePublicPurchase();
    } catch (requestError) {
      setFeedback({
        type: "error",
        message: requestError.message || "Unable to complete the checkout flow.",
        detail: "",
        showGuestDownload: false,
        showAccountDownload: false,
      });
      setPdfDownloadStatus("idle");
    } finally {
      setIsPurchasing(false);
    }
  }

  function handleDownloadStepAction() {
    if (feedback.showGuestDownload && guestAccess) return void handleGuestDownload();
    if (feedback.showAccountDownload && accountPurchaseId) return void handleAccountDownload();
    return void handlePurchase();
  }

  function getDownloadButtonLabel() {
    if (releaseLocked && releaseCountdown) return `Locked - ${releaseCountdown.shortLabel}`;
    if (feedback.showGuestDownload && guestAccess) return isGuestDownloading ? "Preparing PDF..." : "Download PDF";
    if (feedback.showAccountDownload && accountPurchaseId) return isAccountDownloading ? "Preparing PDF..." : "Download PDF";
    if (isPurchasing) return "Opening secure payment...";
    return `Download PDF - Rs. ${listing?.priceInr || 0}`;
  }

  useEffect(() => {
    if (
      !searchParams.get("buy") ||
      !isAuthenticated ||
      !accessToken ||
      !listing?.id ||
      !selectedBuyerName ||
      releaseLocked ||
      isLoading ||
      autoPurchaseAttemptedRef.current
    ) {
      return;
    }
    autoPurchaseAttemptedRef.current = true;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("checkout", "1");
    nextParams.delete("buy");
    setSearchParams(nextParams, { replace: true });
    setWizardStep(1);
    handlePurchase();
  }, [accessToken, isAuthenticated, isLoading, listing?.id, releaseLocked, searchParams, selectedBuyerName, setSearchParams]);

  const seoPayload = listing
    ? buildSeoPayload({
        title: listing.seoTitle || listing.title,
        description: listing.seoDescription || listing.description || "Compact exam-ready PDF listing.",
        pathname: `/pdf/${listing.slug}`,
        type: "product",
        jsonLd: [
          buildProductSchema({ title: listing.title, description: listing.description, pathname: `/pdf/${listing.slug}`, priceInr: listing.priceInr, sellerName: listing.sellerName }),
          buildBreadcrumbSchema([{ label: "Home", href: "/" }, { label: "Marketplace", href: "/marketplace" }, { label: listing.title, href: `/pdf/${listing.slug}` }]),
        ],
      })
    : null;

  const detailSummary = listing?.description || "Enter your name, complete secure payment, auto-download the PDF, and optionally save the payment receipt.";

  function renderWizardPanel() {
    if (wizardStep === 1) {
      return (
        <div className="pdf-checkout-panel-stack">
          <div className="pdf-checkout-copy-block"><p className="eyebrow">Step 1</p><h2>Enter name, pay, and auto-download</h2><p className="support-copy">One compact secure step for buyer name, Razorpay payment, and automatic PDF download.</p></div>
          <label className="field"><span>Full name</span><input autoCapitalize="words" autoComplete="name" className="input" disabled={isPurchasing} maxLength={80} onChange={(event) => setGuestFullName(event.target.value)} placeholder="Enter your full name" spellCheck="false" type="text" value={guestFullName} /></label>
         
          {releaseLocked ? <div className="simple-release-lock-card"><span className="info-label">Scheduled release</span><strong>{formatMarketplaceDate(listing?.releaseAt)}</strong>{releaseCountdown ? <strong className="simple-release-countdown">{releaseCountdown.shortLabel}</strong> : null}</div> : null}
          
          {feedback.message ? <div className="stack-section"><p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>{feedback.detail ? <p className="support-copy">{feedback.detail}</p> : null}</div> : null}
          <div className="pdf-checkout-actions">
            <button className="button secondary" onClick={closeCheckoutWizard} type="button"><i className="bi bi-arrow-left" />Back</button>
            <button className="button primary animated-download-button" disabled={releaseLocked || isPurchasing || !selectedBuyerName} onClick={() => (selectedBuyerName ? handlePurchase() : setFeedback({ type: "error", message: "Enter your full name before starting secure payment.", detail: "", showGuestDownload: false, showAccountDownload: false }))} type="button"><i className="bi bi-credit-card-2-front download-button-icon" />{isPurchasing ? "Opening secure payment..." : `Pay & auto-download PDF`}</button>
          </div>
        </div>
      );
    }

    return (
      <div className="pdf-checkout-panel-stack">
        <div className="pdf-checkout-inline-hero compact">
          <div className="pdf-checkout-inline-metric"><span className="info-label">PDF status</span><strong>{pdfDownloadStatus === "downloaded" ? "Started" : pdfDownloadStatus === "downloading" ? "Preparing..." : hasDownloadAccess ? "Ready" : "Locked"}</strong></div>
          <div className="pdf-checkout-inline-metric"><span className="info-label">Receipt</span><strong>{receiptStatus === "downloaded" ? "Saved" : receiptStatus === "downloading" ? "Preparing..." : receiptSlip ? "Ready" : "Optional"}</strong></div>
        </div>
        {feedback.message ? <div className="stack-section"><p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>{feedback.detail ? <p className="support-copy">{feedback.detail}</p> : null}</div> : null}
        <div className="pdf-checkout-actions">
          {receiptSlip ? <button className="button secondary" onClick={() => downloadReceiptSlip(receiptSlip)} type="button"><i className="bi bi-receipt-cutoff" />Download receipt</button> : null}
          <button className="button primary full-width animated-download-button" disabled={releaseLocked || isPurchasing || isGuestDownloading || isAccountDownloading} onClick={handleDownloadStepAction} type="button"><i className={`bi ${releaseLocked ? "bi-lock" : "bi-download"} download-button-icon${releaseLocked ? " is-locked" : ""}`} />Download PDF again</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {seoPayload ? <SeoHead {...seoPayload} /> : null}
      {isLoading ? (
        <LoadingCard message="Loading PDF..." />
      ) : error ? (
        <EmptyStateCard title="PDF unavailable" description={error} />
      ) : (
        <>
          <section className="stack-section simple-pdf-detail-page">
            <article className="detail-card simple-pdf-detail-shell">
              <div className="simple-pdf-detail-headline">
                <Link className="inline-link-chip" to="/marketplace"><i className="bi bi-arrow-left" />Back to marketplace</Link>
                <p className="eyebrow">Selected PDF</p>
                <h1>{listing?.title || slug || "PDF"}</h1>
                <p className="support-copy">{detailSummary}</p>
              </div>
              <div className="simple-pdf-detail-body">
                <article className="detail-card simple-pdf-detail-summary">
                  {listing?.coverImageUrl ? <div className="simple-pdf-cover"><img alt={coverAlt} className="simple-pdf-cover-image" src={listing.coverImageUrl} /></div> : null}
                  <div className="simple-pdf-detail-summary-row">
                    <div><span className="info-label">Price</span><strong>Rs. {listing?.priceInr || 0}</strong></div>
                    <div><span className="info-label">Release</span><strong>{releaseLabel || "-"}</strong></div>
                  </div>
                  <p className="support-copy">One secure payment flow for this PDF.</p>
                </article>
                <article className="detail-card simple-pdf-download-panel">
                  <p className="eyebrow">Secure checkout</p>
                  <h2>Open the full-screen download flow</h2>
                  <p className="support-copy">2-step ultra-fast checkout.</p>
                  <button className="button primary full-width" onClick={() => openCheckoutWizard(1)} type="button"><i className="bi bi-stars" />Start 2-step checkout</button>
                </article>
              </div>
            </article>
          </section>

          {isCheckoutOpen ? (
            <div className="pdf-checkout-overlay" onClick={closeCheckoutWizard} role="presentation">
              <div aria-labelledby="pdf-checkout-title" aria-modal="true" className="pdf-checkout-modal" onClick={(event) => event.stopPropagation()} role="dialog">
                <div className="pdf-checkout-header">
                  <div><p className="eyebrow">Secure PDF download</p><h2 id="pdf-checkout-title">{listing?.title || "Selected PDF"}</h2></div>
                  <button className="pdf-checkout-close" onClick={closeCheckoutWizard} type="button"><i className="bi bi-x-lg" /></button>
                </div>
                <div className="pdf-checkout-progress">
                  <div className="pdf-checkout-progress-bar"><span style={{ width: `${progressValue}%` }} /></div>
                  <div className="pdf-checkout-stepper" role="list">
                    {STEPS.map((step) => {
                      const state = getStepState(step.id, wizardStep, hasDownloadAccess, pdfDownloadStatus);
                      return (
                        <div className={`pdf-checkout-step ${state}`} key={step.id} role="listitem">
                          <span className="pdf-checkout-step-icon"><i className={`bi ${state === "complete" ? "bi-check2" : step.icon}`} /></span>
                          <div className="pdf-checkout-step-copy"><strong>{step.title}</strong><small>{step.label}</small></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="pdf-checkout-main">
                  <aside className="pdf-checkout-preview detail-card">
                    <p className="eyebrow">Selected PDF</p>
                    {listing?.coverImageUrl ? <div className="simple-pdf-cover pdf-checkout-cover"><img alt={coverAlt} className="simple-pdf-cover-image" src={listing.coverImageUrl} /></div> : null}
                    <div className="pdf-checkout-preview-copy"><h3>{listing?.title || "PDF"}</h3><p className="support-copy">One file. One secure payment.</p></div>
                    <div className="pdf-checkout-mini-grid">
                      <div><span className="info-label">Price</span><strong>Rs. {listing?.priceInr || 0}</strong></div>
                      <div><span className="info-label">Release</span><strong>{releaseLabel || "-"}</strong></div>
                    </div>
                  </aside>
                  <section className="pdf-checkout-panel detail-card">{renderWizardPanel()}</section>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
