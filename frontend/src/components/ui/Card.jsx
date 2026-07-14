import { forwardRef } from "react";
import "./Card.css";

const Card = forwardRef(function Card(
  {
    as = "div",
    variant = "default",
    padding = "md",
    interactive = false,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const Comp = as;
  const classes = [
    "cr-card",
    `cr-card--${variant}`,
    `cr-card--p-${padding}`,
    interactive ? "cr-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Comp ref={ref} className={classes} {...rest}>
      {children}
    </Comp>
  );
});

export default Card;