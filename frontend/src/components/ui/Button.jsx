import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import "./Button.css";

const VARIANTS = ["primary", "secondary", "ghost", "danger", "accent", "outline"];
const SIZES = ["sm", "md", "lg"];

const Button = forwardRef(function Button(
  {
    as = "button",
    variant = "primary",
    size = "md",
    fullWidth = false,
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    iconOnly = false,
    type = "button",
    className = "",
    children,
    ...rest
  },
  ref,
) {
  if (!VARIANTS.includes(variant)) variant = "primary";
  if (!SIZES.includes(size)) size = "md";

  const isDisabled = disabled || loading;
  const Comp = as;

  const classes = [
    "cr-btn",
    `cr-btn--${variant}`,
    `cr-btn--${size}`,
    fullWidth ? "cr-btn--full" : "",
    iconOnly ? "cr-btn--icon-only" : "",
    loading ? "cr-btn--loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Comp
      ref={ref}
      type={as === "button" ? type : undefined}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="cr-btn__spinner" aria-hidden="true">
          <Loader2 size={16} />
        </span>
      ) : leftIcon ? (
        <span className="cr-btn__icon cr-btn__icon--left" aria-hidden="true">
          {leftIcon}
        </span>
      ) : null}
      <span className="cr-btn__label">{children}</span>
      {!loading && rightIcon ? (
        <span className="cr-btn__icon cr-btn__icon--right" aria-hidden="true">
          {rightIcon}
        </span>
      ) : null}
    </Comp>
  );
});

export default Button;