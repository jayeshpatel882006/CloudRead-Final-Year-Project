import { forwardRef, useId } from "react";
import { Check, Minus } from "lucide-react";
import "./Checkbox.css";

const Checkbox = forwardRef(function Checkbox(
  {
    label,
    helper,
    error,
    checked,
    onChange,
    indeterminate = false,
    disabled,
    className = "",
    id,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const inputId = id || `cr-checkbox-${reactId}`;
  const hasError = Boolean(error);

  return (
    <label
      htmlFor={inputId}
      className={`cr-checkbox ${disabled ? "cr-checkbox--disabled" : ""} ${hasError ? "cr-checkbox--error" : ""} ${className}`}
    >
      <span className="cr-checkbox__box">
        <input
          ref={(el) => {
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
            if (el) el.indeterminate = indeterminate;
          }}
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="cr-checkbox__input"
          {...rest}
        />
        <span className="cr-checkbox__indicator" aria-hidden="true">
          {indeterminate ? <Minus size={12} /> : checked ? <Check size={12} /> : null}
        </span>
      </span>
      {(label || helper) ? (
        <span className="cr-checkbox__text">
          {label ? <span className="cr-checkbox__label">{label}</span> : null}
          {helper ? <span className="cr-checkbox__helper">{helper}</span> : null}
        </span>
      ) : null}
    </label>
  );
});

export default Checkbox;