import "./Stat.css";

export default function Stat({
  label,
  value,
  delta,
  icon: Icon,
  trend, // "up" | "down" | "flat"
  sparkline, // array of numbers 0..1
  className = "",
}) {
  const trendVariant = trend ?? (delta == null ? null : delta >= 0 ? "up" : "down");
  return (
    <div className={`cr-stat ${className}`}>
      <div className="cr-stat__head">
        <span className="cr-stat__label">{label}</span>
        {Icon ? (
          <span className="cr-stat__icon" aria-hidden="true">
            <Icon size={16} />
          </span>
        ) : null}
      </div>
      <div className="cr-stat__value">{value}</div>
      <div className="cr-stat__foot">
        {delta != null ? (
          <span className={`cr-stat__delta cr-stat__delta--${trendVariant}`}>
            {trendVariant === "up" ? "▲" : trendVariant === "down" ? "▼" : "—"}{" "}
            {Math.abs(delta)}%
          </span>
        ) : null}
        {sparkline ? (
          <Sparkline data={sparkline} className="cr-stat__spark" />
        ) : null}
      </div>
    </div>
  );
}

function Sparkline({ data, className }) {
  const w = 80, h = 24, pad = 2;
  const path = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (w - pad * 2) + pad;
      const y = h - pad - v * (h - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-hidden="true"
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}