import "./Badge.css";

const VARIANTS = ["neutral", "primary", "success", "warning", "danger", "info", "ember"];

export default function Badge({
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
  children,
  ...rest
}) {
  if (!VARIANTS.includes(variant)) variant = "neutral";
  return (
    <span
      className={`cr-badge cr-badge--${variant} cr-badge--${size} ${className}`}
      {...rest}
    >
      {dot ? <span className="cr-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}