import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/navbar.css";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const goToDashboard = () => {
    if (user.role === "student") navigate("/student");
    if (user.role === "librarian") navigate("/librarian");
    if (user.role === "admin") navigate("/admin");
  };

  return (
    <nav className="navbar">

      <div className="logo" onClick={() => navigate("/")}>
        CloudRead
      </div>

      <div className="nav-links">

        {!user && (
          <>
            <button
              className={`nav-btn ${
                location.pathname === "/login" ? "active" : ""
              }`}
              onClick={() => navigate("/login")}
            >
              Login
            </button>

            <button
              className={`nav-btn ${
                location.pathname === "/register" ? "active" : ""
              }`}
              onClick={() => navigate("/register")}
            >
              Register
            </button>
          </>
        )}

        {user && (
          <>
            <span className="role-badge">
              {user.role}
            </span>

            <button className="nav-dashboard" onClick={goToDashboard}>
  Dashboard
</button>

            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}

      </div>

    </nav>
  );
};

export default Navbar;



// import { useContext } from "react";
// import { AuthContext } from "../context/AuthContext";
// import { useNavigate } from "react-router-dom";

// const Navbar = () => {
//   const { user, logout } = useContext(AuthContext);
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     logout();
//     navigate("/login");
//   };

//   return (
//     <div style={navStyle}>
//       <h2 style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
//         📚 CloudRead
//       </h2>

//       {user && (
//         <div>
//           <span style={{ marginRight: "20px" }}>
//             👤 Role: {user.role}
//           </span>

//           {user.role === "student" && (
//             <button style={{
//   backgroundColor: "white",
//   color: "#4f46e5",
//   marginLeft: "10px"
// }} onClick={() => navigate("/student")}>
//               Student Dashboard
//             </button>
//           )}

//           {user.role === "librarian" && (
//             <button style={{
//   backgroundColor: "white",
//   color: "#4f46e5",
//   marginLeft: "10px"
// }} onClick={() => navigate("/librarian")}>
//               Librarian Dashboard
//             </button>
//           )}

//           {user.role === "admin" && (
//             <button style={{
//   backgroundColor: "white",
//   color: "#4f46e5",
//   marginLeft: "10px"
// }} onClick={() => navigate("/admin")}>
//               Admin Dashboard
//             </button>
//           )}

//           <button
//             onClick={handleLogout}
//             style={{
//   backgroundColor: "white",
//   color: "#4f46e5",
//   marginLeft: "10px"
// }}
//           >
//             🚪 Logout
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// const navStyle = {
//   display: "flex",
//   justifyContent: "space-between",
//   alignItems: "center",
//   padding: "15px 30px",
//   backgroundColor: "#4f46e5",
//   color: "white",
// };

// export default Navbar;
// import { useContext } from "react";
// import { AuthContext } from "../context/AuthContext";
// import { useNavigate, useLocation } from "react-router-dom";
// import "../css/navbar.css";

// const Navbar = () => {
//   const { user, logout } = useContext(AuthContext);
//   const navigate = useNavigate();
//   const location = useLocation();

//   const handleLogout = () => {
//     logout();
//     navigate("/login");
//   };

//   return (
//     <nav className="navbar">

//       <div className="nav-left" onClick={() => navigate("/")}>
//         <h2 className="logo">CloudRead</h2>
//       </div>

//       <div className="nav-right">

//         {user && (
//           <>
//             <span className="role-badge">
//               {user.role}
//             </span>

//             {user.role === "student" && (
//               <button
//                 className={`nav-btn ${
//                   location.pathname === "/student" ? "active" : ""
//                 }`}
//                 onClick={() => navigate("/student")}
//               >
//                 Dashboard
//               </button>
//             )}

//             {user.role === "librarian" && (
//               <button
//                 className={`nav-btn ${
//                   location.pathname === "/librarian" ? "active" : ""
//                 }`}
//                 onClick={() => navigate("/librarian")}
//               >
//                 Dashboard
//               </button>
//             )}

//             {user.role === "admin" && (
//               <button
//                 className={`nav-btn ${
//                   location.pathname === "/admin" ? "active" : ""
//                 }`}
//                 onClick={() => navigate("/admin")}
//               >
//                 Dashboard
//               </button>
//             )}

//             <button className="logout-btn" onClick={handleLogout}>
//               Logout
//             </button>
//           </>
//         )}

//       </div>

//     </nav>
//   );
// };

// export default Navbar;