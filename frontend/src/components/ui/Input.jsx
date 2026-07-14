import { forwardRef, useId, useState } from "react";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import "./Input.css";

const Input = forwardRef(function Input(
  {
    label,
    helper,
    error,
    success,
    leftIcon,
    rightIcon,
    size = "md",
    as = "input",
    className = "",
    inputClassName = "",
    id,
    type = "text",
    value,
    onChange,
    onBlur,
    onFocus,
    placeholder,
    disabled,
    required,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const inputId = id || `cr-input-${reactId}`;
  const helperId = `${inputId}-helper`;
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const effectiveType = isPassword && showPassword ? "text" : type;
  const hasError = Boolean(error);
  const hasSuccess = Boolean(success) && !hasError;

  const Comp = as;

  return (
    <div
      className={[
        "cr-field",
        `cr-field--${size}`,
        focused ? "cr-field--focused" : "",
        hasError ? "cr-field--error" : "",
        hasSuccess ? "cr-field--success" : "",
        disabled ? "cr-field--disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label ? (
        <label htmlFor={inputId} className="cr-field__label">
          {label}
          {required ? <span aria-hidden="true" className="cr-field__req"> *</span> : null}
        </label>
      ) : null}

      <div className="cr-field__control">
        {leftIcon ? (
          <span className="cr-field__icon cr-field__icon--left" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}

        <Comp
          ref={ref}
          id={inputId}
          type={effectiveType}
          value={value}
          onChange={onChange}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={helper || error ? helperId : undefined}
          className={`cr-field__input ${inputClassName}`}
          {...rest}
        />

        {isPassword ? (
          <button
            type="button"
            className="cr-field__icon cr-field__icon--right cr-field__toggle"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : rightIcon ? (
          <span className="cr-field__icon cr-field__icon--right" aria-hidden="true">
            {rightIcon}
          </span>
        ) : null}

        {hasError ? (
          <span className="cr-field__status cr-field__status--error" aria-hidden="true">
            <AlertCircle size={16} />
          </span>
        ) : null}
        {hasSuccess ? (
          <span className="cr-field__status cr-field__status--success" aria-hidden="true">
            <CheckCircle2 size={16} />
          </span>
        ) : null}
      </div>

      {error || helper ? (
        <p id={helperId} className={`cr-field__helper ${hasError ? "cr-field__helper--error" : ""}`}>
          {error || helper}
        </p>
      ) : null}
    </div>
  );
});

export default Input;