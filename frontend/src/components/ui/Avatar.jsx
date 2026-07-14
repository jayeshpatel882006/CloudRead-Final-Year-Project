import { useState } from "react";
import "./Avatar.css";

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase() || "?";
}

function hashColor(seed = "") {
  const colors = [
    "var(--brand-500)",
    "var(--ember-500)",
    "var(--ink-brown-500)",
    "var(--brand-700)",
    "var(--ember-600)",
    "var(--ink-600)",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return colors[Math.abs(h) % colors.length];
}

export default function Avatar({
  name = "",
  src,
  size = "md",
  className = "",
  alt,
  ...rest
}) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  const display = alt ?? name;
  const style = {
    backgroundColor: showImage ? undefined : hashColor(name || display),
  };

  return (
    <span
      className={`cr-avatar cr-avatar--${size} ${className}`}
      style={style}
      role="img"
      aria-label={display}
      {...rest}
    >
      {showImage ? (
        <img
          src={src}
          alt={display}
          onError={() => setErrored(true)}
          className="cr-avatar__img"
        />
      ) : (
        <span className="cr-avatar__initials">{initials(name)}</span>
      )}
    </span>
  );
}