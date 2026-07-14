import { forwardRef, useId } from "react";
import "./Textarea.css";

const Textarea = forwardRef(function Textarea(
  {
    label,
    helper,
    error,
    rows = 4,
    className = "",
    id,
    value,
    onChange,
    placeholder,
    disabled,
    required,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const inputId = id || `cr-textarea-${reactId}`;
  const helperId = `${inputId}-helper`;
  const hasError = Boolean(error);

  return (
    <div className={`cr-textarea ${hasError ? "cr-textarea--error" : ""} ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="cr-textarea__label">
          {label}
          {required ? <span aria-hidden="true" className="cr-textarea__req"> *</span> : null}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={helper || error ? helperId : undefined}
        className="cr-textarea__input"
        {...rest}
      />
      {error || helper ? (
        <p id={helperId} className={`cr-textarea__helper ${hasError ? "cr-textarea__helper--error" : ""}`}>
          {error || helper}
        </p>
      ) : null}
    </div>
  );
});

export default Textarea;