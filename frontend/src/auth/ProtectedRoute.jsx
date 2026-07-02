import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <main className="loading-screen">Loading...</main>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
