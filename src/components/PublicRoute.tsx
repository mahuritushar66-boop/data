import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface PublicRouteProps {
  children: ReactNode;
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (currentUser) {
    const redirectPath = location.state?.from?.pathname || "/";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

