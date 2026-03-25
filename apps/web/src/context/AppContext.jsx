import { createContext, useContext, useEffect, useState } from "react";
import {
  fetchDashboardSummary,
  fetchProfile,
  forgotPassword,
  login,
  logout,
  refreshSession,
  resendOtp,
  resetPassword,
  signup,
  updateProfile,
  updateProfileSettings,
  verifyEmailOtp,
} from "../services/api/index.js";

const AppContext = createContext(null);
const ACCESS_TOKEN_KEY = "examnova_access_token";
const AUTH_BOOTSTRAP_TIMEOUT_MS = 6000;

export function AppProvider({ children }) {
  const [authState, setAuthState] = useState({
    status: "loading",
    isAuthenticated: false,
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    user: null,
    role: null,
    error: null,
    dashboardSummary: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);

      if (storedToken) {
        try {
          const profileResponse = await fetchProfile(storedToken, {
            timeoutMs: AUTH_BOOTSTRAP_TIMEOUT_MS,
          });

          if (!isMounted) {
            return;
          }

          setAuthState({
            status: "authenticated",
            isAuthenticated: true,
            accessToken: storedToken,
            user: profileResponse.data.user,
            role: profileResponse.data.user.role,
            error: null,
            dashboardSummary: null,
          });
          return;
        } catch (_error) {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
        }
      }

      try {
        const refreshResponse = await refreshSession({
          timeoutMs: AUTH_BOOTSTRAP_TIMEOUT_MS,
        });

        if (!isMounted) {
          return;
        }

        const accessToken = refreshResponse.data.accessToken;
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        setAuthState({
          status: "authenticated",
          isAuthenticated: true,
          accessToken,
          user: refreshResponse.data.user,
          role: refreshResponse.data.user.role,
          error: null,
          dashboardSummary: null,
        });
      } catch (_error) {
        if (!isMounted) {
          return;
        }

        setAuthState({
          status: "anonymous",
          isAuthenticated: false,
          accessToken: null,
          user: null,
          role: null,
          error: null,
          dashboardSummary: null,
        });
      }
    }

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      setAuthState({
        status: "anonymous",
        isAuthenticated: false,
        accessToken: null,
        user: null,
        role: null,
        error: "Your session expired. Please log in again.",
        dashboardSummary: null,
      });
    }

    window.addEventListener("examnova:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("examnova:unauthorized", handleUnauthorized);
    };
  }, []);

  async function applyAuthenticatedSession(responsePayload) {
    const accessToken = responsePayload.data.accessToken;
    const user = responsePayload.data.user;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    setAuthState({
      status: "authenticated",
      isAuthenticated: true,
      accessToken,
      user,
      role: user.role,
      error: null,
      dashboardSummary: null,
    });

    return responsePayload;
  }

  async function performLogin(payload) {
    const response = await login(payload);
    return applyAuthenticatedSession(response);
  }

  async function performVerifyOtp(payload) {
    const response = await verifyEmailOtp(payload);
    return applyAuthenticatedSession(response);
  }

  async function performSignup(payload) {
    return signup(payload);
  }

  async function performResendOtp(payload) {
    return resendOtp(payload);
  }

  async function performForgotPassword(payload) {
    return forgotPassword(payload);
  }

  async function performResetPassword(payload) {
    return resetPassword(payload);
  }

  async function performLogout() {
    try {
      await logout();
    } finally {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      setAuthState({
        status: "anonymous",
        isAuthenticated: false,
        accessToken: null,
        user: null,
        role: null,
        error: null,
        dashboardSummary: null,
      });
    }
  }

  async function performProfileRefresh() {
    const token = authState.accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      return null;
    }

    const response = await fetchProfile(token);
    setAuthState((current) => ({
      ...current,
      user: response.data.user,
      role: response.data.user.role,
    }));
    return response;
  }

  async function performProfileUpdate(payload) {
    const response = await updateProfile(authState.accessToken, payload);
    setAuthState((current) => ({
      ...current,
      user: response.data.user,
      role: response.data.user.role,
    }));
    return response;
  }

  async function performDashboardSummaryFetch() {
    const response = await fetchDashboardSummary(authState.accessToken);
    setAuthState((current) => ({
      ...current,
      dashboardSummary: response.data.summary,
    }));
    return response;
  }

  async function performSettingsUpdate(payload) {
    const response = await updateProfileSettings(authState.accessToken, payload);
    setAuthState((current) => ({
      ...current,
      user: response.data.user,
      role: response.data.user.role,
    }));
    return response;
  }

  return (
    <AppContext.Provider
      value={{
        authState,
        setAuthState,
        signup: performSignup,
        verifyOtp: performVerifyOtp,
        resendOtp: performResendOtp,
        login: performLogin,
        logout: performLogout,
        forgotPassword: performForgotPassword,
        resetPassword: performResetPassword,
        refreshProfile: performProfileRefresh,
        updateProfile: performProfileUpdate,
        fetchDashboardSummary: performDashboardSummaryFetch,
        updateSettings: performSettingsUpdate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }

  return context;
}
