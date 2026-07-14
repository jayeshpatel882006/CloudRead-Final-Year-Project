import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  Hourglass,
  ClipboardCheck,
  BarChart3,
  BookOpen,
  Cloud,
  ArrowRight,
  Sparkles,
  Lock,
  Library,
  Users,
  GraduationCap,
  BrainCircuit,
  Globe,
  Mail,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import BackToTopButton from "../components/BackToTopButton";
import { Button } from "../components/ui";
import { HeroIllustration } from "../illustrations";
import "./Home.css";

/* ── small helpers ──────────────────────────────────── */
function FeatureCard({ icon: Icon, title, description }) {
  return (
    <article className="cr-feat">
      <span className="cr-feat__icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <h3 className="cr-feat__title">{title}</h3>
      <p className="cr-feat__description">{description}</p>
    </article>
  );
}

function Step({ number, title, description, icon: Icon }) {
  return (
    <article className="cr-step">
      <span className="cr-step__num">{number}</span>
      <span className="cr-step__icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <h3 className="cr-step__title">{title}</h3>
      <p className="cr-step__description">{description}</p>
    </article>
  );
}

function BenefitCard({ icon: Icon, title, description }) {
  return (
    <article className="cr-benefit">
      <div className="cr-benefit__icon-wrap">
        <Icon size={22} />
      </div>
      <div>
        <h3 className="cr-benefit__title">{title}</h3>
        <p className="cr-benefit__description">{description}</p>
      </div>
    </article>
  );
}

/* ── Animated Counter ───────────────────────────────── */
function AnimatedCounter({ end, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const step = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref} className="cr-stat-card__value">
      {count}{suffix}
    </span>
  );
}

