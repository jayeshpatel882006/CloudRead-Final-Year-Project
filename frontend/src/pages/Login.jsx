import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { FiEye, FiEyeOff } from "react-icons/fi";
import PageWrapper from "../components/PageWrapper";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const {  login } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  try {
    setLoading(true);
    
    const { data } = await API.post("/auth/login", formData);
    
    // Save token
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    
    // setUser({role: data.role });
    login(data);
    console.log(data);
    // Redirect based on role
    toast.success(`Login successful 🎉 ${data.role}`);
    if (data.role === "student") {
      navigate("/student");
    } else if (data.role === "librarian") {
      navigate("/librarian");
    } else if (data.role === "admin") {
      navigate("/admin");
    }

  } catch (err) {
    toast.error(err.response?.data?.message || "Login failed Try Again sometime later");
  } finally {
    setLoading(false);
  }
};

  return (
    <PageWrapper>
    <div className="auth-container">

      <div className="auth-card">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">
          Login to continue to CloudRead.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <div className="password-wrapper">
  <input
    type={showPassword ? "text" : "password"}
    name="password"
    placeholder="Password"
    value={formData.password}
    onChange={handleChange}
    required
  />

  <span
    className="toggle-password"
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ? <FiEyeOff /> : <FiEye />}
  </span>
</div>

          <button type="submit" className="auth-button">
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <p className="auth-footer">
          Don’t have an account?{" "}
          <span onClick={() => navigate("/register")}>
            Register
          </span>
        </p>
        <p className="auth-explore">
  Just exploring?{" "}
  <span onClick={() => navigate("/")}>
    Visit homepage
  </span>
</p>
      </div>

    </div>
    </PageWrapper>
  );
};

export default Login;