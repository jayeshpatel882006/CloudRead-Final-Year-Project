// services/pdfRenderer.js
// -----------------------------------------------------------------------------
// Renders a single page of an on-disk PDF to a raw RGBA bitmap using
// @napi-rs/canvas — a native (Rust-based) Canvas implementation.
//
// WHY @napi-rs/canvas INSTEAD OF A CUSTOM NodeCanvas?
//   pdfjs-dist's page.render() calls hundreds of CanvasRenderingContext2D
//   methods (fill, stroke, moveTo, lineTo, bezierCurveTo, drawImage, etc.)
//   to rasterize the PDF content. The previous custom NodeCanvas stubbed
//   every one of these as a no-op, so page.render() returned a blank white
//   image every time.
//
//   @napi-rs/canvas implements the FULL Canvas API natively via Rust +
//   Skia. It is already installed as an optional dependency of pdfjs-dist
//   v6, requires NO C++ build tools on Windows, and produces real rendered
//   content.
//
// Pipeline:
//   loadPdf(filename)         → pdfjs document handle
//   getPage(n)                → page object
//   page.getViewport({scale}) → viewport dimensions
//   createCanvas(w, h)        → native canvas (Skia)
//   page.render({canvasContext, viewport}).promise  → draws REAL content
//   canvas.toBuffer('image/png') → PNG bytes
//   compositeWatermark()      → overlay watermark on raw RGBA
// -----------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import { PNG } from "pngjs";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

import { UPLOAD_DIR } from "../config/multer.js";
import { getWatermarkConfig } from "../config/watermark.js";

// -----------------------------------------------------------------------------
// pdfjs-dist v6 always validates `workerSrc`. We point it at the bundled
// legacy worker module via a file:// URL.
// -----------------------------------------------------------------------------
function resolveWorkerSrc() {
  const workerPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.mjs",
  );
  return pathToFileURL(workerPath).href;
}
pdfjsLib.GlobalWorkerOptions.workerSrc = resolveWorkerSrc();

// Silence non-fatal warnings ("TT: undefined function: N" from malformed
// fonts). Real errors still throw.
pdfjsLib.GlobalWorkerOptions.verbosity = 0;

// -----------------------------------------------------------------------------
// In-memory LRU cache. Success-only entries. Bounded.
// -----------------------------------------------------------------------------
const RENDER_CACHE = new Map();
const MAX_CACHE_ENTRIES = 200;

function cacheGet(key) {
  if (!RENDER_CACHE.has(key)) return null;
  const v = RENDER_CACHE.get(key);
  RENDER_CACHE.delete(key);
  RENDER_CACHE.set(key, v);
  return v;
}
function cachePut(key, value) {
  if (RENDER_CACHE.size >= MAX_CACHE_ENTRIES) {
    const firstKey = RENDER_CACHE.keys().next().value;
    RENDER_CACHE.delete(firstKey);
  }
  RENDER_CACHE.set(key, value);
}

// -----------------------------------------------------------------------------
// Resolve a stored random filename to an absolute path on disk.
// -----------------------------------------------------------------------------
function resolvePdfPath(filename) {
  if (
    typeof filename !== "string" ||
    !/^[a-f0-9]{32}\.pdf$/.test(filename)
  ) {
    const err = new Error("Invalid filename");
    err.code = "EBADNAME";
    throw err;
  }
  const abs = path.resolve(UPLOAD_DIR, filename);
  if (!abs.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
    const err = new Error("Invalid filename");
    err.code = "EBADNAME";
    throw err;
  }
  if (!fs.existsSync(abs)) {
    const err = new Error("PDF file missing on disk");
    err.code = "ENOENT";
    throw err;
  }
  return abs;
}

// -----------------------------------------------------------------------------
// Open a PDF and return a pdfjs document handle.
// -----------------------------------------------------------------------------
async function loadPdf(filename) {
  const abs = resolvePdfPath(filename);
  const data = new Uint8Array(fs.readFileSync(abs));
  const loadingTask = pdfjsLib.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    stopAtFirstError: false,
    verbosity: 0,
  });
  return loadingTask.promise;
}

