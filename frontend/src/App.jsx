import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import LibrarianDashboard from "./pages/LibrarianDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import Home from "./pages/Home";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ActiveStudentsPage from "./pages/ActiveStudentsPage";
import PublicRoute from "./components/PublicRoute";
import ScrollToTop from "./components/ScrollToTop";

function App() {
  const location = useLocation();
  return (
    <>
    <ScrollToTop />
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
          } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>} />
        <Route path="/" element={<Home />} />
        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
             </ProtectedRoute>
          }
        />
        <Route
        path="/librarian/book/:bookId/active"
         element={
         <ProtectedRoute role="librarian">
          <ActiveStudentsPage />
          </ProtectedRoute>
        } 
        />

        <Route
          path="/librarian"
          element={
            <ProtectedRoute role="librarian">
              <LibrarianDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
             </ProtectedRoute>
          }
        />
      </Routes>
      </AnimatePresence>
        <ToastContainer
    position="top-right"
    autoClose={2000}
    hideProgressBar={false}
    newestOnTop
    closeOnClick
    pauseOnHover
    theme="light"
  />
  </>
  );
}

export default App;