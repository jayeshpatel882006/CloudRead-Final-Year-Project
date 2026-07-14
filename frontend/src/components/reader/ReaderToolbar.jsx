// components/reader/ReaderToolbar.jsx
// -----------------------------------------------------------------------------
// CloudRead-branded floating glass toolbar for the full-screen reader.
// Uses design tokens from tokens.css — no hardcoded colors.
// -----------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
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
  FiBook,
} from "react-icons/fi";
import BookCover from "../ui/BookCover";

const TOOLBAR_HIDE_DELAY = 2000;
const TOOLBAR_SHOW_ZONE = 80;

export default function ReaderToolbar({
  title,
  author,
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

  // ── Book thumbnail is shown only if title is available ────
  const hasThumbnail = Boolean(title);

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
        {/* ── Left Section ─────────────────────────────────────── */}
        <div className="reader-toolbar-left">
          <button className="reader-toolbar-back" onClick={onBack} title="Back to Library" aria-label="Back to library">
            <FiArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className="reader-toolbar-divider" />

          {/* Book thumbnail */}
          {hasThumbnail && (
            <div className="reader-toolbar-thumb">
              <BookCover title={title} author={author || ""} />
            </div>
          )}

          {/* Title + Author */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <div className="reader-toolbar-title" title={title}>
              {title}
            </div>
            {author && (
              <div className="reader-toolbar-author" title={author}>
                {author}
              </div>
            )}
          </div>

          <div className="reader-toolbar-divider" />

          <span className="reader-toolbar-label">
            {currentPage} / {totalPages}
          </span>
        </div>

        {/* ── Center Section ────────────────────────────────────── */}
        <div className="reader-toolbar-center">
          <button className="reader-toolbar-btn" onClick={onPrevPage} title="Previous Page (↑)">
            <FiChevronLeft size={16} />
          </button>

          <span className="reader-zoom-value">{currentPage}</span>

          <button className="reader-toolbar-btn" onClick={onNextPage} title="Next Page (↓)">
            <FiChevronRight size={16} />
          </button>

          <div className="reader-toolbar-divider" />

          <button className="reader-toolbar-btn" onClick={onSearch} title="Search (future)">
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

          <button className="reader-toolbar-btn" onClick={onFitWidth} title="Fit Width">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v10M21 7v10M7 12h10" />
            </svg>
          </button>

          <button className="reader-toolbar-btn" onClick={onFitPage} title="Fit Page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </button>
        </div>

        {/* ── Right Section ──────────────────────────────────────── */}
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
              <div className="reader-toolbar-menu">
                {[
                  { label: "Keyboard shortcuts", disabled: true },
                  { label: "Download PDF", disabled: true },
                  { label: "Print", disabled: true },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="reader-toolbar-menu-item"
                    disabled={item.disabled}
                    onClick={() => setShowMenu(false)}
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
