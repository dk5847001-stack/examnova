import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export function AdminRoute({ children }) {
  const location = useLocation();
  const { status, isAuthenticated, role } = useAuth();

  if (status === "loading") {
    return <div className="route-loader">Loading admin access...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role !== "admin") {
    return <Navigate to="/marketplace" replace />;
  }

  return children;
}
