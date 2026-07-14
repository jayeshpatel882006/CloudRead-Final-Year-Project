import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import { AuthHero } from "../illustrations";
import "./Auth.css";

/**
 * AuthShell — two-column authentication layout.
 * Left column is the brand/authentic narrative with a brand mark, copy, and an
 * AuthHero illustration. Right column is the form surface (passed via children).
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  altLink,
  align = "left",
}) {
  return (
    <div className={`cr-auth cr-auth--${align}`}>
      <aside className="cr-auth__brand" aria-hidden={align === "right" ? "false" : undefined}>
        <div className="cr-auth__brand-inner">
          <Link to="/" className="cr-auth__brand-link">
            <span className="cr-auth__brand-icon"><BookOpen size={18} /></span>
            CloudRead
          </Link>

          <div className="cr-auth__brand-copy">
            {eyebrow ? <span className="cr-auth__eyebrow">{eyebrow}</span> : null}
            <h2 className="cr-auth__brand-title">{title}</h2>
            {subtitle ? <p className="cr-auth__brand-subtitle">{subtitle}</p> : null}
          </div>

          <div className="cr-auth__art">
            <AuthHero size={240} />
          </div>

          <blockquote className="cr-auth__quote">
            “A library is a room where the walls whisper.”
            <cite>— Anonymous</cite>
          </blockquote>
        </div>
      </aside>

      <main className="cr-auth__panel" role="main">
        <Link to="/" className="cr-auth__top-link">
          <ArrowRight size={14} /> Back to home
        </Link>
        <div className="cr-auth__panel-inner">
          {children}
        </div>
        {altLink ? <div className="cr-auth__alt">{altLink}</div> : null}
      </main>
    </div>
  );
}