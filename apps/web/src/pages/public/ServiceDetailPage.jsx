import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard.jsx";
import { LoadingCard } from "../../components/ui/LoadingCard.jsx";
import { getServiceCategoryLabel } from "../../features/marketplace/marketplace.constants.js";
import { useAuth } from "../../hooks/useAuth.js";
import { SeoHead } from "../../seo/SeoHead.jsx";
import {
  createPublicServiceOrder,
  createServiceOrder,
  downloadGuestLibraryItem,
  downloadLibraryItem,
  fetchLibrary,
  fetchPublicServiceDetail,
  verifyPublicServicePayment,
  verifyServicePayment,
} from "../../services/api/index.js";
import { loadRazorpayCheckout } from "../../utils/loadRazorpayCheckout.js";
import { buildBreadcrumbSchema, buildProductSchema, buildSeoPayload } from "../../utils/seo.js";

const DEFAULT_FEEDBACK = { type: "", message: "", detail: "" };

function getGuestServiceStorageKey(serviceId) {
  return `examnova:guest-service-access:${serviceId}`;
}

function readGuestServiceAccess(serviceId) {
  if (typeof window === "undefined" || !serviceId) {
    return null;
  }

  const storageKey = getGuestServiceStorageKey(serviceId);

  try {
    const sessionValue = window.sessionStorage.getItem(storageKey);
    const rawValue = sessionValue || window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return null;
    }

    if (!sessionValue) {
      window.sessionStorage.setItem(storageKey, rawValue);
      window.localStorage.removeItem(storageKey);
    }

    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue?.purchaseId || !parsedValue?.token) {
      return null;
    }

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

function storeGuestServiceAccess(serviceId, access) {
  if (typeof window === "undefined" || !serviceId || !access?.purchaseId || !access?.token) {
    return;
  }

  const storageKey = getGuestServiceStorageKey(serviceId);
  window.sessionStorage.setItem(storageKey, JSON.stringify(access));
  window.localStorage.removeItem(storageKey);
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 80);
}

