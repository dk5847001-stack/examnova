import { apiRequest } from "./client.js";

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function fetchAdminDashboard(accessToken) {
  return apiRequest("/admin/dashboard", {
    headers: authHeaders(accessToken),
  });
}

export function fetchAdminAnalyticsOverview(accessToken) {
  return apiRequest("/admin/analytics/overview", {
    headers: authHeaders(accessToken),
  });
}

export function fetchAdminTrendAnalytics(accessToken) {
  return apiRequest("/admin/analytics/trends", {
    headers: authHeaders(accessToken),
  });
}

export function fetchAdminAlerts(accessToken) {
  return apiRequest("/admin/alerts", {
    headers: authHeaders(accessToken),
  });
}

export function fetchAdminAuditLogs(accessToken, query = "") {
  return apiRequest(`/admin/audit-logs${query ? `?${query}` : ""}`, {
    headers: authHeaders(accessToken),
  });
}

export function fetchAdminModerationQueue(accessToken, query = "") {
  return apiRequest(`/admin/moderation/listings${query ? `?${query}` : ""}`, {
    headers: authHeaders(accessToken),
  });
}

export function fetchAdminUsers(accessToken, query = "") {
  return apiRequest(`/admin/users${query ? `?${query}` : ""}`, {
    headers: authHeaders(accessToken),
  });
}

export function fetchAdminUser(accessToken, userId) {
  return apiRequest(`/admin/users/${userId}`, {
    headers: authHeaders(accessToken),
  });
}

export function updateAdminUserStatus(accessToken, userId, payload) {
  return apiRequest(`/admin/users/${userId}/status`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export function fetchAdminListings(accessToken) {
  return apiRequest("/admin/listings", {
    headers: authHeaders(accessToken),
  });
}

export function fetchAdminUploads(accessToken) {
  return apiRequest("/admin-content/uploads", {
    headers: authHeaders(accessToken),
  });
}

export function createAdminUpload(accessToken, formData) {
  return apiRequest("/admin-content/uploads", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: formData,
  });
}

export function updateAdminUpload(accessToken, uploadId, payload) {
  return apiRequest(`/admin-content/uploads/${uploadId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

export function fetchAdminUpcoming(accessToken) {
  return apiRequest("/admin-content/upcoming", {
    headers: authHeaders(accessToken),
  });
}

export function createAdminUpcoming(accessToken, payload) {
  return apiRequest("/admin-content/upcoming", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateAdminUpcoming(accessToken, upcomingId, payload) {
  return apiRequest(`/admin-content/upcoming/${upcomingId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateAdminUpcomingStatus(accessToken, upcomingId, payload) {
  return apiRequest(`/admin-content/upcoming/${upcomingId}/status`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export function updateAdminListingStatus(accessToken, listingId, payload) {
  return apiRequest(`/admin/listings/${listingId}/status`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export function fetchAdminPurchases(accessToken) {
  return apiRequest("/admin/purchases", {
    headers: authHeaders(accessToken),
  });
}

export function fetchAdminPayments(accessToken) {
  return apiRequest("/admin/payments", {
    headers: authHeaders(accessToken),
  });
}

export function fetchAdminWithdrawals(accessToken) {
  return apiRequest("/admin/withdrawals", {
    headers: authHeaders(accessToken),
  });
}

export function updateAdminWithdrawalStatus(accessToken, withdrawalId, payload) {
  return apiRequest(`/admin/withdrawals/${withdrawalId}/status`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}
