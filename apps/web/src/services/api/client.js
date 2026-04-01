const LOCAL_API_BASE_URL = "http://localhost:4000/api/v1";
const KNOWN_RENDER_API_BASE_URLS = {
  "https://examnovaai.onrender.com": "https://examnova-b9rf.onrender.com/api/v1",
};

function normalizeUrl(value) {
  return String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");
}

function getApiBaseUrl() {
  const runtimeOrigin =
    typeof window !== "undefined" ? normalizeUrl(window.location.origin) : "";

  if (runtimeOrigin && KNOWN_RENDER_API_BASE_URLS[runtimeOrigin]) {
    return KNOWN_RENDER_API_BASE_URLS[runtimeOrigin];
  }

  return normalizeUrl(import.meta.env.VITE_API_BASE_URL) || LOCAL_API_BASE_URL;
}

export const API_BASE_URL = getApiBaseUrl();

function extractDownloadFilename(contentDisposition = "") {
  const normalizedHeader = String(contentDisposition || "").trim();
  if (!normalizedHeader) {
    return "";
  }

  const utfMatch = normalizedHeader.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1].trim());
    } catch {
      return utfMatch[1].trim();
    }
  }

  const quotedMatch = normalizedHeader.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim();
  }

  const plainMatch = normalizedHeader.match(/filename=([^;]+)/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim().replace(/^['"]|['"]$/g, "");
  }

  return "";
}

function createRequestSignal(timeoutMs, externalSignal) {
  if (!timeoutMs && !externalSignal) {
    return { signal: undefined, cleanup: () => {} };
  }

  if (!timeoutMs) {
    return { signal: externalSignal, cleanup: () => {} };
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  let removeAbortListener = () => {};

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      const abortListener = () => controller.abort();
      externalSignal.addEventListener("abort", abortListener, { once: true });
      removeAbortListener = () => externalSignal.removeEventListener("abort", abortListener);
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      globalThis.clearTimeout(timeoutId);
      removeAbortListener();
    },
  };
}

export async function apiRequest(path, options = {}) {
  const { headers: optionHeaders = {}, timeoutMs, signal: optionSignal, ...restOptions } = options;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const hasBody = options.body !== undefined && options.body !== null;
  const { signal, cleanup } = createRequestSignal(timeoutMs, optionSignal);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      headers: {
        ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...optionHeaders,
      },
      signal,
      ...restOptions,
    });
  } catch (error) {
    cleanup();

    if (error?.name === "AbortError") {
      const timeoutError = new Error("Request timed out.");
      timeoutError.status = 408;
      throw timeoutError;
    }

    throw error;
  }

  cleanup();

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || "Request failed.");
    error.status = response.status;
    error.details = payload.details || null;
    error.meta = payload.meta || null;
    error.requestId = payload.meta?.requestId || null;
    if (response.status === 401 && typeof window !== "undefined" && optionHeaders.Authorization) {
      window.dispatchEvent(
        new CustomEvent("examnova:unauthorized", {
          detail: {
            path,
            message: error.message,
          },
        }),
      );
    }
    throw error;
  }

  return payload;
}

export async function apiDownloadRequest(path, options = {}) {
  const { headers = {}, timeoutMs, signal: optionSignal, ...restOptions } = options;
  const { signal, cleanup } = createRequestSignal(timeoutMs, optionSignal);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      credentials: "include",
      headers,
      signal,
      ...restOptions,
    });
  } catch (error) {
    cleanup();

    if (error?.name === "AbortError") {
      const timeoutError = new Error("Download timed out.");
      timeoutError.status = 408;
      throw timeoutError;
    }

    throw error;
  }

  cleanup();

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.message || "Download failed.");
    error.status = response.status;
    error.details = payload.details || null;
    error.meta = payload.meta || null;
    error.requestId = payload.meta?.requestId || null;
    if (response.status === 401 && typeof window !== "undefined" && headers.Authorization) {
      window.dispatchEvent(
        new CustomEvent("examnova:unauthorized", {
          detail: {
            path,
            message: error.message,
          },
        }),
      );
    }
    throw error;
  }

  return {
    blob: await response.blob(),
    filename: extractDownloadFilename(response.headers.get("content-disposition") || ""),
  };
}

export async function apiDownload(path, accessToken) {
  return apiDownloadRequest(path, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function apiPublicDownload(path, headers = {}) {
  return apiDownloadRequest(path, { headers });
}
