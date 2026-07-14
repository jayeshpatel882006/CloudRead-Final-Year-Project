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
// Rendering order (guaranteed by this implementation):
//   1. PDF page rendered to canvas
//   2. Watermark drawn DIRECTLY on the SAME canvas using save()/restore()
//   3. Watermarked RGBA extracted via getImageData()
//   4. PNG encoded from watermarked RGBA
//
// Watermark approach (canvas-native compositing):
//   The watermark is drawn on the same canvas context that holds the
//   rendered PDF content. Using ctx.globalAlpha = 0.08, the Skia renderer
//   handles the alpha blending with subpixel precision and proper
//   anti-aliasing — producing a visible watermark that does not obscure
//   the underlying PDF text.
// -----------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createCanvas } from "@napi-rs/canvas";
import { PNG } from "pngjs";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

import { UPLOAD_DIR } from "../config/multer.js";
import { WATERMARK_CONFIG } from "../config/watermark.js";

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
// Watermark rendering — draws directly on the SAME canvas that holds the
// rendered PDF content. Uses canvas-native globalAlpha compositing (Skia)
// so the watermark is properly anti-aliased and blended at the pixel level.
//
// Rendering order (guaranteed by renderPageRaw):
//   1. PDF page rendered to canvas   ← already done when this is called
//   2. ctx.save() + globalAlpha + rotation + fillText
//   3. ctx.restore()                 ← canvas state restored
//   4. getImageData()                ← composited result extracted
//
// This approach is fundamentally different from creating a separate overlay
// canvas and manually blending pixels. Canvas-native globalAlpha produces
// a VISIBLE watermark because Skia's alpha compositing works at subpixel
// precision with the actual rendered pixel data — not a manual 92/8 blend.
// -----------------------------------------------------------------------------
function drawWatermarkOnCanvas(ctx, width, height, options) {
  const { name, email, date } = options;
  const TAG = "[pdfRenderer]";

  console.log(TAG, "Watermark rendering started", { width, height });

  // Build watermark lines: 3 lines stacked vertically
  const lines = [
    String(name || "Student"),
    String(email || ""),
    String(date || new Date().toISOString().slice(0, 10)),
  ];

  const cfg = WATERMARK_CONFIG;

  // ── Log canvas state before drawing ───────────────────────────────
  console.log(TAG, "Canvas state BEFORE watermark:", {
    width,
    height,
    pageNumber: options?.pageNumber,
    globalAlpha: ctx.globalAlpha,
    fillStyle: ctx.fillStyle,
    font: ctx.font,
    textAlign: ctx.textAlign,
    textBaseline: ctx.textBaseline,
  });

  // ── save → apply watermark style → transform → draw → restore ──────
  ctx.save();

  ctx.globalAlpha = cfg.opacity;
  ctx.fillStyle = cfg.color;
  ctx.font = `${cfg.fontWeight} ${cfg.fontSize}px ${cfg.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Translate to center, then rotate
  ctx.translate(width / 2, height / 2);
  ctx.rotate(cfg.rotationRadians);

  // ── Log canvas state AFTER transform is applied ─────────────────
  console.log(TAG, "Canvas state AFTER transform:", {
    globalAlpha: ctx.globalAlpha,
    fillStyle: ctx.fillStyle,
    font: ctx.font,
    rotationRadians: cfg.rotationRadians,
    rotationDeg: (cfg.rotationRadians * 180) / Math.PI,
  });

  // 5×5 grid = 25 watermark instances (within requested 15–30 range)
  const GRID_RANGE = 2;
  let totalInstances = 0;

  for (let row = -GRID_RANGE; row <= GRID_RANGE; row++) {
    for (let col = -GRID_RANGE; col <= GRID_RANGE; col++) {
      const x = col * cfg.spacingX;
      const y = row * cfg.spacingY;

      // Draw each line of the watermark text
      for (let li = 0; li < lines.length; li++) {
        if (!lines[li]) continue;
        ctx.fillText(lines[li], x, y + li * cfg.lineHeight);
      }

      totalInstances++;
    }
  }

  ctx.restore();

  // ── Log canvas state AFTER restore ──────────────────────────────
  console.log(TAG, "Canvas state AFTER restore:", {
    globalAlpha: ctx.globalAlpha,
    fillStyle: ctx.fillStyle,
    font: ctx.font,
  });

  console.log(TAG, "Watermark rendering completed");
  console.log(TAG, "Total watermark instances:", totalInstances);

  // ── Diagnostic: sample pixels at the center of the canvas ──────
  try {
    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const sample = ctx.getImageData(cx - 50, cy - 50, 100, 100);
    let nonWhite = 0;
    for (let i = 0; i < sample.data.length; i += 4) {
      if (sample.data[i] < 250 || sample.data[i + 1] < 250 || sample.data[i + 2] < 250) {
        nonWhite++;
      }
    }
    console.log(TAG, "Center 100x100 sample — non-white pixels:", nonWhite, "out of 10000");
    if (nonWhite < 100) {
      console.warn(TAG, "⚠️  Very few non-white pixels in center — watermark may not be visible!");
    }
  } catch (e) {
    // Sampling is diagnostic only, never crash
  }
}

// -----------------------------------------------------------------------------
// Render a single page from filename[pageNumber] into raw RGBA pixel data.
//
// Rendering order (guaranteed):
//   1. Load PDF
//   2. Create native canvas
//   3. page.render() draws PDF content onto canvas
//   4. drawWatermarkOnCanvas() draws watermark on SAME canvas
//   5. ctx.getImageData() extracts final composited RGBA
//
// Throws:
//   code: "ENOENT"             — file is missing on disk
//   code: "EBADNAME"           — invalid filename pattern (traversal attempt)
//   code: "PAGE_OUT_OF_RANGE"  — pageNum < 1 or > pdfDoc.numPages
//   code: "GETPAGE_FAILED"     — pdfjs-dist could not load this specific page
//   code: "RENDER_FAILED"      — pdfjs-dist or native canvas rejected render
//   code: "EBADCANVAS"         — viewport produced invalid dimensions
//   code: "ENCODE_FAILED"      — canvas.getImageData() returned empty
// -----------------------------------------------------------------------------
async function renderPageRaw(filename, pageNumber, scale, watermarkOptions) {
  const TAG = "[pdfRenderer]";
  const startedAt = Date.now();

  // ── [1] Load PDF ─────────────────────────────────────────────────
  console.log(TAG, "[1/7] loadPdf start", { filename, pageNumber });
  let pdfDoc;
  try {
    pdfDoc = await loadPdf(filename);
  } catch (e) {
    console.error(TAG, "[1/7] loadPdf FAILED", { code: e.code, msg: e.message });
    if (!e.pageNumber) e.pageNumber = pageNumber;
    if (!e.stage) e.stage = "loadPdf";
    throw e;
  }
  console.log(TAG, "[1/7] loadPdf SUCCESS", { numPages: pdfDoc.numPages });

  try {
    // ── [2] Bounds check ──────────────────────────────────────────
    const total = pdfDoc.numPages;
    if (pageNumber < 1 || pageNumber > total) {
      const err = new Error(`Page ${pageNumber} out of range (1..${total})`);
      err.code = "PAGE_OUT_OF_RANGE";
      err.pageNumber = pageNumber;
      err.stage = "boundsCheck";
      throw err;
    }
    console.log(TAG, "[2/7] boundsCheck SUCCESS", { pageNumber, total });

    // ── [3] Get page ──────────────────────────────────────────────
    console.log(TAG, "[3/7] getPage start", { pageNumber });
    let page;
    try {
      page = await pdfDoc.getPage(pageNumber);
    } catch (e) {
      console.error(TAG, "[3/7] getPage FAILED", { msg: e.message, stack: e.stack });
      const err = new Error(`getPage(${pageNumber}) failed: ${e.message}`);
      err.code = "GETPAGE_FAILED";
      err.pageNumber = pageNumber;
      err.stage = "getPage";
      throw err;
    }
    console.log(TAG, "[3/7] getPage SUCCESS");

    // ── [4] Create native canvas ──────────────────────────────────
    const viewport = page.getViewport({ scale });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);

    if (
      !Number.isFinite(width) || !Number.isFinite(height) ||
      width <= 0 || height <= 0 || width > 8192 || height > 8192
    ) {
      const err = new Error(`Invalid canvas size: ${width}x${height}`);
      err.code = "EBADCANVAS";
      err.pageNumber = pageNumber;
      err.stage = "canvasCreate";
      throw err;
    }
    console.log(TAG, "[4/7] canvasCreate SUCCESS", { width, height });

    let canvas;
    let ctx;
    try {
      canvas = createCanvas(width, height);
      ctx = canvas.getContext("2d");
    } catch (e) {
      console.error(TAG, "[4/7] canvasCreate FAILED", { msg: e.message, stack: e.stack });
      const err = new Error(`Canvas creation failed: ${e.message}`);
      err.code = "EBADCANVAS";
      err.pageNumber = pageNumber;
      err.stage = "canvasCreate";
      throw err;
    }

    // ── [5] Render PDF page content onto the canvas ───────────────
    console.log(TAG, "[5/7] renderPage start", { pageNumber, width, height });
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
        "[5/7] renderPage FAILED",
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
    console.log(TAG, "[5/7] PDF render SUCCESS", {
      pageNumber,
      ms: Date.now() - startedAt,
    });

    // ── [6] Draw watermark DIRECTLY on the same canvas ────────────
    // This runs AFTER the PDF is fully rendered.
    // ctx.save()/ctx.restore() ensure the canvas state is preserved.
    // Skia handles the alpha compositing natively.
    console.log(TAG, "[6/7] drawWatermark start", { pageNumber });
    try {
      drawWatermarkOnCanvas(ctx, width, height, {
        name: watermarkOptions?.name,
        email: watermarkOptions?.email,
        date: watermarkOptions?.date,
      });
    } catch (e) {
      console.error(TAG, "[6/7] drawWatermark FAILED", {
        pageNumber,
        msg: e.message,
        stack: e.stack,
      });
      // Watermark failure is non-fatal — return the un-watermarked page
      // rather than failing the entire request.
      console.warn(TAG, "Proceeding without watermark due to error");
    }
    console.log(TAG, "[6/7] drawWatermark done", { pageNumber });

    // ── [7] Extract final composited RGBA ─────────────────────────
    console.log(TAG, "[7/7] getImageData start", { pageNumber });
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, width, height);
    } catch (e) {
      console.error(TAG, "[7/7] getImageData FAILED", { msg: e.message, stack: e.stack });
      const err = new Error(`getImageData failed: ${e.message}`);
      err.code = "ENCODE_FAILED";
      err.pageNumber = pageNumber;
      err.stage = "getImageData";
      throw err;
    }

    if (!imageData?.data || imageData.data.length === 0) {
      console.error(TAG, "[7/7] getImageData FAILED — empty imageData");
      const err = new Error("Canvas returned empty pixel data");
      err.code = "ENCODE_FAILED";
      err.pageNumber = pageNumber;
      err.stage = "getImageData";
      throw err;
    }
    console.log(TAG, "[7/7] getImageData SUCCESS", {
      pageNumber,
      rgbaBytes: imageData.data.length,
      totalMs: Date.now() - startedAt,
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
// PUBLIC: render a single page of `filename` as raw RGBA with watermark.
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
    result = await renderPageRaw(filename, pageNumber, 1.5, {
      name: safeName,
      email: safeEmail,
      date: safeDate,
    });
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

// Encodes watermarked RGBA to PNG bytes using pngjs.
export async function renderPageAsPng(filename, pageNumber, watermark) {
  const result = await renderPageAsRgba(filename, pageNumber, watermark);
  const png = new PNG({ width: result.width, height: result.height });
  png.data = Buffer.from(result.rgba.buffer, result.rgba.byteOffset, result.rgba.byteLength);
  return PNG.sync.write(png);
}

// Re-export path resolver for unit tests if needed.
export { resolvePdfPath };
