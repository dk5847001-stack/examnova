import { apiRequest } from "./client.js";

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function createPrivatePdfOrder(accessToken, generationId) {
  return apiRequest("/payments/private-pdf-order", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ generationId }),
  });
}

export function createDeveloperModeOrder(accessToken) {
  return apiRequest("/payments/developer-mode-order", {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export function verifyPrivatePdfPayment(accessToken, payload) {
  return apiRequest("/payments/private-pdf-verify", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export function verifyDeveloperModePayment(accessToken, payload) {
  return apiRequest("/payments/developer-mode-verify", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export function getPrivatePdfPaymentStatus(accessToken, generationId) {
  return apiRequest(`/payments/private-pdf/${generationId}/status`, {
    headers: authHeaders(accessToken),
  });
}

export function createMarketplaceOrder(accessToken, listingId, fullName) {
  return apiRequest("/payments/marketplace-order", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ listingId, fullName }),
  });
}

export function createPublicMarketplaceOrder(listingId, fullName) {
  return apiRequest("/payments/public-marketplace-order", {
    method: "POST",
    body: JSON.stringify({ listingId, fullName }),
  });
}

export function verifyMarketplacePayment(accessToken, payload) {
  return apiRequest("/payments/marketplace-verify", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export function verifyPublicMarketplacePayment(payload) {
  return apiRequest("/payments/public-marketplace-verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
