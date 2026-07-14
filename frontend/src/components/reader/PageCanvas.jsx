// components/reader/PageCanvas.jsx
// -----------------------------------------------------------------------------
// Per-page canvas component for the PDF reader.
//
// Lifecycle:
//   1. On mount: set status="loading", fetch page image from API
//   2. Response analysis:
//      - image/png → createImageBitmap → draw to canvas → "loaded"
//      - application/json → parse error → "failed", show Retry
//   3. On unmount: release bitmap, invalidate in-flight fetch
//   4. NEVER auto-retries. Retry only on manual click.
//   5. Failed pages tracked in module-level Set to survive remounts.
//
// Canvas-only rendering (no Blob URLs, no <img> tags):
//   fetch → arraybuffer → Blob → createImageBitmap → drawImage
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback, memo } from "react";
import API from "../../services/api";
import Loader from "../Loader";

const TAG = "[PageCanvas]";

// Module-level set of permanently failed page numbers — survives remounts
const failedPages = new Set();

function PageCanvas({ bookId, pageNum, zoom = 100 }) {
  const canvasRef = useRef(null);
  const bitmapRef = useRef(null);
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState(() =>
    failedPages.has(pageNum) ? "failed" : "loading"
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [errorStage, setErrorStage] = useState("");
  const [canRetry, setCanRetry] = useState(true);

  // ── Draw bitmap to canvas ─────────────────────────────────────
  const drawBitmap = useCallback(() => {
    const canvas = canvasRef.current;
    const bitmap = bitmapRef.current;
    if (!canvas || !bitmap) return;

    // Match canvas pixel buffer to bitmap dimensions
    if (canvas.width !== bitmap.width) canvas.width = bitmap.width;
    if (canvas.height !== bitmap.height) canvas.height = bitmap.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);

    // Apply CSS zoom via scale transform on the wrapper
    const wrapper = canvas.closest("[data-page-wrapper]");
    if (wrapper) {
      wrapper.style.width = `${zoom}%`;
      wrapper.style.maxWidth = `${zoom}%`;
    }
  }, [zoom]);

  // ── Fetch page data ───────────────────────────────────────────
  const fetchOnce = useCallback(async () => {
    const attempt = ++attemptRef.current;
    failedPages.delete(pageNum);

    setStatus("loading");
    setErrorMsg("");
    setErrorStage("");

    try {
      const res = await API.get(`/access/book/${bookId}/page/${pageNum}`, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      if (!mountedRef.current || attempt !== attemptRef.current) return;

      const contentType =
        res.headers?.["content-type"] || res.headers?.["Content-Type"] || "";

      // ── JSON error detection ────────────────────────────────
      if (contentType.includes("application/json")) {
        const decoder = new TextDecoder();
        let payload;
        try {
          payload = JSON.parse(decoder.decode(res.data));
        } catch {
          payload = { message: "Invalid JSON error response" };
        }
        console.error(TAG, `page ${pageNum} FAILED (JSON)`, payload);
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

      // ── Content-type validation ─────────────────────────────
      if (!contentType.includes("image/png") || !res.data?.byteLength) {
        console.error(TAG, `page ${pageNum} FAILED (bad mime)`, {
          contentType,
          byteLength: res.data?.byteLength,
        });
        setStatus("failed");
        setErrorMsg(`Unexpected response (${contentType || "no content-type"})`);
        setErrorStage("transport");
        setCanRetry(true);
        return;
      }

      // ── Decode to bitmap ────────────────────────────────────
      const blob = new Blob([res.data], { type: "image/png" });
      let bitmap;
      try {
        bitmap = await createImageBitmap(blob);
      } catch (e) {
        console.error(TAG, `page ${pageNum} decode FAILED`, e);
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

      console.error(TAG, `page ${pageNum} FAILED`, { status: statusCode, message });

      setStatus("failed");
      setErrorMsg(message);
      setErrorStage(statusCode ? `http-${statusCode}` : "");
      setCanRetry(retry);
      if (!retry) failedPages.add(pageNum);
    }
  }, [bookId, pageNum, drawBitmap]);

  // ── Fetch on mount ────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (!failedPages.has(pageNum)) fetchOnce();
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

  // ── Redraw on zoom change ─────────────────────────────────────
  useEffect(() => {
    if (status === "loaded") drawBitmap();
  }, [status, zoom, drawBitmap]);

  // ── Retry ─────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    console.debug(TAG, `manual retry page ${pageNum}`);
    fetchOnce();
  }, [fetchOnce, pageNum]);

  return (
    <div
      className="reader-page-wrapper"
      data-page-wrapper
      style={{ width: `${zoom}%`, maxWidth: `${zoom}%` }}
    >
      <div className={`reader-page ${status === "loaded" ? "reader-page-appear" : ""}`}>
        {/* Canvas — mounted always for stable ref */}
        <canvas
          ref={canvasRef}
          aria-label={`Page ${pageNum}`}
          style={{
            display: status === "loaded" ? "block" : "none",
            width: "100%",
            height: "auto",
          }}
        />

        {/* Loading skeleton */}
        {status === "loading" && (
          <div className="reader-skeleton">
            <Loader inline />
            <span>Loading page {pageNum}…</span>
          </div>
        )}

        {/* Error state */}
        {status === "failed" && (
          <div className="reader-page-error">
            <p>📕 Could not load page {pageNum}</p>
            {errorMsg && <p className="reader-page-error-detail">{errorMsg}</p>}
            {errorStage && (
              <p style={{ fontSize: "0.75rem", opacity: 0.5 }}>{errorStage}</p>
            )}
            {canRetry && (
              <button className="reader-retry-btn" onClick={handleRetry}>
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(PageCanvas);
