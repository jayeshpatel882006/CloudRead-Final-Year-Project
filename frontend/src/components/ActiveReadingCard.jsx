import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Clock, AlertTriangle, Calendar, CheckCircle2 } from "lucide-react";
import BookCover from "./ui/BookCover";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import "./ActiveReadingCard.css";

const MS_DAY = 1000 * 60 * 60 * 24;
const MS_HOUR = 1000 * 60 * 60;

/**
 * Derive all display values from the access request dates.
 * Pure function — no side effects, no hooks. Call once per card.
 */
function deriveAccessState(request) {
  const now = Date.now();
  const start = new Date(request.accessStartDate).getTime();
  const end = new Date(request.accessEndDate).getTime();

  const totalDuration = end - start;
  const elapsed = now - start;
  const remaining = end - now;

  const progress = totalDuration > 0
    ? Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))
    : 0;

  const isExpired = remaining <= 0;
  const remainingDays = remaining / MS_DAY;
  const remainingHours = remaining / MS_HOUR;

  // Human-friendly "time remaining" string
  let timeLabel;
  let urgency; // "critical" | "soon" | "healthy" | "expired"

  if (isExpired) {
    timeLabel = "Expired";
    urgency = "expired";
  } else if (remainingHours < 1) {
    const mins = Math.max(1, Math.floor((remaining / (1000 * 60)) % 60));
    timeLabel = `Expires in ${mins} ${mins === 1 ? "minute" : "minutes"}`;
    urgency = "critical";
  } else if (remainingDays < 1) {
    const hrs = Math.max(1, Math.floor(remainingHours));
    timeLabel = `Expires in ${hrs} ${hrs === 1 ? "hour" : "hours"}`;
    urgency = "critical";
  } else if (remainingDays <= 3) {
    const days = Math.ceil(remainingDays);
    timeLabel = `${days} ${days === 1 ? "Day" : "Days"} Remaining`;
    urgency = "soon";
  } else {
    const days = Math.floor(remainingDays);
    timeLabel = `${days} ${days === 1 ? "Day" : "Days"} Remaining`;
    urgency = "healthy";
  }

  // Progress stats
  const usedDays = Math.max(0, elapsed / MS_DAY);
  const totalDays = Math.max(1, totalDuration / MS_DAY);

  return {
    timeLabel,
    urgency,
    progress: Math.round(progress),
    usedDays: usedDays.toFixed(1),
    totalDays: Math.round(totalDays),
    endDate: new Date(end),
    isExpired,
    remainingDays: Math.max(0, remainingDays),
  };
}

export default function ActiveReadingCard({ request }) {
  const navigate = useNavigate();
  const book = request.book || {};
  const title = book.title || "Untitled";
  const author = book.author || "Unknown";

  const state = useMemo(() => deriveAccessState(request), [request]);

  const handleRead = (e) => {
    e.stopPropagation();
    navigate(`/student/book/${book._id}`);
  };

  const urgencyConfig = {
    healthy: {
      dot: "success",
      badgeVariant: "success",
      barClass: "cr-arc__bar--healthy",
      label: "Reading",
    },
    soon: {
      dot: "warning",
      badgeVariant: "warning",
      barClass: "cr-arc__bar--soon",
      label: "Expiring soon",
    },
    critical: {
      dot: "danger",
      badgeVariant: "danger",
      barClass: "cr-arc__bar--critical",
      label: "Expires today",
    },
    expired: {
      dot: "neutral",
      badgeVariant: "neutral",
      barClass: "cr-arc__bar--expired",
      label: "Expired",
    },
  }[state.urgency];

  return (
    <article className={`cr-arc cr-arc--${state.urgency}`}>
      <div className="cr-arc__cover">
        <BookCover title={title} author={author} className="cr-arc__cover-img" />
      </div>

      <div className="cr-arc__body">
        <div className="cr-arc__header">
          <div className="cr-arc__titles">
            <h3 className="cr-arc__title" title={title}>{title}</h3>
            <p className="cr-arc__author" title={author}>{author}</p>
          </div>
          <Badge variant={urgencyConfig.badgeVariant} dot size="sm">
            {urgencyConfig.label}
          </Badge>
        </div>

        <div className="cr-arc__meta">
          <span className={`cr-arc__time cr-arc__time--${state.urgency}`}>
            <Clock size={14} />
            {state.timeLabel}
          </span>
          <span className="cr-arc__date">
            <Calendar size={14} />
            Until {state.endDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Progress bar */}
        <div className="cr-arc__progress">
          <div className="cr-arc__progress-track">
            <span
              className={`cr-arc__progress-fill ${urgencyConfig.barClass}`}
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <span className="cr-arc__progress-label">
            <CheckCircle2 size={12} />
            {state.usedDays} / {state.totalDays} {state.totalDays === 1 ? "day" : "days"} used
          </span>
        </div>

        {/* Warning banner */}
        {state.urgency === "soon" || state.urgency === "critical" ? (
          <div className={`cr-arc__warning cr-arc__warning--${state.urgency}`}>
            <AlertTriangle size={14} />
            {state.urgency === "soon"
              ? "Your access expires soon. Renew if needed."
              : "Your access ends today. Renew to keep reading."}
          </div>
        ) : null}

        <div className="cr-arc__actions">
          {!state.isExpired && (
            <Button size="md" onClick={handleRead} leftIcon={<BookOpen size={15} />}>
              Read book
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
