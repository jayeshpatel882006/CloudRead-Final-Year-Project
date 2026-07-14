import { useId } from "react";
import "./Tabs.css";

export function Tabs({ value, onValueChange, items = [], className = "" }) {
  const groupId = useId();
  return (
    <div role="tablist" className={`cr-tabs ${className}`}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            type="button"
            role="tab"
            key={item.value}
            id={`tab-${groupId}-${item.value}`}
            aria-selected={active}
            aria-controls={`panel-${groupId}-${item.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange?.(item.value)}
            className={`cr-tabs__tab ${active ? "cr-tabs__tab--active" : ""}`}
          >
            {item.icon ? <span className="cr-tabs__icon" aria-hidden="true">{item.icon}</span> : null}
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span className="cr-tabs__count">{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ value, activeValue, id, children }) {
  if (value !== activeValue) return null;
  return (
    <div role="tabpanel" id={id} className="cr-tabs__panel">
      {children}
    </div>
  );
}