// -----------------------------------------------------------------------------
// Watermark compositing — uses @napi-rs/canvas to render rotated text at
// low opacity on top of the rendered PDF page.
//
// Rendering order (guaranteed):
//   1. PDF page rendered to RGBA (done before this function is called)
//   2. Watermark overlay created as a separate transparent canvas
//   3. Overlay composited onto page RGBA at the configured opacity
//
// Why @napi-rs/canvas instead of raw pixel manipulation?
//   - Canvas provides proper text rendering with anti-aliasing
//   - Canvas transform handles rotation natively (no manual pixel math)
//   - Text spacing, font, and alignment are all handled by Skia
//   - The overlay is composited at the end, never drawn before the PDF
//
// Visual design (inspired by Google Books, VitalSource, Scribd):
//   - Repeating diagonal lines of identifying text
//   - Very low opacity (~8%) so content remains fully readable
//   - Light gray color (not pure black or white)
//   - 32° rotation — the standard angle used by professional platforms
//   - Wide spacing to avoid dense overlapping
//   - Font size and spacing scale with page dimensions
// -----------------------------------------------------------------------------
function compositeWatermark(rgba, width, height, options) {
  const { name, email, date, pageNumber } = options;

  // Early exit if no identifying info — nothing to watermark
  if (!name && !email) return Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);

  // ── 1. Load scaled config for this page size ───────────────────
  const cfg = getWatermarkConfig(width, height);

  // ── 2. Create overlay canvas (transparent background) ──────────
  const overlayCanvas = createCanvas(width, height);
  const overlayCtx = overlayCanvas.getContext("2d");
  overlayCtx.clearRect(0, 0, width, height);

  // ── 3. Configure watermark text style ──────────────────────────
  overlayCtx.fillStyle = `rgb(${cfg.color.r}, ${cfg.color.g}, ${cfg.color.b})`;
  overlayCtx.font = `${cfg.fontSize}px ${cfg.fontFamily}`;
  overlayCtx.textAlign = "center";
  overlayCtx.textBaseline = "middle";

  // ── 4. Build watermark line ────────────────────────────────────
  const parts = [String(name || "Student")];
  if (email) parts.push(String(email));
  if (date) parts.push(String(date));
  if (pageNumber) parts.push(`p.${pageNumber}`);
  const watermarkLine = parts.join("  ·  ");

  // ── 5. Draw rotated repeating text ─────────────────────────────
  const radians = (cfg.rotationDeg * Math.PI) / 180;

  overlayCtx.save();
  overlayCtx.translate(width / 2, height / 2);
  overlayCtx.rotate(radians);

  // Calculate grid dimensions to cover the rotated canvas area.
  // The diagonal of the canvas gives us the maximum extent needed.
  const diag = Math.sqrt(width * width + height * height);
  const cols = Math.ceil(diag / cfg.spacingX) + 3;
  const rows = Math.ceil(diag / cfg.spacingY) + 3;

  for (let row = -rows; row <= rows; row++) {
    for (let col = -cols; col <= cols; col++) {
      const x = col * cfg.spacingX;
      const y = row * cfg.spacingY;
      overlayCtx.fillText(watermarkLine, x, y);
    }
  }

  overlayCtx.restore();

  // ── 6. Extract overlay pixel data ──────────────────────────────
  const overlayData = overlayCtx.getImageData(0, 0, width, height);
  const overlayPixels = new Uint8Array(
    overlayData.data.buffer,
    overlayData.data.byteOffset,
    overlayData.data.byteLength,
  );

  // ── 7. Composite overlay onto page RGBA ────────────────────────
  // Formula for each pixel:
  //   alpha = overlay.alpha * config.opacity
  //   result = page * (1 - alpha) + watermark_color * alpha
  //
  // This preserves the page content while blending in a faint
  // watermark. The overlay's alpha channel tells us EXACTLY where
  // the text was drawn (anti-aliased edges included).
  const out = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  const opacity = cfg.opacity;

  for (let i = 0; i < out.length; i += 4) {
    const overlayAlpha = overlayPixels[i + 3] / 255; // 0 (no text) to 1 (solid text)
    if (overlayAlpha > 0.01) {
      const blendAlpha = overlayAlpha * opacity;
      out[i]     = Math.round(out[i]     * (1 - blendAlpha) + cfg.color.r * blendAlpha);
      out[i + 1] = Math.round(out[i + 1] * (1 - blendAlpha) + cfg.color.g * blendAlpha);
      out[i + 2] = Math.round(out[i + 2] * (1 - blendAlpha) + cfg.color.b * blendAlpha);
      // Alpha channel unchanged — keeps the page's original transparency
    }
  }

  return out;
}

