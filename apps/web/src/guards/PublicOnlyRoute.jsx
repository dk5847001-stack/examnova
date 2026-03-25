import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export function PublicOnlyRoute({ children }) {
  const { status, isAuthenticated } = useAuth();

  if (status !== "loading" && isAuthenticated) {
    return <Navigate to="/marketplace" replace />;
  }

  return children;
}
