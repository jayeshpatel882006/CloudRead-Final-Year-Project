import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import Loader from "./Loader";

const ProtectedRoute = ({ children ,role }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <Loader />;
  // console.log("ProtectedRoute - userRole:", user);
  
  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    return <Navigate to="/" />;
  }
  

  return children;
};

export default ProtectedRoute;