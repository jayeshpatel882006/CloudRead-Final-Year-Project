import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, User, GraduationCap, BookOpenCheck, Shield } from "lucide-react";
import API from "../services/api";
import PageWrapper from "../components/PageWrapper";
import { toast } from "react-toastify";
import { Button, Input, PasswordInput } from "../components/ui";
import { AuthShell } from "./Auth";

const ROLE_DESCRIPTIONS = {
  student: "Borrow books, request access, and track your reading history.",
  librarian: "Manage the catalog, approve access requests, and audit reading sessions.",
};

const ROLE_META = [
  {
    value: "student",
    label: "Student",
    icon: GraduationCap,
    description: ROLE_DESCRIPTIONS.student,
  },
  {
    value: "librarian",
    label: "Librarian",
    icon: BookOpenCheck,
    description: ROLE_DESCRIPTIONS.librarian,
  },
];

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await API.post("/auth/register", formData);
      toast.success("Account created. Welcome to CloudRead!");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <AuthShell
        eyebrow="Create your account"
        title="Join a calmer library."
        subtitle="One account for every shelf in your institution — secure by default, audit-ready by design."
        altLink={<>Have an account? <Link to="/login">Sign in instead</Link></>}
      >
        <header className="cr-auth__form-head">
          <h1 className="cr-auth__form-title">Create an account</h1>
          <p className="cr-auth__form-subtitle">
            Tell us a little about you, and pick the role that fits how you'll use CloudRead.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="cr-auth__form">
          <Input
            type="text"
            name="name"
            label="Full name"
            placeholder="Jane Doe"
            value={formData.name}
            onChange={handleChange}
            leftIcon={<User size={16} />}
            autoComplete="name"
            required
          />

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
            placeholder="At least 8 characters"
            value={formData.password}
            onChange={handleChange}
            helper="Mix letters, numbers, and a symbol for a stronger password."
            autoComplete="new-password"
            required
          />

          <div>
            <span
              style={{
                display: "block",
                fontSize: "var(--text-body-sm)",
                fontWeight: 500,
                marginBottom: "var(--space-2)",
                color: "var(--color-text)",
              }}
            >
              I'm joining as a…
            </span>
            <div className="cr-auth__roles" role="radiogroup" aria-label="Role">
              {ROLE_META.map((r) => {
                const Icon = r.icon;
                const selected = formData.role === r.value;
                return (
                  <button
                    type="button"
                    key={r.value}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setFormData((s) => ({ ...s, role: r.value }))}
                    className={`cr-auth__role ${selected ? "cr-auth__role--selected" : ""}`}
                  >
                    <span className="cr-auth__role-title">
                      <Icon size={16} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                      {r.label}
                    </span>
                    <span className="cr-auth__role-desc">{r.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            loading={loading}
            fullWidth
            leftIcon={<Shield size={16} />}
            className="cr-auth__submit"
          >
            {loading ? "Creating account…" : "Create my account"}
          </Button>

          <p style={{
            fontSize: "var(--text-caption)",
            color: "var(--color-text-muted)",
            marginTop: "var(--space-2)",
            lineHeight: 1.5,
          }}>
            By creating an account, you agree to CloudRead's terms of service
            and privacy policy.
          </p>
        </form>
      </AuthShell>
    </PageWrapper>
  );
};

export default Register;