import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import IconButton from "./IconButton";
import "./Dialog.css";

export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  hideClose = false,
  className = "",
}) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (previousFocus.current instanceof HTMLElement) {
        previousFocus.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="cr-dialog-backdrop" onClick={onClose} aria-hidden="true">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "cr-dialog-title" : undefined}
        tabIndex={-1}
        className={`cr-dialog cr-dialog--${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || !hideClose) ? (
          <div className="cr-dialog__header">
            <div>
              {title ? (
                <h2 id="cr-dialog-title" className="cr-dialog__title">{title}</h2>
              ) : null}
              {description ? (
                <p className="cr-dialog__description">{description}</p>
              ) : null}
            </div>
            {!hideClose ? (
              <IconButton
                label="Close"
                size="sm"
                icon={<X size={16} />}
                onClick={onClose}
              />
            ) : null}
          </div>
        ) : null}
        <div className="cr-dialog__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}