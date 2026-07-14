import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import API from "../services/api";
import PageWrapper from "../components/PageWrapper";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";
import { Button, Input, PasswordInput } from "../components/ui";
import { AuthShell } from "./Auth";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data } = await API.post("/auth/login", formData);
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      login(data);
      toast.success(`Login successful — welcome back!`);
      if (data.role === "student") navigate("/student");
      else if (data.role === "librarian") navigate("/librarian");
      else if (data.role === "admin") navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <AuthShell
        eyebrow="Welcome back"
        title="Sign in to your reading room."
        subtitle="Pick up right where you left off. Your library, your shelf, your notes."
        altLink={<>New here? <Link to="/register">Create an account</Link></>}
      >
        <header className="cr-auth__form-head">
          <h1 className="cr-auth__form-title">Sign in</h1>
          <p className="cr-auth__form-subtitle">
            Enter the email and password linked to your CloudRead account.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="cr-auth__form">
          <Input
            type="email"
            name="email"
            label="Email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            leftIcon={<Mail size={16} />}
            autoComplete="email"
            required
          />

          <PasswordInput
            name="password"
            label="Password"
            placeholder="Your password"
            value={formData.password}
            onChange={handleChange}
            showStrength={false}
            autoComplete="current-password"
            required
          />

          <div className="cr-auth__row">
            <label
              style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}
            >
              <input type="checkbox" /> Remember this device
            </label>
            <button type="button" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", font: "inherit", fontSize: "var(--text-body-sm)" }}>Forgot?</button>
          </div>

          <Button
            type="submit"
            size="lg"
            loading={loading}
            fullWidth
            className="cr-auth__submit"
          >
            {loading ? "Signing you in…" : "Sign in"}
          </Button>
        </form>
      </AuthShell>
    </PageWrapper>
  );
};

export default Login;