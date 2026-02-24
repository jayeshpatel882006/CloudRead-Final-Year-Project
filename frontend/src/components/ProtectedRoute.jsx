import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children ,role }) => {
  const { user } = useContext(AuthContext);
  console.log("ProtectedRoute - userRole:", user);
  
  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    return <Navigate to="/" />;
  }
  

  return children;
};

export default ProtectedRoute;