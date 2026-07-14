import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },

    // ─── NEW: server-only file storage ──────────────────────────────
    // `filename` is the *random* name written under backend/uploads.
    // Never expose this to clients.
    filename: {
      type: String,
      required: true,
      select: false, // never returned by default
    },
    originalFilename: {
      type: String,
      select: false, // never returned by default
    },
    fileSize: {
      type: Number,
    },
    totalPages: {
      type: Number,
      default: 0,
    },
    // ────────────────────────────────────────────────────────────────

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    totalAccessCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const Book = mongoose.model("Book", bookSchema);

export default Book;