import { useMemo } from "react";
import { Lock } from "lucide-react";
import Input from "./Input";

function scorePassword(value) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_VARIANTS = ["weak", "weak", "fair", "good", "strong"];

export default function PasswordInput({
  value = "",
  onChange,
  showStrength = true,
  ...rest
}) {
  const strength = useMemo(() => scorePassword(value), [value]);

  return (
    <div className="cr-password">
      <Input
        type="password"
        value={value}
        onChange={onChange}
        leftIcon={<Lock size={16} />}
        {...rest}
      />
      {showStrength && value ? (
        <div className="cr-password__strength" aria-live="polite">
          <div className="cr-password__bars" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={`cr-password__bar ${
                  i < strength ? `cr-password__bar--${STRENGTH_VARIANTS[strength]}` : ""
                }`}
              />
            ))}
          </div>
          <span className={`cr-password__label cr-password__label--${STRENGTH_VARIANTS[strength]}`}>
            {STRENGTH_LABELS[strength]}
          </span>
        </div>
      ) : null}
    </div>
  );
}