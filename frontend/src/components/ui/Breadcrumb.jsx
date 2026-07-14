import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import "./Breadcrumb.css";

export default function Breadcrumb({ items = [], className = "" }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className={`cr-breadcrumb ${className}`}>
      <ol>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="cr-breadcrumb__item">
              {item.to && !last ? (
                <Link to={item.to} className="cr-breadcrumb__link">
                  {item.label}
                </Link>
              ) : (
                <span className="cr-breadcrumb__current" aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!last ? (
                <ChevronRight size={14} className="cr-breadcrumb__sep" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}