// -----------------------------------------------------------------------------
// Render a single page from filename[pageNumber] into a PNG buffer using
// @napi-rs/canvas (native). Returns the raw RGBA pixel data.
//
// Throws:
//   code: "ENOENT"             — file is missing on disk
//   code: "EBADNAME"           — invalid filename pattern (traversal attempt)
//   code: "PAGE_OUT_OF_RANGE"  — pageNum < 1 or > pdfDoc.numPages
//   code: "GETPAGE_FAILED"     — pdfjs-dist could not load this specific page
//   code: "RENDER_FAILED"      — pdfjs-dist or native canvas rejected render
//   code: "EBADCANVAS"         — viewport produced invalid dimensions
//   code: "ENCODE_FAILED"      — canvas.toBuffer('image/png') returned empty
// -----------------------------------------------------------------------------
async function renderPageRaw(filename, pageNumber, scale = 1.5) {
  const TAG = "[pdfRenderer]";
  const startedAt = Date.now();

  // ── 1. Load PDF ────────────────────────────────────────────────
  console.log(TAG, "[1/6] loadPdf start", { filename, pageNumber });
  let pdfDoc;
  try {
    pdfDoc = await loadPdf(filename);
  } catch (e) {
    console.error(TAG, "[1/6] loadPdf FAILED", { code: e.code, msg: e.message });
    if (!e.pageNumber) e.pageNumber = pageNumber;
    if (!e.stage) e.stage = "loadPdf";
    throw e;
  }
  console.log(TAG, "[1/6] loadPdf SUCCESS", { numPages: pdfDoc.numPages });

  try {
    // ── 2. Bounds check ──────────────────────────────────────────
    const total = pdfDoc.numPages;
    if (pageNumber < 1 || pageNumber > total) {
      const err = new Error(`Page ${pageNumber} out of range (1..${total})`);
      err.code = "PAGE_OUT_OF_RANGE";
      err.pageNumber = pageNumber;
      err.stage = "boundsCheck";
      throw err;
    }
    console.log(TAG, "[2/6] boundsCheck SUCCESS", { pageNumber, total });

    // ── 3. Get page ──────────────────────────────────────────────
    console.log(TAG, "[3/6] getPage start", { pageNumber });
    let page;
    try {
      page = await pdfDoc.getPage(pageNumber);
    } catch (e) {
      console.error(TAG, "[3/6] getPage FAILED", { msg: e.message, stack: e.stack });
      const err = new Error(`getPage(${pageNumber}) failed: ${e.message}`);
      err.code = "GETPAGE_FAILED";
      err.pageNumber = pageNumber;
      err.stage = "getPage";
      throw err;
    }
    console.log(TAG, "[3/6] getPage SUCCESS");

    // ── 4. Create native canvas ─────────────────────────────────
    const viewport = page.getViewport({ scale });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);

    if (!Number.isFinite(width) || !Number.isFinite(height) ||
        width <= 0 || height <= 0 || width > 8192 || height > 8192) {
      const err = new Error(`Invalid canvas size: ${width}x${height}`);
      err.code = "EBADCANVAS";
      err.pageNumber = pageNumber;
      err.stage = "canvasCreate";
      throw err;
    }
    console.log(TAG, "[4/6] canvasCreate SUCCESS", { width, height });

    let canvas;
    let ctx;
    try {
      canvas = createCanvas(width, height);
      ctx = canvas.getContext("2d");
    } catch (e) {
      console.error(TAG, "[4/6] canvasCreate FAILED", { msg: e.message, stack: e.stack });
      const err = new Error(`Canvas creation failed: ${e.message}`);
      err.code = "EBADCANVAS";
      err.pageNumber = pageNumber;
      err.stage = "canvasCreate";
      throw err;
    }

    // ── 5. Render page content onto the native canvas ───────────
    console.log(TAG, "[5/6] renderPage start", { pageNumber, width, height });
    try {
      await page
        .render({
          canvasContext: ctx,
          viewport,
        })
        .promise;
    } catch (e) {
      console.error(
        TAG,
        "[5/6] renderPage FAILED",
        { pageNumber, msg: e.message, stack: e.stack },
      );
      const wrapped = new Error(
        `Page ${pageNumber} render failed (${e.message || "render error"})`,
      );
      wrapped.code = "RENDER_FAILED";
      wrapped.pageNumber = pageNumber;
      wrapped.stage = "renderPage";
      wrapped.cause = e;
      throw wrapped;
    }
    console.log(TAG, "[5/6] renderPage SUCCESS", {
      pageNumber,
      durationMs: Date.now() - startedAt,
    });

    // ── 6. Extract RGBA for watermark compositing ───────────────
    console.log(TAG, "[6/6] extractRGBA start", { pageNumber });
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, width, height);
    } catch (e) {
      console.error(TAG, "[6/6] extractRGBA FAILED", { msg: e.message, stack: e.stack });
      const err = new Error(`getImageData failed: ${e.message}`);
      err.code = "ENCODE_FAILED";
      err.pageNumber = pageNumber;
      err.stage = "getImageData";
      throw err;
    }

    if (!imageData?.data || imageData.data.length === 0) {
      console.error(TAG, "[6/6] extractRGBA FAILED — empty imageData");
      const err = new Error("Canvas returned empty pixel data");
      err.code = "ENCODE_FAILED";
      err.pageNumber = pageNumber;
      err.stage = "getImageData";
      throw err;
    }
    console.log(TAG, "[6/6] extractRGBA SUCCESS", {
      pageNumber,
      rgbaBytes: imageData.data.length,
      totalDurationMs: Date.now() - startedAt,
    });

    return {
      width,
      height,
      rgba: new Uint8Array(
        imageData.data.buffer,
        imageData.data.byteOffset,
        imageData.data.byteLength,
      ),
    };
  } finally {
    pdfDoc = null;
  }
}

