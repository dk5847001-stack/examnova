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
import {
  formatMarketplaceDate,
  getCountdownParts,
  isListingReleaseLocked,
} from "../../utils/marketplaceAvailability.js";
import { buildBreadcrumbSchema, buildProductSchema, buildSeoPayload } from "../../utils/seo.js";

const DEFAULT_FEEDBACK = {
  type: "",
  message: "",
  detail: "",
  showGuestDownload: false,
  showAccountDownload: false,
};

function normalizeGuestName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function getGuestPurchaseStorageKey(listingId) {
  return `examnova:guest-marketplace-access:${listingId}`;
}

function readGuestPurchaseAccess(listingId) {
  if (typeof window === "undefined" || !listingId) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(getGuestPurchaseStorageKey(listingId));
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue?.purchaseId || !parsedValue?.token) {
      window.sessionStorage.removeItem(getGuestPurchaseStorageKey(listingId));
      return null;
    }

    if (parsedValue.expiresAt && new Date(parsedValue.expiresAt).getTime() <= Date.now()) {
      window.sessionStorage.removeItem(getGuestPurchaseStorageKey(listingId));
      return null;
    }

    return parsedValue;
  } catch {
    window.sessionStorage.removeItem(getGuestPurchaseStorageKey(listingId));
    return null;
  }
}

function storeGuestPurchaseAccess(listingId, access) {
  if (typeof window === "undefined" || !listingId || !access?.purchaseId || !access?.token) {
    return;
  }

  window.sessionStorage.setItem(getGuestPurchaseStorageKey(listingId), JSON.stringify(access));
}

function clearGuestPurchaseAccess(listingId) {
  if (typeof window === "undefined" || !listingId) {
    return;
  }

  window.sessionStorage.removeItem(getGuestPurchaseStorageKey(listingId));
}

