// services/pdfInfo.js
// -----------------------------------------------------------------------------
// Extracts metadata from an on-disk PDF using ONLY `pdfjs-dist`.
//
// This service deliberately uses the same library as services/pdfRenderer.js so
// the project has ONE PDF engine.
//
//   - pdfjs-dist v6, legacy build — pure JavaScript, works in Node ≥ 22.
//   - ESM-only import (no `require`, no `createRequire`).
//   - The legacy build skips Web Worker spawning so it runs cleanly in Node.
//
// Public API:
//   const info = await getPdfInfo(absPath, { allowedDir });
//   // info.totalPages : integer > 0
//   // info.metadata   : { title, author, subject, keywords, creator, producer, creationDate, modDate }
//
// Failure contract:
//   Throws on any error or if totalPages <= 0. The upload controller treats a
//   throw from this function as a hard failure: the on-disk file is unlinked
//   and no Book document is persisted.
// -----------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

// Single ESM import — no `require`, no `createRequire`. `pdfjs-dist` ships
// its Node entry as `pdfjs-dist/legacy/build/pdf.mjs`.
import {
  getDocument,
  GlobalWorkerOptions,
  version as pdfjsVersion,
} from "pdfjs-dist/legacy/build/pdf.mjs";

// -----------------------------------------------------------------------------
// pdfjs-dist v6 always validates `workerSrc`, even on the legacy build. The
// legacy build runs the worker module in-process (no real Worker thread), but
// pdfjs still needs a URL it can `import()` to load the worker. We point it at
// the bundled legacy worker module via a `file://` URL so Node's ESM loader
// can resolve it.
// -----------------------------------------------------------------------------
function resolveWorkerSrc() {
  // Resolve relative to this source file so it works regardless of CWD.
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

GlobalWorkerOptions.workerSrc = resolveWorkerSrc();

// -----------------------------------------------------------------------------
// Debug prefix so log lines are easy to grep.
// -----------------------------------------------------------------------------
const TAG = "[pdfInfo]";

// -----------------------------------------------------------------------------
// Resolve & validate the input path. Always refuses paths outside the allowed
// upload directory.
// -----------------------------------------------------------------------------
function resolvePdfPath(inputPath, allowedDir) {
  const abs = path.resolve(inputPath);
  const allowedAbs = path.resolve(allowedDir);
  if (!allowedAbs) {
    throw new Error("resolvePdfPath: allowedDir is required");
  }
  if (
    abs !== allowedAbs &&
    !abs.startsWith(allowedAbs + path.sep)
  ) {
    throw new Error(`Refusing to read PDF outside ${allowedAbs}`);
  }
  if (!fs.existsSync(abs)) {
    const err = new Error(`PDF not found at ${abs}`);
    err.code = "ENOENT";
    throw err;
  }
  return abs;
}

// -----------------------------------------------------------------------------
// Internal: read the PDF file into memory and return { buffer, fileSize }.
// Throws with a clear message if the file is empty / unreadable.
// -----------------------------------------------------------------------------
function readPdfBuffer(abs) {
  const stat = fs.statSync(abs);
  const fileSize = stat.size;

  console.log(`${TAG} file size (bytes) :`, fileSize);
  if (fileSize === 0) {
    throw new Error("PDF file is empty (0 bytes)");
  }

  // pdfjs wants a Uint8Array (or a TypedArray). It will not accept a Node
  // Buffer directly — passing one works in v3 but is deprecated in v4+.
  const buf = fs.readFileSync(abs);
  const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  return { bytes, fileSize };
}

// -----------------------------------------------------------------------------
// Internal: load the PDF with pdfjs-dist and read its metadata.
// Returns { pdfDoc, numPages, info, metadata }.
// -----------------------------------------------------------------------------
async function openAndInspect(bytes) {
  let pdfDoc = null;
  try {
    console.log(`${TAG} calling pdfjs-dist getDocument() (v${pdfjsVersion})…`);
    const loadingTask = getDocument({
      data: bytes,
      disableWorker: true,
      isEvalSupported: false,
      useSystemFonts: false,
    });
    pdfDoc = await loadingTask.promise;
    console.log(`${TAG} pdfjs opened document: numPages=${pdfDoc.numPages}`);

    const meta = await pdfDoc.getMetadata?.();
    const info = meta?.info ?? null;
    const metadata = meta?.metadata ?? null;

    return {
      numPages: pdfDoc.numPages,
      info,
      metadata,
    };
  } finally {
    // pdfjs-dist v6 dropped pdfDoc.destroy() — internal cleanup is GC-driven.
    // We explicitly null our reference to make that faster.
    pdfDoc = null;
  }
}

// -----------------------------------------------------------------------------
// Internal: turn pdfjs' info / metadata objects into a plain serialisable
// metadata bag. XMP metadata is a Map-like object — we flatten known keys.
// -----------------------------------------------------------------------------
function buildMetadataBag(info, metadata) {
  const out = {
    title: null,
    author: null,
    subject: null,
    keywords: null,
    creator: null,
    producer: null,
    creationDate: null,
    modDate: null,
  };

  if (info && typeof info === "object") {
    out.title = info.Title ?? null;
    out.author = info.Author ?? null;
    out.subject = info.Subject ?? null;
    out.keywords = info.Keywords ?? null;
    out.creator = info.Creator ?? null;
    out.producer = info.Producer ?? null;
    out.creationDate = info.CreationDate ?? null;
    out.modDate = info.ModDate ?? null;
  }

  // XMP metadata can override / extend the doc-info fields.
  if (metadata) {
    const get = (key) => {
      try {
        if (typeof metadata.get === "function") {
          const v = metadata.get(key);
          return v ?? null;
        }
        if (typeof metadata.getAll === "function") {
          const all = metadata.getAll();
          return all?.[key] ?? null;
        }
        if (metadata && typeof metadata === "object") {
          return metadata[key] ?? null;
        }
      } catch (_) {
        return null;
      }
      return null;
    };
    out.title = out.title || get("dc:title");
    out.author = out.author || get("dc:creator");
    out.subject = out.subject || get("dc:subject");
    out.keywords = out.keywords || get("pdf:Keywords");
  }

  return out;
}

// -----------------------------------------------------------------------------
// PUBLIC: getPdfInfo(absPath, opts?) → { totalPages, fileSize, metadata }
//
//   absPath    : absolute path to the PDF on disk
//   opts.allowedDir : directory the path must live under
//
// Throws on any failure or if totalPages <= 0.
// -----------------------------------------------------------------------------
export async function getPdfInfo(absPath, opts = {}) {
  const { allowedDir } = opts;

  console.log("");
  console.log("========== pdfInfo START ==========");
  console.log(`${TAG} input path        :`, absPath);
  console.log(`${TAG} allowed dir       :`, allowedDir || "(none)");
  console.log(`${TAG} file exists       :`, fs.existsSync(absPath));

  if (!allowedDir) {
    throw new Error("getPdfInfo: opts.allowedDir is required");
  }

  // ── 1. resolve path ────────────────────────────────────────────────
  let abs;
  try {
    abs = resolvePdfPath(absPath, allowedDir);
  } catch (e) {
    console.error(`${TAG} path resolution failed:`, e.message);
    console.error(e.stack);
    throw e;
  }

  // ── 2. read bytes ──────────────────────────────────────────────────
  let fileSize = 0;
  let bytes;
  try {
    const r = readPdfBuffer(abs);
    bytes = r.bytes;
    fileSize = r.fileSize;
  } catch (e) {
    console.error(`${TAG} file read failed:`, e.message);
    console.error(e.stack);
    throw e;
  }

  // ── 3. parse with pdfjs-dist ───────────────────────────────────────
  let parsed;
  try {
    parsed = await openAndInspect(bytes);
  } catch (e) {
    console.error(`${TAG} pdfjs getDocument failed:`);
    console.error(e.stack || e.message || e);
    throw e;
  }

  // ── 4. validate ────────────────────────────────────────────────────
  const totalPages = Number(parsed?.numPages) || 0;
  if (totalPages <= 0) {
    const err = new Error(
      `PDF parser returned ${totalPages} pages — file is likely corrupt`,
    );
    console.error(`${TAG}`, err.message);
    throw err;
  }

  // ── 5. build response ──────────────────────────────────────────────
  const metadata = buildMetadataBag(parsed.info, parsed.metadata);

  console.log(`${TAG} SUCCESS — totalPages=${totalPages}, fileSize=${fileSize}`);
  console.log(`${TAG} metadata:`, metadata);
  console.log("========== pdfInfo END ==========");
  console.log("");

  return {
    totalPages,
    fileSize,
    metadata,
    // Keep raw so callers can debug if they need to.
    _raw: {
      info: parsed.info,
      metadata: parsed.metadata,
    },
  };
}

// Re-export pdfjsVersion in case other modules want it.
export { pdfjsVersion };
