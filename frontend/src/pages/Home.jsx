import { useContext ,useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import {  useNavigate } from "react-router-dom";
import PageWrapper from "../components/PageWrapper";
import Layout from "../components/Layout";
import "../css/home.css"

const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

useEffect(() => {
  const steps = document.querySelectorAll(".timeline-step");
  const fill = document.querySelector(".timeline-fill");
  const blob = document.querySelector(".blob1");

  const handleScroll = () => {
    const scrollY = window.scrollY;

    // Blob parallax
    if (blob) {
      blob.style.transform = `translateY(${scrollY * 0.15}px)`;
    }

    const trigger = window.innerHeight * 0.75;

    steps.forEach((step, index) => {
      const top = step.getBoundingClientRect().top;

      if (top < trigger) {
        step.classList.add("active");

        if (fill) {
          const percent = ((index + 1) / steps.length) * 100;
          fill.style.width = percent + "%";
        }
      }
    });
  };

  window.addEventListener("scroll", handleScroll);
  handleScroll();

  return () => window.removeEventListener("scroll", handleScroll);
}, []);

// useEffect(() => {
//   const handleScroll = () => {
//     const scrollY = window.scrollY;
//     const blob = document.querySelector(".blob1");
//     blob.style.transform = `translateY(${scrollY * 0.15}px)`;
//   };
   

//   window.addEventListener("scroll", handleScroll);
//   return () => window.removeEventListener("scroll", handleScroll);
// }, []);


  // if (user) {
  //   if (user.role === "student") return <Navigate to="/student" />;
  //   if (user.role === "librarian") return <Navigate to="/librarian" />;
  //   if (user.role === "admin") return <Navigate to="/admin" />;
  // }

   const goToDashboard = () => {
    if (user?.role === "student") navigate("/student");
    if (user?.role === "librarian") navigate("/librarian");
    if (user?.role === "admin") navigate("/admin");
  };

  return (
    <PageWrapper>
    <Layout>
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

        {!user && (<div className="hero-actions">
          <button onClick={() => navigate("/register")} className="btn-primary">
            Create Account
          </button>
          <button onClick={() => navigate("/login")} className="btn-outline">
            Login
          </button>
        </div>) }
        
        {user && (
          <div className="logged-home-box">

            <p className="welcome-text">
              👋 Welcome back! You are logged in as{" "}
              <strong>{user.role}</strong>
            </p>

            <button
              className="btn-primary"
              onClick={goToDashboard}
            >
              Go to Dashboard
            </button>

          </div>
        )}
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
    {/* HOW IT WORKS */}
<section className="how-section">
  <h2>How CloudRead Works</h2>

  <div className="timeline-horizontal">

    <div className="timeline-line">
      <div className="timeline-fill"></div>
    </div>

    <div className="timeline-steps">

      <div className="timeline-step">
        <div className="circle">📚</div>
        <h3>Request</h3>
        <p>Students request access to a digital book.</p>
      </div>

      <div className="timeline-step">
        <div className="circle">🧑‍💼</div>
        <h3>Review</h3>
        <p>Librarians review and approve the request.</p>
      </div>

      <div className="timeline-step">
        <div className="circle">🔓</div>
        <h3>Grant</h3>
        <p>Access is granted for a limited time.</p>
      </div>

      <div className="timeline-step">
        <div className="circle">⏳</div>
        <h3>Expire</h3>
        <p>The system automatically expires access.</p>
      </div>

    </div>

  </div>
</section>



      {/* CTA */}
      <section className="cta">
        {!user && (
    <>
          <h2>Designed for modern digital libraries</h2>
        <button onClick={() => navigate("/register")} className="btn-primary">
          Get Started
        </button>
    </>
    )}
     {user && (
    <>
      <h2>Welcome back 👋</h2>
      <p>
        Continue managing your digital library experience as{" "}
        <strong>{user.role}</strong>.
      </p>

      <button
        className="btn-primary"
        onClick={() => {
          if (user.role === "student") navigate("/student");
          if (user.role === "librarian") navigate("/librarian");
          if (user.role === "admin") navigate("/admin");
        }}
      >
        Go to Dashboard
      </button>
    </>
  )}
    </section>
      

      <footer className="footer">
        © 2026 CloudRead. All rights reserved.
      </footer>

    </div>
    </Layout>
    </PageWrapper>
  );
};

export default Home;