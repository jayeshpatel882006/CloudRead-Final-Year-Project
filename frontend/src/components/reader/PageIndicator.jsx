// components/reader/PageIndicator.jsx
// -----------------------------------------------------------------------------
// Floating bottom pill showing "Page 15 / 320".
// Updates automatically based on the current visible page.
// Auto-hides after 2 seconds of inactivity, reappears on scroll.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";

export default function PageIndicator({ currentPage, totalPages }) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    // Show on scroll, hide after 2s
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
      <span style={{ opacity: 0.5 }}>/</span>
      <span style={{ opacity: 0.7 }}>{totalPages}</span>
    </div>
  );
}
