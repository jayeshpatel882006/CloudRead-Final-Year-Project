// pages/BookViewer.jsx
// -----------------------------------------------------------------------------
// Professional full-screen e-book reader.
//
// Architecture:
//   ┌──────────────────────────────────────────────────────────┐
//   │  ReaderToolbar (floating glassmorphism, auto-hide)      │
//   ├──────────────────────────────────────────────────────────┤
//   │                                                         │
//   │  ┌──── ReaderSidebar ────┐  ┌── Reading Area ────────┐ │
//   │  │ (collapsible)         │  │                         │ │
//   │  │ Book cover            │  │  PageCanvas 1          │ │
//   │  │ Book details          │  │  PageCanvas 2          │ │
//   │  │ Bookmarks (future)    │  │  PageCanvas 3 ...      │ │
//   │  │ TOC (future)          │  │                         │ │
//   │  └────────────────────────┘  └────────────────────────┘ │
//   │                                    ┌── FloatingActions │
//   │                                    │  (right side)     │
//   ├──────────────────────────────────────────────────────────┤
//   │  PageIndicator (bottom pill)                             │
//   └──────────────────────────────────────────────────────────┘
//
// Features:
//   - Full-screen (no navbar, no sidebar, no footer)
//   - Floating glassmorphism toolbar with auto-hide
//   - Collapsible left sidebar with book info
//   - Right-side floating action buttons
//   - Bottom page indicator pill
//   - Lazy loading via IntersectionObserver
//   - Zoom controls (+, -, fit width, fit page)
//   - Keyboard shortcuts (↑↓ zoom fullscreen)
//   - Light/Dark theme toggle
//   - Responsive (desktop, tablet, mobile)
//   - Fade-in page animations
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import Loader from "../components/Loader";
import { toast } from "react-toastify";

import { FiSidebar } from "react-icons/fi";
import ReaderToolbar from "../components/reader/ReaderToolbar";
import ReaderSidebar from "../components/reader/ReaderSidebar";
import PageCanvas from "../components/reader/PageCanvas";
import FloatingActions from "../components/reader/FloatingActions";
import PageIndicator from "../components/reader/PageIndicator";
import "../css/reader.css";

const TAG = "[BookViewer]";
const MOUNT_AHEAD = 2; // pages to mount ahead of current
const ROOT_MARGIN = "1000px"; // how far ahead to trigger loading

// ── Module-level failed-pages set is managed by PageCanvas ──

