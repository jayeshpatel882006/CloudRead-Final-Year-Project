import { useMemo } from "react";
import "./BookCover.css";

/**
 * BookCover — 2:3 gradient cover with monogram initial.
 * Deterministic gradient from title hash so every book has a stable color.
 * Used as the visual representation of a book everywhere a thumbnail is needed.
 */
function hashPair(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const GRADIENT_PAIRS = [
  ["var(--brand-700)", "var(--ink-700)"],
  ["var(--brand-500)", "var(--brand-800)"],
  ["var(--ink-brown-500)", "var(--ink-brown-900)"],
  ["var(--ember-600)", "var(--ink-brown-700)"],
  ["var(--brand-600)", "var(--ember-500)"],
  ["var(--ink-700)", "var(--ink-900)"],
  ["var(--ember-500)", "var(--brand-700)"],
  ["var(--ink-brown-700)", "var(--brand-800)"],
];

export default function BookCover({
  title = "",
  author = "",
  size = "md",
  coverUrl,
  className = "",
  showSpine = true,
  ...rest
}) {
  const initial = useMemo(() => {
    const trimmed = (title || author || "?").trim();
    return trimmed.charAt(0).toUpperCase() || "?";
  }, [title, author]);

  const [from, to] = useMemo(() => {
    const idx = hashPair(title + author) % GRADIENT_PAIRS.length;
    return GRADIENT_PAIRS[idx];
  }, [title, author]);

  return (
    <div
      className={`cr-book-cover cr-book-cover--${size} ${className}`}
      style={{
        "--cover-from": from,
        "--cover-to": to,
      }}
      role="img"
      aria-label={`Cover of ${title || "Untitled"}`}
      {...rest}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="cr-book-cover__image"
          loading="lazy"
        />
      ) : (
        <div className="cr-book-cover__art" aria-hidden="true">
          <span className="cr-book-cover__initial">{initial}</span>
          <span className="cr-book-cover__divider" />
          <span className="cr-book-cover__title">{title}</span>
        </div>
      )}
      {showSpine ? <span className="cr-book-cover__spine" aria-hidden="true" /> : null}
    </div>
  );
}