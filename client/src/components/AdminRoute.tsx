import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ReactNode } from "react";

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