// ── Main Reader Component ──────────────────────────────
const BookViewer = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();

  // State
  const [meta, setMeta] = useState(null);
  const [visibleUpTo, setVisibleUpTo] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState(null);

  // Refs
  const scrollRef = useRef(null);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  const pageRefs = useRef(new Map());
  const containerRef = useRef(null);

  // ── Metadata fetch ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setMetaLoading(true);
    setMetaError(null);

    (async () => {
      try {
        console.debug(TAG, "fetching book info", { bookId });
        const { data } = await API.get(`/access/book/${bookId}/info`);
        if (!cancelled) {
          setMeta(data);
          setVisibleUpTo(1);
          setMetaLoading(false);
          console.debug(TAG, "book info received", data);
        }
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        setMetaLoading(false);
        setMetaError(status || "unknown");
        console.error(TAG, "info fetch failed", { status, bookId });

        if (status === 401) {
          toast.error("Please log in to view this book.");
          navigate("/login");
        } else if (status === 403) {
          toast.error("Access denied. Request access from your dashboard first.");
        } else if (status === 410) {
          toast.error("Your access to this book has expired.");
        } else if (status === 404) {
          toast.error("Book not found.");
        } else {
          toast.error("Failed to load book.");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [bookId, navigate]);

  // ── IntersectionObserver for lazy loading ──────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const p = parseInt(entry.target.dataset?.page || "0", 10);
          if (p > 0) {
            setVisibleUpTo((cur) => Math.max(cur, p));
          }
        }
      },
      { rootMargin: `0px 0px ${ROOT_MARGIN} 0px` },
    );
    observerRef.current = observer;
    return () => observer.disconnect();
  }, []);

  // ── Sync observer targets ────────────────────────────────────
  useLayoutEffect(() => {
    const observer = observerRef.current;
    if (!observer || !meta) return;

    observer.disconnect();
    pageRefs.current.forEach((el) => { if (el) observer.observe(el); });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
  }, [visibleUpTo, meta]);

  // ── Track current page on scroll ──────────────────────────────
  useEffect(() => {
    const scrollArea = scrollRef.current;
    if (!scrollArea) return;

    const handler = () => {
      // Find the page closest to viewport center
      const viewportCenter = window.innerHeight / 2;
      let bestPage = 1;
      let bestDistance = Infinity;

      pageRefs.current.forEach((el, pageNum) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const dist = Math.abs(elCenter - viewportCenter);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestPage = pageNum;
        }
      });

      if (bestPage !== currentPage) {
        setCurrentPage(bestPage);
      }
    };

    scrollArea.addEventListener("scroll", handler, { passive: true });
    return () => scrollArea.removeEventListener("scroll", handler);
  }, [currentPage, meta]);

  // ── Fullscreen API ────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // ── Fullscreen change listener ───────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  // ── Navigate back ─────────────────────────────────────────────
  const goBack = useCallback(() => navigate("/student"), [navigate]);

  // ── Zoom handlers ─────────────────────────────────────────────
  const handleZoomChange = useCallback((val) => {
    setZoom(Math.max(50, Math.min(200, val)));
  }, []);

  const handleFitWidth = useCallback(() => setZoom(100), []);
  const handleFitPage = useCallback(() => setZoom(80), []);

  // ── Theme toggle ──────────────────────────────────────────────
  const toggleTheme = useCallback(() => setIsDark((d) => !d), []);

  // ── Go to top ────────────────────────────────────────────────
  const goToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Navigate pages ────────────────────────────────────────────
  // Scrolls to the exact page element using its DOM position.
  // Never approximate — uses getBoundingClientRect for precision.
  const scrollToPage = useCallback((targetPage) => {
    const scrollArea = scrollRef.current;
    if (!scrollArea) return;

    const targetEl = pageRefs.current.get(targetPage);
    if (!targetEl) return;

    const targetRect = targetEl.getBoundingClientRect();
    const containerRect = scrollArea.getBoundingClientRect();

    // Calculate exact scroll position: current scroll pos + element offset within viewport.
    // Subtract 24px (--space-6) so the page has breathing room from the top.
    const targetScrollTop = scrollArea.scrollTop + targetRect.top - containerRect.top - 24;

    scrollArea.scrollTo({ top: targetScrollTop, behavior: "smooth" });
    setCurrentPage(targetPage);
  }, []);

  const goToPrevPage = useCallback(() => {
    const prev = currentPage - 1;
    if (prev < 1) return;
    scrollToPage(prev);
  }, [currentPage, scrollToPage]);

  const goToNextPage = useCallback(() => {
    const next = currentPage + 1;
    if (next > (meta?.totalPages || 0)) return;
    scrollToPage(next);
  }, [currentPage, meta?.totalPages, scrollToPage]);

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // Ignore if user is typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          goToNextPage();
          break;
        case "ArrowUp":
          e.preventDefault();
          goToPrevPage();
          break;
        case "=":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom((z) => Math.min(200, z + 10));
          }
          break;
        case "-":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom((z) => Math.max(50, z - 10));
          }
          break;
        case "0":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(100);
          }
          break;
        case "f":
        case "F":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case "Escape":
          if (document.fullscreenElement) {
            toggleFullscreen();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggleFullscreen, goToPrevPage, goToNextPage]);

  // ── Loading State ────────────────────────────────────────────
  if (metaLoading) {
    return (
      <div className="reader-container">
        <div className="reader-loading-state">
          <Loader />
        </div>
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────
  if (metaError || !meta) {
    return (
      <div className="reader-container">
        <div className="reader-error-state">
          <h2 className="reader-error-state__title">Could not open book</h2>
          <p className="reader-error-state__desc">
            {metaError === 403 && "Access denied. Please request access from your dashboard."}
            {metaError === 410 && "Your access to this book has expired."}
            {metaError === 404 && "Book not found."}
            {metaError === "unknown" && "An error occurred while loading the book."}
          </p>
          <button className="reader-retry-btn" onClick={goBack}>
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  // ── Calculate mounted page range ─────────────────────────────
  const total = meta.totalPages || 0;
  const mountEnd = Math.min(total, visibleUpTo + MOUNT_AHEAD);
  const mountedPages = [];
  for (let p = 1; p <= mountEnd; p++) mountedPages.push(p);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`reader-container ${isDark ? "reader-dark" : ""}`}
    >
      {/* ── Toolbar ──────────────────────────────── */}
      <ReaderToolbar
        title={meta.title}
        author={meta.author}
        currentPage={currentPage}
        totalPages={total}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        onThemeToggle={toggleTheme}
        isDark={isDark}
        onBack={goBack}
        onSearch={() => toast.info("Search coming soon")}
        onPrevPage={goToPrevPage}
        onNextPage={goToNextPage}
      />

      {/* ── Sidebar Toggle ─────────────────────────── */}
      <button
        className="reader-sidebar-toggle"
        onClick={() => setSidebarOpen(true)}
        title="Book Info"
      >
        <FiSidebar size={16} />
      </button>

      <ReaderSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        meta={meta}
        currentPage={currentPage}
        bookId={bookId}
      />

      {/* ── Reading Area ─────────────────────────── */}
      <div className="reader-scroll-area" ref={scrollRef}>
        <div className="reader-pages">
          {mountedPages.map((pageNum) => (
            <div
              key={pageNum}
              ref={(el) => {
                if (el) pageRefs.current.set(pageNum, el);
                else pageRefs.current.delete(pageNum);
              }}
              data-page={pageNum}
              style={{ width: "100%" }}
            >
              <PageCanvas
                bookId={bookId}
                pageNum={pageNum}
                zoom={zoom}
              />
            </div>
          ))}

          {/* Sentinel for lazy loading */}
          {mountEnd < total && (
            <div
              ref={sentinelRef}
              className="reader-sentinel"
              data-page={mountEnd + 1}
            >
              <Loader inline />
              <span>Loading more pages…</span>
            </div>
          )}

          {mountEnd >= total && total > 0 && (
            <div className="reader-end">🎉 You've reached the end of this book</div>
          )}
        </div>
      </div>

      {/* ── Floating Actions ─────────────────────── */}
      <FloatingActions currentPage={currentPage} onGoToTop={goToTop} />

      {/* ── Page Indicator ───────────────────────── */}
      <PageIndicator currentPage={currentPage} totalPages={total} zoom={zoom} />
    </div>
  );
};

export default BookViewer;
