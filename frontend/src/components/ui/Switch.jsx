import { forwardRef, useId } from "react";
import "./Switch.css";

const Switch = forwardRef(function Switch(
  {
    label,
    helper,
    checked,
    onChange,
    disabled,
    className = "",
    id,
    size = "md",
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const inputId = id || `cr-switch-${reactId}`;

  return (
    <label
      htmlFor={inputId}
      className={`cr-switch cr-switch--${size} ${disabled ? "cr-switch--disabled" : ""} ${className}`}
    >
      <span className="cr-switch__track">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="cr-switch__input"
          {...rest}
        />
        <span className="cr-switch__thumb" aria-hidden="true" />
      </span>
      {(label || helper) ? (
        <span className="cr-switch__text">
          {label ? <span className="cr-switch__label">{label}</span> : null}
          {helper ? <span className="cr-switch__helper">{helper}</span> : null}
        </span>
      ) : null}
    </label>
  );
});

export default Switch;