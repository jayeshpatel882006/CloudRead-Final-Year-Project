import { useContext ,useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import "../css/home.css"

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

useEffect(() => {
  const handleScroll = () => {
    const scrollY = window.scrollY;
    const blob = document.querySelector(".blob1");
    blob.style.transform = `translateY(${scrollY * 0.15}px)`;
  };

  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, []);


  if (user) {
    if (user.role === "student") return <Navigate to="/student" />;
    if (user.role === "librarian") return <Navigate to="/librarian" />;
    if (user.role === "admin") return <Navigate to="/admin" />;
  }

  return (
    <PageWrapper>
    <div className="landing">
<div className="bg-blob blob1"></div>
<div className="bg-blob blob2"></div>
<div className="bg-blob blob3"></div>
      {/* HERO */}
      <section className="hero">
        <h1>CloudRead</h1>
        <p>
          A secure and intelligent digital library platform built for modern institutions.
        </p>

        <div className="hero-actions">
          <button onClick={() => navigate("/register")} className="btn-primary">
            Create Account
          </button>
          <button onClick={() => navigate("/login")} className="btn-outline">
            Login
          </button>
        </div>
      </section>

      {/* ABOUT */}
      <section className="section">
        <h2>Built for clarity and control</h2>
        <p>
          CloudRead simplifies digital book management with secure access,
          time-based permissions, automated expiry, and real-time analytics —
          all in one streamlined system.
        </p>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="feature">
          <h3>Secure Access</h3>
          <p>Role-based authentication with protected book delivery.</p>
        </div>

        <div className="feature">
          <h3>Access Workflow</h3>
          <p>Structured approval system between students and librarians.</p>
        </div>

        <div className="feature">
          <h3>Automated Expiry</h3>
          <p>Time-limited access enforced automatically.</p>
        </div>

        <div className="feature">
          <h3>Analytics Dashboard</h3>
          <p>Track engagement and system usage with real insights.</p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <h2>How it works</h2>
        <div className="steps">
          <div>
            <span>01</span>
            <p>Students request access to a digital book.</p>
          </div>
          <div>
            <span>02</span>
            <p>Librarians review and approve the request.</p>
          </div>
          <div>
            <span>03</span>
            <p>Access is granted for a limited time period.</p>
          </div>
          <div>
            <span>04</span>
            <p>The system automatically expires access.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Designed for modern digital libraries</h2>
        <button onClick={() => navigate("/register")} className="btn-primary">
          Get Started
        </button>
      </section>

      <footer className="footer">
        © 2026 CloudRead. All rights reserved.
      </footer>

    </div>
    </PageWrapper>
  );
};

export default Home;