import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export function PublicOnlyRoute({ children }) {
  const { status, isAuthenticated, role } = useAuth();

  if (status !== "loading" && isAuthenticated) {
    return <Navigate to={role === "admin" ? "/admin/dashboard" : "/app/dashboard"} replace />;
  }

  return children;
}
