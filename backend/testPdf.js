// testPdf.js
// -----------------------------------------------------------------------------
// Standalone CLI to validate the PDF metadata pipeline without booting Express.
//
// Usage:
//   node testPdf.js                       # picks the first *.pdf in uploads/
//   node testPdf.js <some-file.pdf>       # uses the given absolute path
//   node testPdf.js <dir>                 # picks the first *.pdf in that dir
//
// Prints:
//   File Exists: true/false
//   File Size:   <bytes>
//   PDF Pages:   <N>
//   Title:       <string or null>
//   Author:      <string or null>
//   Producer:    <string or null>
//   Creator:     <string or null>
//   Info:        {...}
//   Metadata:    {...}
// -----------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPdfInfo } from "./services/pdfInfo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.resolve(__dirname, "uploads");

// -----------------------------------------------------------------------------
// Pick a target PDF.
// -----------------------------------------------------------------------------
function resolveTarget() {
  const arg = process.argv[2];

  if (!arg) {
    // Default: first *.pdf in uploads/
    if (!fs.existsSync(UPLOAD_DIR)) {
      console.error(`No uploads directory at ${UPLOAD_DIR}`);
      console.error("Upload a book first, or pass an explicit path:");
      console.error("  node testPdf.js /absolute/path/to/some.pdf");
      process.exit(1);
    }
    const candidates = fs
      .readdirSync(UPLOAD_DIR)
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
      .map((f) => path.join(UPLOAD_DIR, f));
    if (candidates.length === 0) {
      console.error(`No PDF files found in ${UPLOAD_DIR}`);
      process.exit(1);
    }
    return candidates[0];
  }

  const abs = path.resolve(arg);
  if (!fs.existsSync(abs)) {
    console.error(`Path does not exist: ${abs}`);
    process.exit(1);
  }
  const stat = fs.statSync(abs);
  if (stat.isDirectory()) {
    const candidates = fs
      .readdirSync(abs)
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
      .map((f) => path.join(abs, f));
    if (candidates.length === 0) {
      console.error(`No PDF files found in ${abs}`);
      process.exit(1);
    }
    return candidates[0];
  }
  return abs;
}

async function main() {
  const target = resolveTarget();
  console.log("────────────────────────────────────────────────────────");
  console.log(" CloudRead · PDF metadata test");
  console.log("────────────────────────────────────────────────────────");
  console.log("Target:", target);
  console.log("");

  console.log("File Exists:", fs.existsSync(target));
  console.log(
    "File Size:  ",
    fs.existsSync(target) ? fs.statSync(target).size : "N/A",
  );

  try {
    const info = await getPdfInfo(target, { allowedDir: UPLOAD_DIR });

    console.log("");
    console.log("PDF Pages: ", info.totalPages);
    console.log("");
    console.log("Metadata (doc-info + XMP):");
    console.log(JSON.stringify(info.metadata, null, 2));
    console.log("");
    if (info._raw?.info) {
      console.log("Raw pdfjs doc-info:");
      console.log(JSON.stringify(info._raw.info, null, 2));
    }
    console.log("");
    console.log("✅ getPdfInfo succeeded.");
  } catch (e) {
    console.error("");
    console.error("❌ getPdfInfo FAILED:");
    console.error(e.stack || e.message || e);
    process.exit(2);
  }
}

main();