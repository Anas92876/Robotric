import { Navigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { ROUTES } from "../../constants/routes.constants";

export default function RequireRole({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to={ROUTES.LOGIN} />;
  if (!roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
}
