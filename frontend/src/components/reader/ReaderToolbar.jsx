// components/reader/ReaderToolbar.jsx
// -----------------------------------------------------------------------------
// Floating glassmorphism toolbar for the full-screen PDF reader.
//
// Features:
//   - Auto-hides while scrolling, reappears when mouse moves to top 80px
//   - Back to Library button with book title and page counter
//   - Zoom controls (-, +, Fit Width, Fit Page)
//   - Fullscreen toggle
//   - Theme toggle (Light/Dark)
//   - More menu (placeholder for future features)
//   - Responsive: simplified on tablet, minimal on mobile
// -----------------------------------------------------------------------------

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FiArrowLeft,
  FiSearch,
  FiMinus,
  FiPlus,
  FiMaximize,
  FiMinimize2,
  FiSun,
  FiMoon,
  FiMoreHorizontal,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

const TOOLBAR_HIDE_DELAY = 2000; // ms after scrolling stops
const TOOLBAR_SHOW_ZONE = 80; // px from top to trigger toolbar show

export default function ReaderToolbar({
  title,
  currentPage,
  totalPages,
  zoom,
  onZoomChange,
  onFitWidth,
  onFitPage,
  onFullscreen,
  isFullscreen,
  onThemeToggle,
  isDark,
  onBack,
  onSearch,
  onPrevPage,
  onNextPage,
}) {
  const [visible, setVisible] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const hideTimerRef = useRef(null);
  const lastScrollY = useRef(0);
  const menuRef = useRef(null);

  // ── Auto-hide on scroll, show on mouse move to top ───────────
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (e.clientY < TOOLBAR_SHOW_ZONE) {
        setVisible(true);
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setVisible(false), TOOLBAR_HIDE_DELAY);
      }
    };

    const handleScroll = () => {
      setVisible(true);
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setVisible(false), TOOLBAR_HIDE_DELAY);
    };

    const scrollArea = document.querySelector(".reader-scroll-area");
    if (scrollArea) {
      scrollArea.addEventListener("scroll", handleScroll, { passive: true });
    }
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      clearTimeout(hideTimerRef.current);
      document.removeEventListener("mousemove", handleMouseMove);
      if (scrollArea) scrollArea.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  return (
    <>
      {/* Invisible hover zone at the top of the screen */}
      <div
        className="reader-toolbar-zone"
        onMouseEnter={() => {
          clearTimeout(hideTimerRef.current);
          setVisible(true);
        }}
      />

      <div className={`reader-toolbar ${visible ? "" : "reader-toolbar-hidden"}`}>
        {/* ── Left Section ───────────────────────────────────── */}
        <div className="reader-toolbar-left">
          <button
            className="reader-toolbar-back"
            onClick={onBack}
            title="Back to Library"
          >
            <FiArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className="reader-toolbar-divider" />

          <div className="reader-toolbar-title" title={title}>
            {title}
          </div>

          <div className="reader-toolbar-divider" />

          <span className="reader-toolbar-label">
            {currentPage} / {totalPages}
          </span>
        </div>

        {/* ── Center Section ──────────────────────────────────── */}
        <div className="reader-toolbar-center">
          <button
            className="reader-toolbar-btn"
            onClick={onPrevPage}
            title="Previous Page (↑)"
          >
            <FiChevronLeft size={16} />
          </button>

          <span className="reader-zoom-value">{currentPage}</span>

          <button
            className="reader-toolbar-btn"
            onClick={onNextPage}
            title="Next Page (↓)"
          >
            <FiChevronRight size={16} />
          </button>

          <div className="reader-toolbar-divider" />

          <button
            className="reader-toolbar-btn"
            onClick={onSearch}
            title="Search (future)"
          >
            <FiSearch size={16} />
          </button>

          <div className="reader-toolbar-divider" />

          <button
            className="reader-toolbar-btn"
            onClick={() => onZoomChange(zoom - 10)}
            title="Zoom Out (Ctrl+-)"
          >
            <FiMinus size={16} />
          </button>

          <span className="reader-zoom-value">{Math.round(zoom)}%</span>

          <button
            className="reader-toolbar-btn"
            onClick={() => onZoomChange(zoom + 10)}
            title="Zoom In (Ctrl++)"
          >
            <FiPlus size={16} />
          </button>

          <button
            className="reader-toolbar-btn"
            onClick={onFitWidth}
            title="Fit Width"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v10M21 7v10M7 12h10" />
            </svg>
          </button>

          <button
            className="reader-toolbar-btn"
            onClick={onFitPage}
            title="Fit Page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </button>
        </div>

        {/* ── Right Section ──────────────────────────────────── */}
        <div className="reader-toolbar-right">
          <button
            className={`reader-toolbar-btn ${isFullscreen ? "active" : ""}`}
            onClick={onFullscreen}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen (F)"}
          >
            {isFullscreen ? <FiMinimize2 size={16} /> : <FiMaximize size={16} />}
          </button>

          <button
            className="reader-toolbar-btn"
            onClick={onThemeToggle}
            title={isDark ? "Light Mode" : "Dark Mode"}
          >
            {isDark ? <FiSun size={16} /> : <FiMoon size={16} />}
          </button>

          <div className="reader-toolbar-divider" />

          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              className="reader-toolbar-btn"
              onClick={() => setShowMenu(!showMenu)}
              title="More"
            >
              <FiMoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 4,
                  background: "var(--reader-toolbar-bg)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid var(--reader-toolbar-border)",
                  borderRadius: 10,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  padding: 6,
                  minWidth: 160,
                  zIndex: 1200,
                }}
              >
                {[
                  { label: "Keyboard shortcuts", disabled: true },
                  { label: "Download PDF", disabled: true },
                  { label: "Print", disabled: true },
                ].map((item) => (
                  <button
                    key={item.label}
                    disabled={item.disabled}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: 6,
                      background: "transparent",
                      color: item.disabled
                        ? "var(--reader-text-secondary)"
                        : "var(--reader-text)",
                      cursor: item.disabled ? "not-allowed" : "pointer",
                      fontSize: "0.82rem",
                      textAlign: "left",
                      opacity: item.disabled ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!item.disabled) e.target.style.background = "rgba(79,70,229,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "transparent";
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
