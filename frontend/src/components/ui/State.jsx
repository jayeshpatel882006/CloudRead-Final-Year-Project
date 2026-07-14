import { Button } from "./index";
import "./State.css";

export function EmptyState({
  illustration: Illustration,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  className = "",
}) {
  return (
    <div className={`cr-state cr-state--empty ${className}`}>
      {Illustration ? <div className="cr-state__art"><Illustration size={180} /></div> : null}
      <div className="cr-state__text">
        {title ? <h3 className="cr-state__title">{title}</h3> : null}
        {description ? <p className="cr-state__description">{description}</p> : null}
      </div>
      {(actionLabel || secondaryLabel) ? (
        <div className="cr-state__actions">
          {actionLabel ? (
            <Button variant="primary" onClick={onAction}>{actionLabel}</Button>
          ) : null}
          {secondaryLabel ? (
            <Button variant="ghost" onClick={onSecondaryAction}>{secondaryLabel}</Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ErrorState({
  illustration: Illustration,
  title = "Something went wrong",
  description,
  actionLabel = "Try again",
  onAction,
  className = "",
}) {
  return (
    <div className={`cr-state cr-state--error ${className}`}>
      {Illustration ? <div className="cr-state__art"><Illustration size={180} /></div> : null}
      <div className="cr-state__text">
        <h3 className="cr-state__title">{title}</h3>
        {description ? <p className="cr-state__description">{description}</p> : null}
      </div>
      {onAction ? (
        <div className="cr-state__actions">
          <Button variant="primary" onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </div>
  );
}

export function Skeleton({ width, height, radius, className = "", style = {} }) {
  return (
    <span
      aria-hidden="true"
      className={`cr-skeleton ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function Spinner({ size = 20, className = "" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`cr-spinner ${className}`}
      style={{ width: size, height: size }}
    />
  );
}