import { apiRequest } from "./client.js";

export function signup(payload) {
  return apiRequest("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function verifyEmailOtp(payload) {
  return apiRequest("/auth/verify-email-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resendOtp(payload) {
  return apiRequest("/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
}

export function refreshSession(options = {}) {
  return apiRequest("/auth/refresh", {
    method: "POST",
    ...options,
  });
}

export function forgotPassword(payload) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetPassword(payload) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchProfile(accessToken, options = {}) {
  return apiRequest("/profile/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    ...options,
  });
}