/* ── Public Header ───────────────────────────────────── */
function PublicHeader({ user, navigate }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.getAttribute("data-theme") || "light";
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("cloudread-theme", next);
    } catch {}
  };

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#benefits", label: "Benefits" },
    { href: "#how", label: "How it works" },
    { href: "#stats", label: "Stats" },
    { href: "#ai", label: "AI Library" },
  ];

  return (
    <header
      className={`cr-public-header ${scrolled ? "cr-public-header--scrolled" : ""}`}
    >
      <div className="cr-public-header__inner">
        <div className="cr-public-header__brand">
          <Link to="/" className="cr-public-header__brand-link">
            <span className="cr-public-header__logo" aria-hidden="true">
              <BookOpen size={18} />
            </span>
            <span className="cr-public-header__brand-name">CloudRead</span>
          </Link>
        </div>

        <nav className="cr-public-header__nav" aria-label="Primary">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="cr-public-header__actions">
          <button
            type="button"
            className="cr-public-header__theme-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Theme: ${theme}`}
          >
            <span className="cr-public-header__theme-icon">
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </span>
          </button>

          <div className="cr-public-header__cta">
            {user ? (
              <Button onClick={() => {
                if (user.role === "student") navigate("/student");
                else if (user.role === "librarian") navigate("/librarian");
                else if (user.role === "admin") navigate("/admin");
              }}>
                Open dashboard <ArrowRight size={16} />
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")}>Sign in</Button>
                <Button onClick={() => navigate("/register")}>Get started <ArrowRight size={16} /></Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="cr-public-header__mobile-btn"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`cr-public-header__mobile ${mobileOpen ? "cr-public-header__mobile--open" : ""}`}
        aria-hidden={!mobileOpen}
      >
        {navLinks.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="cr-public-header__mobile-link"
            onClick={() => setMobileOpen(false)}
          >
            {l.label}
          </a>
        ))}
        <hr className="cr-public-header__mobile-divider" />
        {user ? (
          <Button fullWidth onClick={() => {
            if (user.role === "student") navigate("/student");
            else if (user.role === "librarian") navigate("/librarian");
            else if (user.role === "admin") navigate("/admin");
            setMobileOpen(false);
          }}>
            Open dashboard <ArrowRight size={16} />
          </Button>
        ) : (
          <div className="cr-public-header__mobile-cta">
            <Button fullWidth onClick={() => { navigate("/register"); setMobileOpen(false); }}>
              Get started free <ArrowRight size={16} />
            </Button>
            <Button fullWidth variant="ghost" onClick={() => { navigate("/login"); setMobileOpen(false); }}>
              Sign in
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

/* ── Main Component ─────────────────────────────────── */
const Home = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const goToDashboard = () => {
    if (user?.role === "student") navigate("/student");
    if (user?.role === "librarian") navigate("/librarian");
    if (user?.role === "admin") navigate("/admin");
  };

  return (
    <PageWrapper>
      <div className="cr-home">
        <PublicHeader user={user} navigate={navigate} />

        {/* ════════════════ HERO ════════════════ */}
        <section className="cr-hero">
          <div className="cr-hero__bg" aria-hidden="true">
            <div className="cr-hero__blob cr-hero__blob--1" />
            <div className="cr-hero__blob cr-hero__blob--2" />
            <div className="cr-hero__blob cr-hero__blob--3" />
            <div className="cr-hero__grain" />
            <div className="cr-hero__grid" />
          </div>

          <div className="cr-hero__inner">
            <div className="cr-hero__text">
              <span className="cr-hero__eyebrow">
                <Sparkles size={14} /> A private reading room in your cloud
              </span>
              <h1 className="cr-hero__title">
                Your library, <em>reimagined</em>
                <br />
                for the modern shelf.
              </h1>
              <p className="cr-hero__lede">
                CloudRead gives your school, club, or company a single, calm
                place to lend, read, and audit digital books — with time-limited
                access, encrypted delivery, and zero spreadsheets.
              </p>
              <div className="cr-hero__cta">
                {user ? (
                  <Button size="lg" onClick={goToDashboard}>
                    Open your dashboard <ArrowRight size={18} />
                  </Button>
                ) : (
                  <>
                    <Button size="lg" onClick={() => navigate("/register")}>
                      Create free account <ArrowRight size={18} />
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
                      Sign in
                    </Button>
                  </>
                )}
              </div>
              <ul className="cr-hero__trust">
                <li><ShieldCheck size={14} /> Role-based access</li>
                <li><Lock size={14} /> Encrypted delivery</li>
                <li><Hourglass size={14} /> Auto-expiring access</li>
              </ul>
            </div>
            <div className="cr-hero__art" aria-hidden="true">
              <div className="cr-hero__art-inner">
                <HeroIllustration size={420} />
              </div>
            </div>
          </div>

          <div className="cr-hero__scroll-hint" aria-hidden="true">
            <span>Scroll to explore</span>
            <ChevronDown size={14} />
          </div>
        </section>

        {/* ════════════════ FEATURES ════════════════ */}
        <section className="cr-section cr-features" id="features">
          <header className="cr-section__head">
            <span className="cr-section__eyebrow">What's inside</span>
            <h2>Built for clarity and control</h2>
            <p>Every feature earns its place by removing friction from the reading lifecycle.</p>
          </header>

          <div className="cr-grid cr-grid--4">
            <FeatureCard
              icon={ShieldCheck}
              title="Secure access"
              description="Role-based authentication with protected book delivery and watermark tracing."
            />
            <FeatureCard
              icon={ClipboardCheck}
              title="Approval workflow"
              description="A simple, auditable handoff from student request to librarian grant."
            />
            <FeatureCard
              icon={Hourglass}
              title="Automatic expiry"
              description="Time-limited access enforced at render — no manual cleanup."
            />
            <FeatureCard
              icon={BarChart3}
              title="Live analytics"
              description="Real reader counts, popular titles, and abandonment insight."
            />
          </div>
        </section>

        {/* ════════════════ BENEFITS ════════════════ */}
        <section className="cr-section cr-benefits" id="benefits">
          <header className="cr-section__head">
            <span className="cr-section__eyebrow">Why choose CloudRead</span>
            <h2>More than just a digital shelf</h2>
            <p>We built CloudRead to solve the real problems that libraries face every day.</p>
          </header>

          <div className="cr-grid cr-grid--2">
            <BenefitCard
              icon={ShieldCheck}
              title="Privacy-first architecture"
              description="All book content is rendered server-side. Watermarks are embedded at the page level, ensuring every reader session is traceable without compromising the reader's privacy."
            />
            <BenefitCard
              icon={Users}
              title="Role-based collaboration"
              description="Students read, librarians manage, administrators oversee. Each role gets a tailored dashboard with exactly the tools they need — nothing more, nothing less."
            />
            <BenefitCard
              icon={Hourglass}
              title="Time-bound access, automated"
              description="No more manual expiration tracking. Set access windows in the approval flow, and the system automatically revokes access when time runs out."
            />
            <BenefitCard
              icon={BarChart3}
              title="Data-driven decisions"
              description="Know which books are popular, which are gathering dust, and how readers engage. Use real usage data to build a better catalog."
            />
            <BenefitCard
              icon={Globe}
              title="Works everywhere, instantly"
              description="CloudRead is browser-based. No apps to install, no plugins to configure. Readers on any device can open a book in seconds."
            />
            <BenefitCard
              icon={Lock}
              title="Enterprise-grade security"
              description="Encrypted connections, hashed passwords, and fine-grained access controls. Your library's content stays protected at every layer."
            />
          </div>
        </section>

        {/* ════════════════ HOW IT WORKS ════════════════ */}
        <section className="cr-section cr-how" id="how">
          <header className="cr-section__head">
            <span className="cr-section__eyebrow">The journey</span>
            <h2>How CloudRead works</h2>
            <p>From request to reading in four quiet steps.</p>
          </header>

          <ol className="cr-steps">
            <Step number="1" icon={BookOpen} title="Request"
              description="A student browses the library and asks for a book." />
            <Step number="2" icon={ClipboardCheck} title="Review"
              description="A librarian reviews the request and approves access." />
            <Step number="3" icon={Lock} title="Grant"
              description="Access is granted for a limited time window." />
            <Step number="4" icon={Hourglass} title="Expire"
              description="The system reclaims access automatically." />
          </ol>
        </section>

        {/* ════════════════ STATS ════════════════ */}
        <section className="cr-section cr-stats" id="stats">
          <header className="cr-section__head">
            <span className="cr-section__eyebrow">By the numbers</span>
            <h2>Calm by design, rigorous underneath</h2>
            <p>CloudRead powers institutions of every size with reliability and scale.</p>
          </header>

          <div className="cr-grid cr-grid--4">
            <article className="cr-stat-card">
              <Library size={20} aria-hidden="true" />
              <AnimatedCounter end={12400} suffix="+" />
              <span className="cr-stat-card__label">books under management</span>
            </article>
            <article className="cr-stat-card">
              <Users size={20} aria-hidden="true" />
              <AnimatedCounter end={3800} />
              <span className="cr-stat-card__label">active readers monthly</span>
            </article>
            <article className="cr-stat-card">
              <Cloud size={20} aria-hidden="true" />
              <AnimatedCounter end={9995} suffix="%" />
              <span className="cr-stat-card__label">delivery uptime</span>
            </article>
            <article className="cr-stat-card">
              <GraduationCap size={20} aria-hidden="true" />
              <AnimatedCounter end={150} suffix="+" />
              <span className="cr-stat-card__label">partner institutions</span>
            </article>
          </div>
        </section>

        {/* ════════════════ AI-POWERED LIBRARY ════════════════ */}
        <section className="cr-section cr-ai" id="ai">
          <div className="cr-ai__inner">
            <div className="cr-ai__text">
              <span className="cr-section__eyebrow">Powered by intelligence</span>
              <h2>The AI-powered library assistant</h2>
              <p>
                CloudRead uses machine learning to help readers discover books they'll
                love, predict reading patterns, and give librarians actionable
                recommendations for curating their catalog.
              </p>
              <ul className="cr-ai__features">
                <li>
                  <BrainCircuit size={16} />
                  <span><strong>Smart recommendations</strong> — Books suggested based on reading history and genre affinity.</span>
                </li>
                <li>
                  <BrainCircuit size={16} />
                  <span><strong>Reading pattern analysis</strong> — Understand when and how readers engage with content.</span>
                </li>
                <li>
                  <BrainCircuit size={16} />
                  <span><strong>Catalog insights</strong> — Identify gaps in your collection with automated trend detection.</span>
                </li>
                <li>
                  <BrainCircuit size={16} />
                  <span><strong>Automated curation</strong> — Let the system flag underperforming titles and suggest replacements.</span>
                </li>
              </ul>
            </div>
            <div className="cr-ai__art" aria-hidden="true">
              <div className="cr-ai__art-shape">
                <BrainCircuit size={120} />
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════ CTA ════════════════ */}
        <section className="cr-section cr-cta">
          <div className="cr-cta__inner">
            <div className="cr-cta__inner-bg" aria-hidden="true" />
            <h2>Designed for modern digital libraries.</h2>
            <p>Whether you're a librarian, an IT lead, or a curious reader — there's a place for you.</p>
            <div className="cr-cta__row">
              {user ? (
                <Button size="lg" onClick={goToDashboard}>
                  Welcome back, {user.name?.split(" ")[0]} <ArrowRight size={18} />
                </Button>
              ) : (
                <>
                  <Button size="lg" onClick={() => navigate("/register")}>
                    Get started free <ArrowRight size={18} />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
                    I already have an account
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ════════════════ FOOTER ════════════════ */}
        <footer className="cr-footer">
          <div className="cr-footer__inner">
            {/* Brand */}
            <div className="cr-footer__brand">
              <Link to="/" className="cr-footer__brand-link">
                <span className="cr-footer__logo" aria-hidden="true">
                  <BookOpen size={20} />
                </span>
                CloudRead
              </Link>
              <p className="cr-footer__tagline">
                A private reading room in your cloud. Built for modern institutions
                that care about secure, auditable digital lending.
              </p>
              <div className="cr-footer__social">
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                  </svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
                <a href="mailto:hello@cloudread.io" aria-label="Email us">
                  <Mail size={18} />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="cr-footer__col">
              <h4 className="cr-footer__heading">Quick links</h4>
              <ul className="cr-footer__list">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/login">Sign in</Link></li>
                <li><Link to="/register">Create account</Link></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#benefits">Benefits</a></li>
              </ul>
            </div>

            {/* Features */}
            <div className="cr-footer__col">
              <h4 className="cr-footer__heading">Features</h4>
              <ul className="cr-footer__list">
                <li><a href="#features">Secure access</a></li>
                <li><a href="#features">Approval workflow</a></li>
                <li><a href="#features">Auto-expiry</a></li>
                <li><a href="#features">Live analytics</a></li>
                <li><a href="#ai">AI assistant</a></li>
              </ul>
            </div>

            {/* Contact & Legal */}
            <div className="cr-footer__col">
              <h4 className="cr-footer__heading">Contact</h4>
              <ul className="cr-footer__list">
                <li><a href="mailto:hello@cloudread.io">hello@cloudread.io</a></li>
                <li><a href="mailto:support@cloudread.io">support@cloudread.io</a></li>
                <li><span>CloudRead Inc.</span></li>
                <li><span>San Francisco, CA</span></li>
              </ul>
              <h4 className="cr-footer__heading cr-footer__heading--legal">Legal</h4>
              <ul className="cr-footer__list">
                <li><span style={{ cursor: "default" }}>Privacy Policy</span></li>
                <li><span style={{ cursor: "default" }}>Terms of Service</span></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="cr-footer__col cr-footer__col--newsletter">
              <h4 className="cr-footer__heading">Stay in the loop</h4>
              <p className="cr-footer__newsletter-text">
                Get product updates, library tips, and early access to new features.
              </p>
              <form
                className="cr-footer__newsletter"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.querySelector("input");
                  if (input?.value) {
                    input.value = "";
                    input.placeholder = "Thanks! You're subscribed ✨";
                  }
                }}
              >
                <input
                  type="email"
                  placeholder="Enter your email"
                  required
                  aria-label="Email for newsletter"
                />
                <button type="submit" aria-label="Subscribe">
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>

          <div className="cr-footer__bottom">
            <span>&copy; {new Date().getFullYear()} CloudRead. All rights reserved.</span>
            <span>Made with care &middot; v1.0 &middot; Open source on <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub</a></span>
          </div>
        </footer>
      </div>
      <BackToTopButton />
    </PageWrapper>
  );
};

export default Home;
