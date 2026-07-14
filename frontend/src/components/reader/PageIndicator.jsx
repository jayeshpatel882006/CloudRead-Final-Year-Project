// components/reader/PageIndicator.jsx
// -----------------------------------------------------------------------------
// CloudRead-branded floating bottom pill showing page progress and zoom level.
// Uses design tokens — no hardcoded colors.
// Auto-hides after 2 seconds of inactivity, reappears on scroll.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";

export default function PageIndicator({ currentPage, totalPages, zoom = 100 }) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2000);

    const scrollArea = document.querySelector(".reader-scroll-area");
    if (!scrollArea) return;

    const handler = () => {
      setVisible(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 2000);
    };

    scrollArea.addEventListener("scroll", handler, { passive: true });
    return () => {
      scrollArea.removeEventListener("scroll", handler);
      clearTimeout(timerRef.current);
    };
  }, [currentPage]);

  return (
    <div
      className={`reader-page-indicator ${
        visible ? "" : "reader-page-indicator-hidden"
      }`}
    >
      <span>Page {currentPage}</span>
      <span className="reader-page-indicator__sep">/</span>
      <span>{totalPages}</span>
      <span className="reader-page-indicator__divider" />
      <span>{Math.round(zoom)}%</span>
    </div>
  );
}
