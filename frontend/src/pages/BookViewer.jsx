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

  // ── Reading session tracking ──────────────────────────────
  const sessionRef = useRef(null);
  const sessionBookRef = useRef(null);
  const stopTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const tickTimerRef = useRef(null);
  const currentPageRef = useRef(1);
  const totalPagesRef = useRef(0);
  const activeSecondsRef = useRef(0);
  const trackingRef = useRef(false);
  const [trackingActive, setTrackingActive] = useState(false);

  // Keep refs in sync for the session tracker (avoid stale closures).
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    totalPagesRef.current = meta?.totalPages || 0;
  }, [meta]);

  useEffect(() => {
    trackingRef.current = trackingActive;
  }, [trackingActive]);

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

  // ── Reading session: start / heartbeat / stop ───────────────────
  // Send the periodic activity update. Only runs while the tab is visible, so
  // hidden-tab time is never counted. `activeSeconds` carries how many seconds
  // the ticker actually counted while visible; the backend clamps it.
  const sendHeartbeat = useCallback(async () => {
    const sessionId = sessionRef.current;
    if (!sessionId || !trackingRef.current) return;
    if (document.visibilityState !== "visible") return;

    const activeSeconds = activeSecondsRef.current;
    activeSecondsRef.current = 0;

    try {
      const { data } = await API.post("/reading/heartbeat", {
        sessionId,
        currentPage: currentPageRef.current,
        totalPages: totalPagesRef.current,
        activeSeconds,
      });
      console.debug(TAG, "heartbeat", {
        lastPage: data.lastPage,
        progress: data.progressPercentage,
        duration: data.durationInSeconds,
      });
    } catch (err) {
      // Session closed / access revoked / expired → stop tracking quietly.
      const status = err.response?.status;
      if (status === 400 || status === 403 || status === 404 || status === 410) {
        trackingRef.current = false;
        sessionRef.current = null;
        setTrackingActive(false);
      }
    }
  }, []);

  // Fire-and-forget stop for unload events — keepalive fetch carries the JWT.
  const fireAndForgetStop = useCallback((payloadOverride) => {
    const sessionId = sessionRef.current;
    if (!sessionId && !payloadOverride) return;
    if (payloadOverride) sessionRef.current = null;
    sessionBookRef.current = null;

    const payload = payloadOverride || {
      sessionId,
      currentPage: currentPageRef.current,
      totalPages: totalPagesRef.current,
      activeSeconds: activeSecondsRef.current,
    };
    activeSecondsRef.current = 0;
    trackingRef.current = false;

    const token = localStorage.getItem("token");
    try {
      fetch(`${API.defaults.baseURL}/reading/stop`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      /* ignore — backend stale-session handling is the safety net */
    }
  }, []);

  // Stop the session (SPA navigation / reader close).
  const stopSession = useCallback(async () => {
    const sessionId = sessionRef.current;
    if (!sessionId) return;

    sessionRef.current = null;
    trackingRef.current = false;
    setTrackingActive(false);
    clearInterval(heartbeatTimerRef.current);

    const payload = {
      sessionId,
      currentPage: currentPageRef.current,
      totalPages: totalPagesRef.current,
      activeSeconds: activeSecondsRef.current,
    };
    activeSecondsRef.current = 0;

    try {
      const { data } = await API.post("/reading/stop", payload);
      console.debug(TAG, "reading session stopped", data);
    } catch {
      // If the regular request fails (e.g. page is unloading), fall back to a
      // keepalive beacon so the final stats can still land.
      fireAndForgetStop(payload);
    }
  }, [fireAndForgetStop]);

  // Session starts only once the book metadata loads successfully (i.e. access
  // was verified). The backend re-validates access on every call, and returns
  // the existing live session when one is already open (idempotent start, safe
  // for StrictMode double-mounts and tab reloads).
  useEffect(() => {
    if (!meta || !bookId) return;
    let cancelled = false;
    // A previous (StrictMode) cleanup may have scheduled a delayed stop —
    // cancelling it lets the remount reuse the live session.
    clearTimeout(stopTimerRef.current);

    const begin = async () => {
      // If the reader switched books without a clean unmount (e.g. direct
      // book-to-book navigation), close the previous book's session first.
      if (sessionBookRef.current && sessionBookRef.current !== bookId) {
        fireAndForgetStop();
      }
      try {
        const { data } = await API.post("/reading/start", { bookId });
        if (cancelled) return;
        sessionRef.current = data.sessionId;
        sessionBookRef.current = bookId;
        setTrackingActive(true);
        clearTimeout(stopTimerRef.current);
        console.debug(TAG, "reading session started", {
          sessionId: data.sessionId,
          reused: !!data.reused,
        });
      } catch (err) {
        // 403/410 are surfaced by the book-info fetch already — just stay
        // untracked.
        console.debug(TAG, "reading session not started", err.response?.status);
      }
    };

    begin();

    return () => {
      cancelled = true;
      if (sessionRef.current) {
        // Delay the stop slightly so a StrictMode remount can reuse the session
        // instead of stopping + recreating it.
        stopTimerRef.current = setTimeout(stopSession, 2000);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, meta]);

  // Active-time ticker: counts one second per tick ONLY while the document is
  // visible, so hidden-tab / background time is never counted.
  useEffect(() => {
    tickTimerRef.current = setInterval(() => {
      if (document.visibilityState === "visible" && sessionRef.current) {
        activeSecondsRef.current += 1;
      }
    }, 1000);
    return () => clearInterval(tickTimerRef.current);
  }, []);

  // Heartbeat cadence: every 60s while a session is tracked.
  useEffect(() => {
    if (!trackingActive) return;
    heartbeatTimerRef.current = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(heartbeatTimerRef.current);
  }, [trackingActive, sendHeartbeat]);

  // Unload safety net: page close / tab close / navigation away. Uses a
  // keepalive fetch (with the JWT header) because `beforeunload` fetch requests
  // without keepalive are unreliable. Backend stale-session handling covers any
  // case where even this is dropped.
  useEffect(() => {
    const handleUnload = () => {
      clearTimeout(stopTimerRef.current);
      fireAndForgetStop();
    };
    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [fireAndForgetStop]);

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
