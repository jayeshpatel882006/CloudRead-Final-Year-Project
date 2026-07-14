import { forwardRef } from "react";
import "./IconButton.css";

const IconButton = forwardRef(function IconButton(
  {
    label,
    icon,
    size = "md",
    variant = "ghost",
    className = "",
    as = "button",
    type = "button",
    ...rest
  },
  ref,
) {
  const Comp = as;
  const classes = [
    "cr-icon-btn",
    `cr-icon-btn--${variant}`,
    `cr-icon-btn--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Comp
      ref={ref}
      type={as === "button" ? type : undefined}
      className={classes}
      aria-label={label}
      title={label}
      {...rest}
    >
      {icon}
    </Comp>
  );
});

export default IconButton;