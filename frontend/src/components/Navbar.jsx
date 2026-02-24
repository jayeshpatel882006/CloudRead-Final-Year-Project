import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={navStyle}>
      <h2 style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
        📚 CloudRead
      </h2>

      {user && (
        <div>
          <span style={{ marginRight: "20px" }}>
            👤 Role: {user.role}
          </span>

          {user.role === "student" && (
            <button onClick={() => navigate("/student")}>
              Student Dashboard
            </button>
          )}

          {user.role === "librarian" && (
            <button onClick={() => navigate("/librarian")}>
              Librarian Dashboard
            </button>
          )}

          {user.role === "admin" && (
            <button onClick={() => navigate("/admin")}>
              Admin Dashboard
            </button>
          )}

          <button
            onClick={handleLogout}
            style={{ marginLeft: "15px", backgroundColor: "#ff4d4d", color: "white" }}
          >
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );
};

const navStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "15px 30px",
  backgroundColor: "#f5f5f5",
  borderBottom: "1px solid #ddd",
};

export default Navbar;