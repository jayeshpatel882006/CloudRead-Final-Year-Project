import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve uploads dir relative to this file so it works no matter the CWD.
// backend/config/multer.js  →  backend/uploads
const UPLOAD_DIR = path.resolve(__dirname, "..", "uploads");

// Ensure directory exists once at startup. fs.mkdirSync with recursive:true
// is idempotent so calling it every import is harmless.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Random, unguessable filenames — never trust the client-supplied name.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, _file, cb) => {
    const id = crypto.randomBytes(16).toString("hex");
    cb(null, `${id}.pdf`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

export default upload;
export { UPLOAD_DIR };