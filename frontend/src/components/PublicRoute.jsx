import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const PublicRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;

  if (user) {
    // Redirect based on role
    if (user.role === "student") return <Navigate to="/student" replace />;
    if (user.role === "librarian") return <Navigate to="/librarian" replace />;
    if (user.role === "admin") return <Navigate to="/admin" replace />;
  }

  return children;
};

export default PublicRoute;