function triggerDownload(blob, fileName) {
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = fileName || "website-package.zip";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export function ServiceDetailPage() {
  const { slug } = useParams();
  const { accessToken, isAuthenticated, user } = useAuth();
  const [service, setService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [feedback, setFeedback] = useState(DEFAULT_FEEDBACK);
  const [guestAccess, setGuestAccess] = useState(null);
  const [ownedPurchase, setOwnedPurchase] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadService() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetchPublicServiceDetail(slug);
        if (active) {
          setService(response.data.item || null);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.message || "Unable to load website service.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    if (slug) {
      loadService();
    }

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (isAuthenticated && user?.name && !fullName) {
      setFullName(user.name);
    }
  }, [fullName, isAuthenticated, user?.name]);

  useEffect(() => {
    let active = true;

    async function loadOwnedPurchase() {
      try {
        const response = await fetchLibrary(accessToken);
        if (!active) {
          return;
        }

        const match = (response.data.items || []).find(
          (item) =>
            item.resourceKind === "service" &&
            (item.serviceListingId === service.id || item.slug === service.slug),
        );

        setOwnedPurchase(match || null);
      } catch {
        if (active) {
          setOwnedPurchase(null);
        }
      }
    }

    if (isAuthenticated && accessToken && service?.id) {
      loadOwnedPurchase();
    } else {
      setOwnedPurchase(null);
    }

    return () => {
      active = false;
    };
  }, [accessToken, isAuthenticated, service?.id, service?.slug]);

  useEffect(() => {
    if (!service?.id) {
      return;
    }

    const storedAccess = readGuestServiceAccess(service.id);
    if (storedAccess) {
      setGuestAccess(storedAccess);
      setFeedback({
        type: "success",
        message: `Your download access for "${service.title}" is active on this device.`,
        detail: storedAccess.expiresAt
          ? `Secure guest access remains active until ${new Date(storedAccess.expiresAt).toLocaleString()}.`
          : "",
      });
    }
  }, [service?.id, service?.title]);

  useEffect(() => {
    if (!ownedPurchase?.id || !service?.title) {
      return;
    }

    setFeedback((current) =>
      current.message
        ? current
        : {
            type: "success",
            message: `You already own "${service.title}". ZIP download and repo access are ready below.`,
            detail: "",
          },
    );
  }, [ownedPurchase?.id, service?.title]);

  const normalizedName = normalizeName(fullName);
  const pricing = service?.pricing || {};
  const hasServiceAccess = Boolean(guestAccess?.purchaseId || ownedPurchase?.id);
  const privateRepoUrl =
    ownedPurchase?.serviceDetails?.repoUrl || guestAccess?.servicePurchase?.serviceDetails?.repoUrl || "";

  async function handleDownload() {
    if (!service?.title) {
      return;
    }

    setIsDownloading(true);

    try {
      const response =
        guestAccess?.purchaseId && guestAccess?.token
          ? await downloadGuestLibraryItem(guestAccess.purchaseId, guestAccess.token)
          : await downloadLibraryItem(accessToken, ownedPurchase.id);

      triggerDownload(response.blob, response.filename || `${service.title}.zip`);
    } catch (requestError) {
      if (guestAccess?.purchaseId && (requestError.status === 401 || requestError.status === 403)) {
        const storageKey = getGuestServiceStorageKey(service.id);
        window.sessionStorage.removeItem(storageKey);
        window.localStorage.removeItem(storageKey);
        setGuestAccess(null);
      }
      setFeedback({
        type: "error",
        message: requestError.message || "Unable to download website ZIP.",
        detail: "",
      });
    } finally {
      setIsDownloading(false);
    }
  }

  async function handlePurchase() {
    if (!service?.id) {
      return;
    }

    if (!normalizedName) {
      setFeedback({
        type: "error",
        message: "Enter your full name before continuing.",
        detail: "",
      });
      return;
    }

    setIsPurchasing(true);
    setFeedback(DEFAULT_FEEDBACK);

    try {
      const createResponse = isAuthenticated
        ? await createServiceOrder(accessToken, service.id, normalizedName)
        : await createPublicServiceOrder(service.id, normalizedName);

      if (createResponse.data.alreadyOwned && createResponse.data.purchase) {
        setOwnedPurchase(createResponse.data.purchase);
        setFeedback({
          type: "success",
          message: `You already own "${service.title}". ZIP download and repo access are ready below.`,
          detail: "",
        });
        return;
      }

      const checkout = createResponse.data?.checkout;
      if (!checkout?.orderId || !checkout?.key) {
        throw new Error("Payment checkout is not available right now. Please try again in a moment.");
      }

      const RazorpayCheckout = await loadRazorpayCheckout();

      const result = await new Promise((resolve, reject) => {
        const razorpay = new RazorpayCheckout({
          key: checkout.key,
          amount: checkout.amount,
          currency: checkout.currency,
          name: checkout.name,
          description: checkout.description,
          order_id: checkout.orderId,
          notes: checkout.notes,
          prefill: checkout.prefill || { name: normalizedName },
          theme: { color: "#1f63ff" },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled before completion.")),
          },
          handler: async (response) => {
            try {
              const verificationResponse = isAuthenticated
                ? await verifyServicePayment(accessToken, {
                    paymentId: response.razorpay_payment_id,
                    orderId: response.razorpay_order_id,
                    signature: response.razorpay_signature,
                  })
                : await verifyPublicServicePayment({
                    paymentId: response.razorpay_payment_id,
                    orderId: response.razorpay_order_id,
                    signature: response.razorpay_signature,
                  });

              resolve(verificationResponse.data);
            } catch (requestError) {
              reject(requestError);
            }
          },
        });

        razorpay.open();
      });

      if (isAuthenticated) {
        setOwnedPurchase(result.purchase || null);
        setFeedback({
          type: "success",
          message: `Payment successful. "${service.title}" is unlocked.`,
          detail: "ZIP download and GitHub repo access are now available below.",
        });
      } else {
        const nextAccess = {
          ...(result.guestAccess || {}),
          servicePurchase: result.purchase || null,
        };
        storeGuestServiceAccess(service.id, nextAccess);
        setGuestAccess(nextAccess);
        setFeedback({
          type: "success",
          message: `Payment successful. "${service.title}" is unlocked.`,
          detail: "ZIP download and GitHub repo access are now available below.",
        });
      }
    } catch (requestError) {
      setFeedback({
        type: "error",
        message: requestError.message || "Unable to complete the website service checkout.",
        detail: "",
      });
    } finally {
      setIsPurchasing(false);
    }
  }

  const seoPayload = service
    ? buildSeoPayload({
        title: service.seoTitle || service.title,
        description: service.seoDescription || service.shortDescription,
        pathname: `/services/${service.slug}`,
        type: "product",
        jsonLd: [
          buildProductSchema({
            title: service.title,
            description: service.shortDescription,
            pathname: `/services/${service.slug}`,
            priceInr: pricing.currentPriceInr || 0,
            sellerName: "ExamNova Admin",
          }),
          buildBreadcrumbSchema([
            { label: "Home", href: "/" },
            { label: "Marketplace", href: "/marketplace" },
            { label: service.title, href: `/services/${service.slug}` },
          ]),
        ],
      })
    : null;

  if (isLoading) {
    return <LoadingCard message="Loading website service..." />;
  }

  if (error) {
    return <EmptyStateCard title="Website service unavailable" description={error} />;
  }

  if (!service) {
    return <EmptyStateCard title="Website service not found" description="This website service is not available right now." />;
  }

  return (
    <>
      {seoPayload ? <SeoHead {...seoPayload} /> : null}

      <section className="stack-section simple-pdf-detail-page">
        <article className="detail-card simple-pdf-detail-shell service-detail-shell">
          <div className="simple-pdf-detail-headline">
            <Link className="inline-link-chip" to="/marketplace">
              <i className="bi bi-arrow-left" />
              Back to marketplace
            </Link>
            <p className="eyebrow">{getServiceCategoryLabel(service.category)}</p>
            <h1>{service.title}</h1>
            <p className="support-copy">{service.shortDescription}</p>
          </div>

          <div className="simple-pdf-detail-body">
            <article className="detail-card simple-pdf-detail-summary">
              {service.imageUrl ? (
                <div className="simple-pdf-cover">
                  <img alt={`${service.title} preview`} className="simple-pdf-cover-image" src={service.imageUrl} />
                </div>
              ) : null}
              <div className="simple-pdf-detail-summary-row">
                <div>
                  <span className="info-label">Current price</span>
                  <strong>Rs. {pricing.currentPriceInr || 0}</strong>
                </div>
                <div>
                  <span className="info-label">Discount</span>
                  <strong>{pricing.discountPercent ? `${pricing.discountPercent}% off` : "No offer"}</strong>
                </div>
              </div>
              <div className="marketplace-taxonomy">
                {(service.techStack || []).map((item) => (
                  <span key={`${service.id}-${item}`}>{item}</span>
                ))}
              </div>
            </article>

            <article className="detail-card simple-pdf-download-panel">
              <p className="eyebrow">Website package</p>
              <h2>Buy once, download ZIP, and unlock repo access</h2>
              <p className="support-copy">
                After purchase you can download the website ZIP package and open the linked GitHub repository instantly.
              </p>

              <label className="field">
                <span>Full name</span>
                <input
                  autoComplete="name"
                  className="input"
                  maxLength={80}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Enter your full name"
                  value={fullName}
                />
              </label>

              {feedback.message ? (
                <p className={feedback.type === "error" ? "form-error" : "form-success"}>{feedback.message}</p>
              ) : null}
              {feedback.detail ? <p className="support-copy">{feedback.detail}</p> : null}

              <div className="hero-actions">
                {service.demoUrl ? (
                  <a className="button ghost" href={service.demoUrl} rel="noreferrer" target="_blank">
                    <i className="bi bi-box-arrow-up-right" />
                    Live demo
                  </a>
                ) : null}
                {hasServiceAccess ? (
                  <button className="button primary" disabled={isDownloading} onClick={handleDownload} type="button">
                    <i className="bi bi-file-earmark-zip" />
                    {isDownloading ? "Preparing ZIP..." : "Download ZIP"}
                  </button>
                ) : (
                  <button className="button primary" disabled={isPurchasing} onClick={handlePurchase} type="button">
                    <i className="bi bi-credit-card-2-front" />
                    {isPurchasing ? "Opening secure payment..." : `Buy now - Rs. ${pricing.currentPriceInr || 0}`}
                  </button>
                )}
                {privateRepoUrl ? (
                  <a className="button secondary" href={privateRepoUrl} rel="noreferrer" target="_blank">
                    <i className="bi bi-github" />
                    GitHub repo
                  </a>
                ) : null}
              </div>
            </article>
          </div>

          <article className="detail-card service-detail-body-card">
            <p className="eyebrow">View in details</p>
            <h2>What you get</h2>
            <p className="support-copy service-detail-body-copy">
              {service.details || "Production-ready website package with ZIP delivery, demo access, and clean reusable frontend structure."}
            </p>
          </article>
        </article>
      </section>
    </>
  );
}
