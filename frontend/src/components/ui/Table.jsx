import { ChevronLeft, ChevronRight } from "lucide-react";
import "./Table.css";

export function Table({ children, className = "", ...rest }) {
  return (
    <div className="cr-table-wrap">
      <table className={`cr-table ${className}`} {...rest}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }) {
  return <thead className="cr-table__head">{children}</thead>;
}

export function TBody({ children }) {
  return <tbody className="cr-table__body">{children}</tbody>;
}

export function TR({ children, className = "", ...rest }) {
  return (
    <tr className={`cr-table__row ${className}`} {...rest}>
      {children}
    </tr>
  );
}

export function TH({ children, className = "", ...rest }) {
  return (
    <th className={`cr-table__th ${className}`} {...rest}>
      {children}
    </th>
  );
}

export function TD({ children, className = "", ...rest }) {
  return (
    <td className={`cr-table__td ${className}`} {...rest}>
      {children}
    </td>
  );
}

export function EmptyTR({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="cr-table__empty">{children}</td>
    </tr>
  );
}

/* ─── Pagination ───────────────────────────────────────────────────── */
export function Pagination({ page, totalPages, onPageChange, className = "" }) {
  if (totalPages <= 1) return null;
  const pages = buildPageList(page, totalPages);
  return (
    <nav className={`cr-pagination ${className}`} aria-label="Pagination">
      <button
        type="button"
        className="cr-pagination__btn"
        disabled={page <= 1}
        onClick={() => onPageChange?.(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p, i) =>
        p === "…"
          ? (
            <span key={`gap-${i}`} className="cr-pagination__gap" aria-hidden="true">…</span>
          )
          : (
            <button
              key={p}
              type="button"
              className={`cr-pagination__btn ${p === page ? "cr-pagination__btn--active" : ""}`}
              onClick={() => onPageChange?.(p)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Page ${p}`}
            >
              {p}
            </button>
          ),
      )}
      <button
        type="button"
        className="cr-pagination__btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange?.(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

function buildPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("…");
    out.push(sorted[i]);
  }
  return out;
}