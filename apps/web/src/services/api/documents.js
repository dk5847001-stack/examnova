import { API_BASE_URL, apiRequest } from "./client.js";

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function listDocuments(accessToken) {
  return apiRequest("/uploads", {
    headers: authHeaders(accessToken),
  });
}

export function getDocument(accessToken, documentId) {
  return apiRequest(`/uploads/${documentId}`, {
    headers: authHeaders(accessToken),
  });
}

export async function uploadDocument(accessToken, uploadPayload) {
  const formData = new FormData();
  formData.append("document", uploadPayload.file);

  Object.entries(uploadPayload).forEach(([key, value]) => {
    if (key === "file" || value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      formData.append(key, value.join(","));
      return;
    }

    formData.append(key, typeof value === "boolean" ? String(value) : value);
  });

  const response = await fetch(`${API_BASE_URL}/uploads`, {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Upload failed.");
    error.status = response.status;
    error.details = payload.details || null;
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("examnova:unauthorized", {
          detail: {
            path: "/uploads",
            message: error.message,
          },
        }),
      );
    }
    throw error;
  }

  return payload;
}

export function retryParsing(accessToken, documentId) {
  return apiRequest(`/uploads/${documentId}/retry-parsing`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export function archiveDocument(accessToken, documentId) {
  return apiRequest(`/uploads/${documentId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
}
