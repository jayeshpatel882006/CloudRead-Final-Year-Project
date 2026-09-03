import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// AccessRequest — one document per student access request.
//
// Lifecycle:  pending → approved → expired   (7-day access window)
//             pending → rejected             (history is preserved, never deleted)
//
// Request history is intentionally kept forever: a rejected or expired request
// stays in the collection so the student can see their full history. Requesting
// again creates a NEW document — it never overwrites the old one.
// ─────────────────────────────────────────────────────────────────────────────

const accessRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    requestDate: {
      type: Date,
      default: Date.now,
    },
    accessStartDate: Date,
    accessEndDate: Date,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
    },

    // ─── Request / response messaging ────────────────────────────────
    // Optional reason the student gives when requesting access.
    studentMessage: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Single field for the librarian's response on BOTH approval and rejection
    // (keeps the schema consistent — no separate rejectionReason field).
    librarianResponse: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // ─── Review audit trail ──────────────────────────────────────────
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// ── Indexes (each justified by a specific query) ─────────────────────────────
//   1. { user: 1, book: 1, status: 1 } → duplicate-request prevention and
//      active-access lookups (findOne user+book+status).
//   2. { status: 1, createdAt: -1 }    → librarian list by status, newest first.
//   3. { user: 1, createdAt: -1 }      → student request-history pagination.
//   4. { status: 1, accessEndDate: 1 } → cron expiry sweep
//      (updateMany approved where accessEndDate < now).
accessRequestSchema.index({ user: 1, book: 1, status: 1 });
accessRequestSchema.index({ status: 1, createdAt: -1 });
accessRequestSchema.index({ user: 1, createdAt: -1 });
accessRequestSchema.index({ status: 1, accessEndDate: 1 });

const AccessRequest = mongoose.model("AccessRequest", accessRequestSchema);

export default AccessRequest;