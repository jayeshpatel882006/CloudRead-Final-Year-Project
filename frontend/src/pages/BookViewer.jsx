// pages/BookViewer.jsx
// -----------------------------------------------------------------------------
// Secure, lazy-loading, CANVAS-BASED PDF viewer.
//
// Pipeline per page:
//
//   PageCanvas mounts (status = "idle")
//        │
//        ▼
//   fetch GET /api/access/book/:bookId/page/:n  →  response
//        │
//        ├── image/png bytes ──────────────────────── SUCCESS
//        │   new Blob([bytes], { type:'image/png' })
//        │   createImageBitmap(blob)          ← NO URL.createObjectURL, NO <img>
//        │   <canvas>.getContext('2d').drawImage(bitmap, 0, 0)
//        │   status = "loaded"
//        │
//        └── application/json ─────────────────────── FAILURE
//            parse { message, stage, code }
//            status = "failed"
//            if code === 403|404|410 → canRetry = false
//            show Retry button only if canRetry
//
// Lazy loading strategy:
//   - Page 1 is mounted and fetched immediately.
//   - A sentinel element is placed after the last mounted page.
//   - IntersectionObserver watches the sentinel. When it enters the
//     viewport, we extend the visible range: one more page mounts
//     and begins fetching.
//   - This gives TRUE sequential on-demand loading:
//     "Load page 1 → user scrolls → load page 2 → scroll → page 3"
//   - No pre-fetching. No batch loading. Each page loads exactly when
//     the user scrolls near the end of the loaded content.
//
// Virtualization:
//   - Only pages [1, visibleUpTo] are mounted.
//   - Pages beyond visibleUpTo are unmounted and their ImageBitmaps freed.
//   - With a 500-page PDF, only ~1-3 pages are ever in the DOM at once.
//
// Retry policy:
//   - A page that fails is NEVER automatically retried.
//   - The user sees a Retry button (unless canRetry === false).
//   - Only a manual Retry click triggers a new fetch.
//   - Failed pages are tracked in a module-level Set so they don't
//     re-fetch on remount.
//
// JSON error detection:
//   - If response content-type is application/json, parse it,
//     display the server message, and (if stage is non-recoverable)
//     prevent retry.
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useRef, useState, useCallback, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";
import Loader from "../components/Loader";
import { toast } from "react-toastify";
import "../css/bookviewer.css";

const TAG = "[BookViewer]";

// How many extra pages ahead to mount beyond visibleUpTo.
// 0 = true sequential: page N loads → user scrolls → page N+1 mounts.
// 1 = one page pre-fetched ahead for smoother scrolling.
const MOUNT_AHEAD = 0;

// IntersectionObserver rootMargin for the sentinel.
// A large bottom margin triggers loading before the user reaches the gap.
const ROOT_MARGIN_BOTTOM = "1000px";

// Module-level set of permanently failed page numbers.
// Pages in this set will never auto-fetch on mount.
const failedPages = new Set();

