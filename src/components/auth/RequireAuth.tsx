import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { ROUTES } from "../../constants/routes.constants";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-gray-400 animate-pulse">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page with current location
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