function triggerBlobDownload(blob, title) {
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = `${title || "marketplace-pdf"}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
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
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const autoPurchaseAttemptedRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadListing() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetchPublicListingDetail(slug);
        if (active) {
          setListing(response.data.listing || null);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load marketplace listing.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (slug) {
      loadListing();
    }

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (isAuthenticated && user?.name && !guestFullName) {
      setGuestFullName(user.name);
    }
  }, [guestFullName, isAuthenticated, user?.name]);

  useEffect(() => {
    if (!listing?.id) {
      return;
    }

    const storedGuestAccess = readGuestPurchaseAccess(listing.id);
    setGuestAccess(storedGuestAccess);

    if (storedGuestAccess?.buyerName) {
      setGuestFullName(storedGuestAccess.buyerName);
    }

    if (storedGuestAccess && !feedback.message) {
      setFeedback({
        type: "success",
        message: `Your download access for "${listing.title}" is still active in this tab.`,
        detail: storedGuestAccess.expiresAt
          ? `Secure guest access remains active until ${new Date(storedGuestAccess.expiresAt).toLocaleString()}.`
          : "",
        showGuestDownload: true,
        showAccountDownload: false,
      });
    }
  }, [feedback.message, listing?.id, listing?.title]);

  useEffect(() => {
    if (
      !searchParams.get("buy") ||
      !isAuthenticated ||
      !accessToken ||
      !listing?.id ||
      !normalizeGuestName(guestFullName) ||
      isListingReleaseLocked(listing) ||
      isLoading ||
      autoPurchaseAttemptedRef.current
    ) {
      return;
    }

    autoPurchaseAttemptedRef.current = true;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("buy");
    setSearchParams(nextParams, { replace: true });
    handlePurchase();
  }, [accessToken, guestFullName, isAuthenticated, isLoading, listing?.id, searchParams, setSearchParams]);

  useEffect(() => {
    if (!listing?.releaseAt) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [listing?.releaseAt]);

  async function handleGuestDownload(access = guestAccess, { silent = false } = {}) {
    if (!access?.purchaseId || !access?.token) {
      if (!silent) {
        setFeedback({
          ...DEFAULT_FEEDBACK,
          type: "error",
          message: "Secure guest download is not ready yet.",
        });
      }
      return;
    }

    setIsGuestDownloading(true);

    try {
      const response = await downloadGuestLibraryItem(access.purchaseId, access.token);
      triggerBlobDownload(response.blob, listing?.title);
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) {
        clearGuestPurchaseAccess(listing?.id);
        setGuestAccess(null);
      }

      if (!silent) {
        setFeedback({
          type: "error",
          message: requestError.message || "Unable to download your PDF.",
          detail: "If payment already succeeded, start the download flow again from this page.",
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
      if (!silent) {
        setFeedback({
          ...DEFAULT_FEEDBACK,
          type: "error",
          message: "Your account download is not ready yet.",
        });
      }
      return;
    }

    setIsAccountDownloading(true);

    try {
      const response = await downloadLibraryItem(accessToken, purchaseId);
      triggerBlobDownload(response.blob, listing?.title);
    } catch (requestError) {
      if (!silent) {
        setFeedback({
          type: "error",
          message: requestError.message || "Unable to download this PDF from your account.",
          detail: "Try the download button again in a moment.",
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
    if (!accessToken) {
      throw new Error("Your session is still loading. Please try again in a moment.");
    }

    const normalizedBuyerName = normalizeGuestName(guestFullName);
    if (!normalizedBuyerName) {
      throw new Error("Enter your full name before continuing.");
    }

    const [RazorpayCheckout, orderResponse] = await Promise.all([
      loadRazorpayCheckout(),
      createMarketplaceOrder(accessToken, listing.id, normalizedBuyerName),
    ]);

    if (orderResponse.data.alreadyOwned) {
      const existingPurchaseId = orderResponse.data?.purchase?.id || "";
      setAccountPurchaseId(existingPurchaseId);

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
          detail: "Use the download button below to fetch the PDF from your account.",
          showGuestDownload: false,
          showAccountDownload: Boolean(existingPurchaseId),
        });
      }
      return;
    }

    const checkout = orderResponse.data?.checkout;
    if (!checkout?.orderId || !checkout?.key) {
      throw new Error("Payment checkout is not available right now. Please try again in a moment.");
    }

    const purchaseId = await new Promise((resolve, reject) => {
      const razorpay = new RazorpayCheckout({
        key: checkout.key,
        amount: checkout.amount,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        order_id: checkout.orderId,
        notes: checkout.notes,
        prefill: checkout.prefill || { name: normalizedBuyerName },
        theme: { color: "#cc6f29" },
        modal: {
          ondismiss: () => reject(new Error("Payment was cancelled before completion.")),
        },
        handler: async (response) => {
          try {
            const verificationResponse = await verifyMarketplacePayment(accessToken, {
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
            });
            resolve(verificationResponse.data?.purchase?.id || "");
          } catch (requestError) {
            reject(requestError);
          }
        },
      });

      razorpay.open();
    });

    if (!purchaseId) {
      throw new Error("Payment succeeded, but account download access could not be prepared.");
    }

    setAccountPurchaseId(purchaseId);

    try {
      await handleAccountDownload(purchaseId, { silent: true });
      setFeedback({
        type: "success",
        message: `Payment successful. "${listing.title}" is now downloading from your account access.`,
        detail: "",
        showGuestDownload: false,
        showAccountDownload: true,
      });
    } catch {
      setFeedback({
        type: "success",
        message: `Payment successful. "${listing.title}" is unlocked in your account.`,
        detail: "Use the download button below if the file did not start automatically.",
        showGuestDownload: false,
        showAccountDownload: true,
      });
    }
  }

  async function handlePublicPurchase() {
    const normalizedGuestName = normalizeGuestName(guestFullName);
    if (!normalizedGuestName) {
      throw new Error("Enter your full name before continuing.");
    }

    const [RazorpayCheckout, orderResponse] = await Promise.all([
      loadRazorpayCheckout(),
      createPublicMarketplaceOrder(listing.id, normalizedGuestName),
    ]);

    const checkout = orderResponse.data?.checkout;
    if (!checkout?.orderId || !checkout?.key) {
      throw new Error("Payment checkout is not available right now. Please try again in a moment.");
    }

    const nextGuestAccess = await new Promise((resolve, reject) => {
      const razorpay = new RazorpayCheckout({
        key: checkout.key,
        amount: checkout.amount,
        currency: checkout.currency,
        name: checkout.name,
        description: checkout.description,
        order_id: checkout.orderId,
        notes: checkout.notes,
        prefill: checkout.prefill || { name: normalizedGuestName },
        theme: { color: "#cc6f29" },
        modal: {
          ondismiss: () => reject(new Error("Payment was cancelled before completion.")),
        },
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
            resolve({
              ...verifiedGuestAccess,
              buyerName: normalizedGuestName,
            });
          } catch (requestError) {
            reject(requestError);
          }
        },
      });

      razorpay.open();
    });

    storeGuestPurchaseAccess(listing.id, nextGuestAccess);
    setGuestAccess(nextGuestAccess);
    setGuestFullName(normalizedGuestName);
    setFeedback({
      type: "success",
      message: `Payment successful. "${listing.title}" is ready to download.`,
      detail: nextGuestAccess.expiresAt
        ? `This guest download stays active in this tab until ${new Date(nextGuestAccess.expiresAt).toLocaleString()}.`
        : "Use the download button below if the file does not start automatically.",
      showGuestDownload: true,
      showAccountDownload: false,
    });

    try {
      await handleGuestDownload(nextGuestAccess, { silent: true });
    } catch {
      setFeedback({
        type: "success",
        message: `Payment successful. "${listing.title}" is unlocked.`,
        detail: nextGuestAccess.expiresAt
          ? `Use the download button below. Guest access remains active until ${new Date(nextGuestAccess.expiresAt).toLocaleString()}.`
          : "Use the download button below.",
        showGuestDownload: true,
        showAccountDownload: false,
      });
    }
  }

  async function handlePurchase() {
    if (!listing?.id) {
      return;
    }

    if (isListingReleaseLocked(listing)) {
      setFeedback({
        type: "error",
        message: `This PDF will unlock on ${formatMarketplaceDate(listing.releaseAt)}.`,
        detail: "The countdown above is live. Download stays disabled until the scheduled release time arrives.",
        showGuestDownload: false,
        showAccountDownload: false,
      });
      return;
    }

    setFeedback(DEFAULT_FEEDBACK);
    setIsPurchasing(true);

    try {
      if (isAuthenticated) {
        await handleAuthenticatedPurchase();
      } else {
        await handlePublicPurchase();
      }
    } catch (requestError) {
      setFeedback({
        type: "error",
        message: requestError.message || "Unable to complete the download flow.",
        detail: "",
        showGuestDownload: false,
        showAccountDownload: false,
      });
    } finally {
      setIsPurchasing(false);
    }
  }

  function handlePrimaryAction() {
    if (isListingReleaseLocked(listing)) {
      return;
    }

    if (feedback.showGuestDownload && guestAccess) {
      handleGuestDownload();
      return;
    }

    if (feedback.showAccountDownload && accountPurchaseId) {
      handleAccountDownload();
      return;
    }

    handlePurchase();
  }

  function getPrimaryButtonLabel() {
    const countdown = getCountdownParts(listing?.releaseAt, countdownNow);
    if (isListingReleaseLocked(listing) && countdown) {
      return `Download locked - ${countdown.shortLabel}`;
    }

    if (feedback.showGuestDownload && guestAccess) {
      return isGuestDownloading ? "Preparing download..." : "Download PDF";
    }

    if (feedback.showAccountDownload && accountPurchaseId) {
      return isAccountDownloading ? "Preparing download..." : "Download PDF";
    }

    if (isPurchasing) {
      return "Opening secure download...";
    }

    return `Download PDF - Rs. ${listing?.priceInr || 0}`;
  }

  const seoPayload = listing
    ? buildSeoPayload({
        title: listing.seoTitle || listing.title,
        description:
          listing.seoDescription ||
          listing.description ||
          "Compact exam-ready PDF listing with structured academic categorization.",
        pathname: `/pdf/${listing.slug}`,
        type: "product",
        jsonLd: [
          buildProductSchema({
            title: listing.title,
            description: listing.description,
            pathname: `/pdf/${listing.slug}`,
            priceInr: listing.priceInr,
            sellerName: listing.sellerName,
          }),
          buildBreadcrumbSchema([
            { label: "Home", href: "/" },
            { label: "Marketplace", href: "/marketplace" },
            { label: listing.title, href: `/pdf/${listing.slug}` },
          ]),
        ],
      })
    : null;

  const releaseLocked = isListingReleaseLocked(listing, countdownNow);
  const releaseCountdown = getCountdownParts(listing?.releaseAt, countdownNow);
  const selectedBuyerName = normalizeGuestName(guestFullName);
  const detailSummary =
    listing?.description ||
    "Enter your full name, continue to secure payment, and download this PDF from one clean page.";
  const releaseLabel = formatMarketplaceDate(listing?.releaseAt || listing?.publishedAt || listing?.createdAt);

  return (
    <>
      {seoPayload ? <SeoHead {...seoPayload} /> : null}
      {isLoading ? (
        <LoadingCard message="Loading PDF..." />
      ) : error ? (
        <EmptyStateCard title="PDF unavailable" description={error} />
      ) : (
        <section className="stack-section simple-pdf-detail-page">
          <article className="detail-card simple-pdf-detail-shell">
            <div className="simple-pdf-detail-headline">
              <Link className="inline-link-chip" to="/marketplace">
                <i className="bi bi-arrow-left" />
                Back to marketplace
              </Link>
              <p className="eyebrow">Selected PDF</p>
              <h1>{listing?.title || slug || "PDF"}</h1>
              <p className="support-copy">{detailSummary}</p>
            </div>

            <div className="simple-pdf-detail-body">
              <article className="detail-card simple-pdf-detail-summary">
                <div className="simple-pdf-detail-summary-row">
                  <div>
                    <span className="info-label">Price</span>
                    <strong>Rs. {listing?.priceInr || 0}</strong>
                  </div>
                  <div>
                    <span className="info-label">Release</span>
                    <strong>{releaseLabel || "-"}</strong>
                  </div>
                </div>
                <p className="support-copy">
                  The name you enter here will be embedded multiple times inside the downloaded PDF after payment verification.
                </p>
                {selectedBuyerName ? (
                  <div className="simple-personalization-note">
                    <span className="info-label">Personalized for</span>
                    <strong>{selectedBuyerName}</strong>
                  </div>
                ) : null}
              </article>

              <article className="detail-card simple-pdf-download-panel">
                <p className="eyebrow">Download PDF</p>
                <h2>Enter full name and continue</h2>

                {releaseLocked ? (
                  <div className="simple-release-lock-card">
                    <span className="info-label">Scheduled release</span>
                    <strong>{formatMarketplaceDate(listing?.releaseAt)}</strong>
                    <p className="support-copy">Download stays locked until the exact go-live time.</p>
                    {releaseCountdown ? <strong className="simple-release-countdown">{releaseCountdown.shortLabel}</strong> : null}
                  </div>
                ) : null}

                <label className="field">
                  <span>Full name</span>
                  <input
                    autoComplete="name"
                    className="input"
                    disabled={isPurchasing}
                    onChange={(event) => setGuestFullName(event.target.value)}
                    placeholder="Enter your full name"
                    type="text"
                    value={guestFullName}
                  />
                </label>

                {feedback.message ? (
                  <div className="stack-section">
                    <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
                    {feedback.detail ? <p className="support-copy">{feedback.detail}</p> : null}
                  </div>
                ) : null}

                <button
                  className="button primary full-width"
                  disabled={releaseLocked || isPurchasing || isGuestDownloading || isAccountDownloading}
                  onClick={handlePrimaryAction}
                  type="button"
                >
                  <i className={`bi ${releaseLocked ? "bi-lock" : "bi-download"}`} />
                  {getPrimaryButtonLabel()}
                </button>

                <p className="support-copy">
                  {isAuthenticated
                    ? "Your entered full name will stay attached to this purchase and the downloaded PDF will be personalized from your secure account access."
                    : "Guest download asks only for your full name here. Payment stays inside secure Razorpay checkout and the PDF unlocks only after verification."}
                </p>
              </article>
            </div>
          </article>
        </section>
      )}
    </>
  );
}