// ──────────────────────────────────────────────────────────────────────────────
// Per-page component.
//
// Lifecycle:
//   1. On mount: attemptRef++ (invalidate old), set status="loading".
//   2. fetch bytes → inspect headers → either:
//        a) image/png → createImageBitmap → draw to canvas → "loaded"
//        b) application/json → parse → "failed", canRetry based on stage
//   3. On unmount: cleanup bitmap, invalidate fetch.
//   4. NEVER auto-retries. Retry only on user click.
//   5. Failed pages are tracked in module-level Set to survive remounts.
//
// NOTE: Uses createImageBitmap + canvas.drawImage.
//       NO URL.createObjectURL, NO <img>, NO Blob URLs.
// ──────────────────────────────────────────────────────────────────────────────
function PageCanvas({ bookId, pageNum }) {
  const canvasRef = useRef(null);
  const bitmapRef = useRef(null);
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState(() => {
    if (failedPages.has(pageNum)) return "failed";
    return "loading";
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [errorStage, setErrorStage] = useState("");
  const [canRetry, setCanRetry] = useState(true);

  // ── Draw bitmap onto canvas ───────────────────────────────────────
  const drawBitmap = useCallback(() => {
    const canvas = canvasRef.current;
    const bitmap = bitmapRef.current;
    if (!canvas || !bitmap) return;

    if (canvas.width !== bitmap.width) canvas.width = bitmap.width;
    if (canvas.height !== bitmap.height) canvas.height = bitmap.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
  }, []);

  // ── Fetch the page data ───────────────────────────────────────────
  const fetchOnce = useCallback(async () => {
    const attempt = ++attemptRef.current;

    setStatus("loading");
    setErrorMsg("");
    setErrorStage("");
    failedPages.delete(pageNum);

    try {
      const res = await API.get(
        `/access/book/${bookId}/page/${pageNum}`,
        { responseType: "arraybuffer", timeout: 30000 },
      );

      if (!mountedRef.current || attempt !== attemptRef.current) return;

      const contentType =
        res.headers?.["content-type"] ||
        res.headers?.["Content-Type"] ||
        "";

      // ── Detect JSON error response ─────────────────────────────
      if (contentType.includes("application/json")) {
        const decoder = new TextDecoder();
        let payload;
        try {
          payload = JSON.parse(decoder.decode(res.data));
        } catch {
          payload = { message: "Invalid JSON error response" };
        }
        console.error(TAG, `page ${pageNum} FAILED (JSON)`, {
          message: payload?.message,
          stage: payload?.stage,
          code: payload?.code,
        });
        const retry =
          payload?.stage === "renderPage" ||
          payload?.code === "RENDER_FAILED" ||
          payload?.code === "ENCODE_FAILED" ||
          !payload?.stage;
        setStatus("failed");
        setErrorMsg(payload?.message || "Page failed");
        setErrorStage(payload?.stage || "");
        setCanRetry(retry);
        if (!retry) failedPages.add(pageNum);
        return;
      }

      // ── Validate content type ──────────────────────────────────
      if (!contentType.includes("image/png") || !res.data?.byteLength) {
        console.error(TAG, `page ${pageNum} FAILED (bad mime)`, {
          contentType,
          byteLength: res.data?.byteLength,
        });
        setStatus("failed");
        setErrorMsg(
          `Unexpected response (${contentType || "no content-type"})`,
        );
        setErrorStage("transport");
        setCanRetry(true);
        return;
      }

      // ── Decode PNG to ImageBitmap ──────────────────────────────
      const blob = new Blob([res.data], { type: "image/png" });

      let bitmap;
      try {
        bitmap = await createImageBitmap(blob);
      } catch (e) {
        console.error(TAG, `page ${pageNum} createImageBitmap FAILED`, e);
        setStatus("failed");
        setErrorMsg(`Image decode failed: ${e.message}`);
        setErrorStage("decode");
        setCanRetry(true);
        return;
      }

      if (!mountedRef.current || attempt !== attemptRef.current) {
        bitmap.close?.();
        return;
      }

      // Close previous bitmap
      if (bitmapRef.current) bitmapRef.current.close?.();
      bitmapRef.current = bitmap;

      // Draw to canvas (imperative — no DOM update needed)
      drawBitmap();

      setStatus("loaded");
      setErrorMsg("");
      setErrorStage("");
      console.debug(TAG, `page ${pageNum} loaded`, {
        width: bitmap.width,
        height: bitmap.height,
      });
    } catch (err) {
      if (!mountedRef.current || attempt !== attemptRef.current) return;

      const statusCode = err.response?.status;
      const dataType = err.response?.headers?.["content-type"] || "";
      let message = err.message || "Failed to load page";
      let retry = true;

      // Parse JSON error body
      if (dataType.includes("application/json") && err.response?.data) {
        try {
          const txt = new TextDecoder().decode(err.response.data);
          const payload = JSON.parse(txt);
          message = payload?.message || message;
          retry =
            payload?.stage === "renderPage" ||
            payload?.code === "RENDER_FAILED" ||
            payload?.code === "ENCODE_FAILED" ||
            !payload?.stage;
        } catch {
          /* ignore */
        }
      }

      if (statusCode === 410) { message = "Access expired"; retry = false; } 
      else if (statusCode === 404) { message = "Page not found"; retry = false; } 
      else if (statusCode === 403) { message = "Access denied"; retry = false; }

      console.error(TAG, `page ${pageNum} FAILED (throw)`, {
        status: statusCode,
        message,
      });

      setStatus("failed");
      setErrorMsg(message);
      setErrorStage(statusCode ? `http-${statusCode}` : "");
      setCanRetry(retry);
      if (!retry) failedPages.add(pageNum);
    }
  }, [bookId, pageNum, drawBitmap]);

  // ── Fetch on mount ───────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    if (!failedPages.has(pageNum)) {
      fetchOnce();
    }

    return () => {
      mountedRef.current = false;
      attemptRef.current++;
      if (bitmapRef.current) {
        bitmapRef.current.close?.();
        bitmapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum]);

  // ── Manual retry ──────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    console.debug(TAG, `manual retry page ${pageNum}`);
    fetchOnce();
  }, [fetchOnce, pageNum]);

  // Redraw bitmap on re-render if canvas element changed
  useEffect(() => {
    if (status === "loaded") drawBitmap();
  }, [status, drawBitmap]);

  return (
    <div className="bookviewer-page" data-page={pageNum}>
      {/* Canvas — always mounted for stable ref, hidden until loaded */}
      <canvas
        ref={canvasRef}
        className="bookviewer-canvas"
        aria-label={`Page ${pageNum}`}
        style={{
          display: status === "loaded" ? "block" : "none",
          width: "100%",
          height: "auto",
        }}
      />

      {/* Loading skeleton */}
      {status === "loading" && (
        <div className="page-skeleton" data-page={pageNum}>
          <Loader inline />
          <span>Loading page {pageNum}…</span>
        </div>
      )}

      {/* Failed state */}
      {status === "failed" && (
        <div className="page-error" data-page={pageNum}>
          <p>📕 Could not load page {pageNum}</p>
          {errorMsg && <p className="page-error-detail">{errorMsg}</p>}
          {errorStage && (
            <p className="page-error-stage">stage: {errorStage}</p>
          )}
          {canRetry && (
            <button
              type="button"
              className="page-retry-btn"
              onClick={handleRetry}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Memo so parent re-renders don't re-mount PageCanvas instances unnecessarily.
const MemoPageCanvas = memo(PageCanvas);

// ──────────────────────────────────────────────────────────────────────────────
// BookViewer — owns metadata, lazy-loading range, IntersectionObserver.
// ──────────────────────────────────────────────────────────────────────────────
const BookViewer = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [meta, setMeta] = useState(null);
  // visibleUpTo = the highest page number whose content has been "revealed".
  // Only pages 1..visibleUpTo are mounted. Starts at 1 (page 1 loads first).
  const [visibleUpTo, setVisibleUpTo] = useState(0);

  // Stable IntersectionObserver ref — created once, lives for component lifetime.
  const observerRef = useRef(null);
  // Ref to the sentinel element placed after the last mounted page.
  const sentinelRef = useRef(null);
  // Map of page number → DOM element for observed page containers.
  const pageRefs = useRef(new Map());

  // ── Metadata fetch ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        console.debug(TAG, "fetching book info", { bookId });
        const { data } = await API.get(`/access/book/${bookId}/info`);
        if (!cancelled) {
          setMeta(data);
          setVisibleUpTo(1); // Start with page 1
          console.debug(TAG, "book info received", data);
        }
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        console.error(TAG, "info fetch failed", { status, bookId });
        if (status === 401) {
          toast.error("Please log in to view this book.");
          navigate("/login");
        } else if (status === 403) {
          toast.error(
            "Access denied. Request access from your dashboard first.",
          );
        } else if (status === 410) {
          toast.error("Your access to this book has expired.");
        } else if (status === 404) {
          toast.error("Book not found.");
        } else {
          toast.error("Failed to load book.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, navigate]);

  // ── Create IntersectionObserver once ─────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const pageAttr = entry.target.dataset?.page;
          if (!pageAttr) continue;
          const pageNum = parseInt(pageAttr, 10);
          if (Number.isFinite(pageNum) && pageNum > 0) {
            setVisibleUpTo((cur) => Math.max(cur, pageNum));
          }
        }
      },
      { rootMargin: `0px 0px ${ROOT_MARGIN_BOTTOM} 0px` },
    );

    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, []); // Stable for component lifetime

  // ── Sync observer targets when visible range changes ─────────────
  // useLayoutEffect runs synchronously after DOM mutations but BEFORE
  // the browser paints. This eliminates the <1ms gap where the old
  // sentinel is gone and the new one isn't yet observed.
  useLayoutEffect(() => {
    const observer = observerRef.current;
    if (!observer || !meta) return;

    // Disconnect all, then re-observe relevant targets
    observer.disconnect();

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }
  }, [visibleUpTo, meta]);

  if (!meta) {
    return (
      <Layout>
        <Loader />
      </Layout>
    );
  }

  const total = meta.totalPages;

  // Mount pages [1, visibleUpTo + MOUNT_AHEAD], clamped to total.
  // With MOUNT_AHEAD=0, only 1 page mounts at a time.
  const mountEnd = Math.min(total, visibleUpTo + MOUNT_AHEAD);

  // Build the array of page numbers to mount
  const mountedPages = [];
  for (let p = 1; p <= mountEnd; p++) mountedPages.push(p);

  return (
    <Layout>
      <div className="bookviewer-container">
        <header className="bookviewer-header">
          <button
            className="bookviewer-back"
            onClick={() => navigate("/student")}
          >
            ← Back
          </button>
          <div>
            <h2>{meta.title}</h2>
            <p>
              by {meta.author} · {total} pages
            </p>
          </div>
        </header>

        <div className="bookviewer-pages">
          {mountedPages.map((pageNum) => (
            <div
              key={pageNum}
              ref={(el) => {
                if (el) pageRefs.current.set(pageNum, el);
                else pageRefs.current.delete(pageNum);
              }}
              data-page={pageNum}
            >
              <MemoPageCanvas bookId={bookId} pageNum={pageNum} />
            </div>
          ))}

          {/* Sentinel: placed with data-page=mountEnd+1.
              When it scrolls into view, visibleUpTo advances
              and one more page mounts. */}
          {mountEnd < total && (
            <div
              ref={sentinelRef}
              className="bookviewer-sentinel"
              data-page={mountEnd + 1}
            >
              <span className="bookviewer-sentinel-hint">
                Scroll for more
              </span>
            </div>
          )}

          {mountEnd >= total && total > 0 && (
            <div className="bookviewer-end">🎉 End of book</div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default BookViewer;
