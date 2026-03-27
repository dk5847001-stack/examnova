import { apiRequest } from "./client.js";

function authHeaders(accessToken) {
  return accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : {};
}

function toQueryString(filters = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function fetchPublicListings(filters = {}) {
  return apiRequest(`/marketplace/public/listings${toQueryString(filters)}`);
}

export function fetchPublicListingDetail(slug) {
  return apiRequest(`/marketplace/public/listings/${slug}`);
}

export function fetchEligibleGeneratedPdfs(accessToken) {
  return apiRequest("/marketplace/eligible-pdfs", {
    headers: authHeaders(accessToken),
  });
}

export function fetchMyListings(accessToken) {
  return apiRequest("/marketplace/my-listings", {
    headers: authHeaders(accessToken),
  });
}

export function createMarketplaceListing(accessToken, payload) {
  return apiRequest("/marketplace/listings", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

export function updateMarketplaceListing(accessToken, listingId, payload) {
  return apiRequest(`/marketplace/listings/${listingId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}
