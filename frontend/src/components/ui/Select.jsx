import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import "./Select.css";

const Select = forwardRef(function Select(
  {
    label,
    helper,
    error,
    options = [],
    value,
    onChange,
    placeholder = "Select an option",
    disabled,
    required,
    className = "",
    id,
    size = "md",
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const inputId = id || `cr-select-${reactId}`;
  const helperId = `${inputId}-helper`;
  const hasError = Boolean(error);

  return (
    <div className={`cr-select cr-select--${size} ${hasError ? "cr-select--error" : ""} ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="cr-select__label">
          {label}
          {required ? <span aria-hidden="true" className="cr-select__req"> *</span> : null}
        </label>
      ) : null}
      <div className="cr-select__control">
        <select
          ref={ref}
          id={inputId}
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={helper || error ? helperId : undefined}
          className="cr-select__input"
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => {
            const v = typeof opt === "string" ? opt : opt.value;
            const l = typeof opt === "string" ? opt : opt.label;
            return (
              <option key={v} value={v}>
                {l}
              </option>
            );
          })}
        </select>
        <ChevronDown className="cr-select__chevron" size={16} />
      </div>
      {error || helper ? (
        <p id={helperId} className={`cr-select__helper ${hasError ? "cr-select__helper--error" : ""}`}>
          {error || helper}
        </p>
      ) : null}
    </div>
  );
});

export default Select;