import "./InsightCard.css";

/**
 * InsightCard — renders one structured smart insight from the backend.
 * The backend returns { type, priority, title, message }; priority drives the
 * accent color. An optional icon (emoji string) can override the default.
 */
const DEFAULT_ICONS = {
  positive: "📈",
  info: "🕒",
  warning: "⚠️",
  neutral: "💡",
};

export default function InsightCard({ insight, className = "" }) {
  if (!insight) return null;
  const priority = insight.priority || "neutral";
  const icon = insight.icon || DEFAULT_ICONS[priority] || "💡";

  return (
    <article className={`cr-insight cr-insight--${priority} ${className}`}>
      <span className="cr-insight__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="cr-insight__body">
        <h3 className="cr-insight__title">{insight.title}</h3>
        <p className="cr-insight__message">{insight.message}</p>
      </div>
    </article>
  );
}