import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../store/authContext"; // fix: calea corecta spre authContext

// requiredRole: 'USER' sau 'ADMIN' - daca e specificat, verifica si rolul
export default function ProtectedRoute({ requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Se încarcă...</div>;

  // neautentificat => redirect la landing
  if (!user) return <Navigate to="/" replace />;

  // autentificat dar cu rol gresit => redirect la pagina proprie
  if (requiredRole && user.role !== requiredRole) {
    const redirect = user.role === "ADMIN" ? "/admin" : "/trips";
    return <Navigate to={redirect} replace />;
  }

  return <Outlet />;
}