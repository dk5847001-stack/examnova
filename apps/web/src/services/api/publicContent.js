import { apiRequest } from "./client.js";

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

export function fetchUpcomingLockedPdfs(filters = {}) {
  return apiRequest(`/public/upcoming-pdfs${toQueryString(filters)}`);
}

export function fetchUpcomingLockedPdfDetail(slug) {
  return apiRequest(`/public/upcoming-pdfs/${slug}`);
}

export function fetchPlatformUpdates() {
  return apiRequest("/public/platform-updates");
}