// -----------------------------------------------------------------------------
// PUBLIC: render a single page of `filename` as raw RGBA + watermark applied.
// The controller is responsible for encoding this to PNG via pngjs.
//
// Throws:
//   code: "ENOENT"          — file is missing on disk
//   code: "EBADNAME"        — invalid filename pattern (traversal attempt)
//   code: "PAGE_OUT_OF_RANGE"
//   code: "GETPAGE_FAILED"  — pdfjs-dist could not load this specific page
//   code: "RENDER_FAILED"   — pdfjs-dist rejected the page render
//   code: "EBADCANVAS"      — viewport produced invalid dimensions
//   code: "ENCODE_FAILED"   — PNG encoding produced 0-length buffer
//
// Success results are cached in-process. Failures are NEVER cached.
// -----------------------------------------------------------------------------
export async function renderPageAsRgba(filename, pageNumber, watermark) {
  const TAG = "[pdfRenderer]";
  const safeName  = String(watermark?.name  ?? "Student");
  const safeEmail = String(watermark?.email ?? "");
  const safeDate  = String(watermark?.date  ?? "");
  const cacheKey = `${filename}:${pageNumber}:${safeEmail}:${safeDate}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    console.debug(TAG, "cache  hit", { cacheKey });
    return cached;
  }

  let result;
  try {
    const { width, height, rgba } = await renderPageRaw(
      filename, pageNumber, 1.5,
    );

    console.log(TAG, "watermark start", { pageNumber });
    const watermarked = compositeWatermark(rgba, width, height, {
      name: safeName,
      email: safeEmail,
      date: safeDate,
      pageNumber,
    });
    console.log(TAG, "watermark done", { pageNumber });

    result = {
      width,
      height,
      rgba: new Uint8Array(
        watermarked.buffer,
        watermarked.byteOffset,
        watermarked.byteLength,
      ),
    };
  } catch (e) {
    if (!e.pageNumber) e.pageNumber = pageNumber;
    if (!e.stage) e.stage = "renderPage";
    console.error(
      TAG,
      "FAIL   ",
      { page: e.pageNumber, stage: e.stage, code: e.code, stack: e.stack || e.message },
    );
    throw e;
  }

  cachePut(cacheKey, result);
  console.debug(TAG, "ok     ", { pageNumber, bytes: result.rgba.byteLength });
  return result;
}

// Backwards-compatible wrapper for the old PNG-returning API.
// We take the watermarked RGBA from renderPageAsRgba, wrap it in a pngjs
// PNG object (which adds proper PNG headers/compression), and return the
// final PNG byte buffer.
//
// IMPORTANT: This is the ONLY place we encode to PNG. renderPageRaw returns
// raw RGBA only — no wasteful encode → decode roundtrip.

export async function renderPageAsPng(filename, pageNumber, watermark) {
  const result = await renderPageAsRgba(filename, pageNumber, watermark);

  // Fast-path: if renderPageRaw already produced a PNG buffer, just re-encode
  // it with the watermark applied (we need to go through pngjs for that).
  const png = new PNG({ width: result.width, height: result.height });
  png.data = Buffer.from(result.rgba.buffer, result.rgba.byteOffset, result.rgba.byteLength);
  return PNG.sync.write(png);
}

// Re-export path resolver for unit tests if needed.
export { resolvePdfPath };
