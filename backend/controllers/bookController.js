// controllers/bookController.js
// -----------------------------------------------------------------------------
// SECURITY: every response in this file MUST exclude `filename`, `originalFilename`,
// and any path. The Book schema already has `select: false` on those fields, but
// we additionally project them out explicitly in case a future query uses .select().
// -----------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import Book from "../models/Book.js";
import { UPLOAD_DIR } from "../config/multer.js";
import { getPdfInfo } from "../services/pdfInfo.js";

// Reusable projection that hides server-only fields from any client response.
const PUBLIC_PROJECTION = "-filename -originalFilename";

// Helper: remove the just-uploaded PDF from disk. Used for rollback.
function unlinkUploadedFile(filename) {
  try {
    const abs = path.resolve(UPLOAD_DIR, filename);
    if (
      abs.startsWith(path.resolve(UPLOAD_DIR) + path.sep) &&
      fs.existsSync(abs)
    ) {
      fs.unlinkSync(abs);
      console.log("[addBook] rolled back uploaded file:", abs);
    }
  } catch (e) {
    console.error("[addBook] failed to roll back uploaded file:", e.message);
  }
}

// 📌 Add Book (Librarian / Admin) — multipart/form-data with field `pdf`.
//
// Fail-fast contract:
//   - If the uploaded file is missing → 400, no DB write.
//   - If page count cannot be determined → 500 + delete uploaded file +
//     no DB write. (We never persist `totalPages: 0`.)
//   - On success → 201 with the sanitized Book document.
export const addBook = async (req, res) => {
  console.log("\n========== [addBook] START ==========");
  console.log("[addBook] req.file              :", req.file?.filename);
  console.log("[addBook] req.file.path         :", req.file?.path);
  console.log("[addBook] req.file.size         :", req.file?.size);
  console.log("[addBook] req.user._id          :", req.user?._id);

  try {
    if (!req.file) {
      console.error("[addBook] no req.file");
      return res.status(400).json({ message: "PDF file is required" });
    }

    let { title, author, category, description } = req.body;

    // ── Step 1: validate the file on disk actually exists and is readable.
    const absPath = path.resolve(UPLOAD_DIR, req.file.filename);
    const exists = fs.existsSync(absPath);
    console.log("[addBook] resolved absolute path:", absPath);
    console.log("[addBook] file exists          :", exists);
    console.log("[addBook] file size            :", exists ? fs.statSync(absPath).size : "N/A");

    if (!exists) {
      return res
        .status(400)
        .json({ message: "Uploaded file not found on server" });
    }

    // ── Step 2: extract PDF metadata. Fail the upload if anything goes wrong.
    let info;
    try {
      info = await getPdfInfo(absPath, { allowedDir: UPLOAD_DIR });
    } catch (pdfErr) {
      console.error("[addBook] getPdfInfo threw — aborting upload");
      console.error(pdfErr.stack || pdfErr.message || pdfErr);
      unlinkUploadedFile(req.file.filename);
      return res.status(500).json({
        message: "Failed to read PDF metadata. Upload rejected.",
        detail: pdfErr.message,
      });
    }

    if (!info || !info.totalPages || info.totalPages <= 0) {
      console.error(
        "[addBook] totalPages was 0 or missing — aborting upload",
      );
      unlinkUploadedFile(req.file.filename);
      return res.status(500).json({
        message:
          "Could not determine the number of pages in this PDF. Upload rejected.",
      });
    }

    console.log("[addBook] creating Book document with totalPages =", info.totalPages);
    console.log("[addBook] metadata from pdfjs :", info.metadata);

    // ── Step 3: persist.
    //
    // If the librarian didn't fill in the form's `title` / `author`, fall back
    // to what the PDF itself claims in its doc-info / XMP block. This makes
    // uploads of well-tagged PDFs nicer without overriding human input.
    const finalTitle =
      (title && String(title).trim()) || info.metadata?.title || null;
    const finalAuthor =
      (author && String(author).trim()) || info.metadata?.author || null;

    const book = await Book.create({
      title: finalTitle,
      author: finalAuthor,
      category,
      description,
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      fileSize: info.fileSize,
      totalPages: info.totalPages,
      uploadedBy: req.user._id,
    });

    // Re-fetch with the public projection so we never accidentally leak filename.
    const safe = await Book.findById(book._id).select(PUBLIC_PROJECTION);
    console.log("[addBook] SUCCESS, book id =", book._id.toString());
    console.log("========== [addBook] END ==========\n");
    res.status(201).json(safe);
  } catch (error) {
    console.error("[addBook] outer catch:", error.stack || error.message);
    // If the file is still on disk and we never persisted, clean it up.
    if (req.file) unlinkUploadedFile(req.file.filename);
    res.status(500).json({ message: error.message });
  }
};

// 📌 Get All Books — paginated, sanitized.
export const getAllBooks = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;

    const skip = (page - 1) * limit;

    const totalBooks = await Book.countDocuments();

    const books = await Book.find()
      .select(PUBLIC_PROJECTION)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      books,
      currentPage: page,
      totalPages: Math.ceil(totalBooks / limit),
      totalBooks,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 📌 Get Single Book — sanitized.
export const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).select(PUBLIC_PROJECTION);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(book);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 Delete Book (Admin Only) — also removes the underlying file.
export const deleteBook = async (req, res) => {
  try {
    // We need the filename to delete the file, so query *with* filename here.
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // Best-effort file cleanup — never fail the delete if FS errors out.
    if (book.filename) {
      try {
        const abs = path.resolve(UPLOAD_DIR, book.filename);
        if (
          abs.startsWith(path.resolve(UPLOAD_DIR) + path.sep) &&
          fs.existsSync(abs)
        ) {
          fs.unlinkSync(abs);
        }
      } catch (e) {
        console.error("[deleteBook] File delete failed:", e.message);
      }
    }

    await book.deleteOne();

    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};