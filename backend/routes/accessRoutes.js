import express from "express";
import {
  requestAccess,
  approveRequest,
  getMyRequests,
  getAllRequests,
  rejectRequest,
  getBookInfo,
  getBookPage,
} from "../controllers/accessController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ── Student requests book ──────────────────────────────────────────────
router.post("/", protect, authorizeRoles("student"), requestAccess);

// ── Student view own requests ─────────────────────────────────────────
router.get("/my", protect, authorizeRoles("student"), getMyRequests);

// ── NEW: secure book info (sanitized metadata) ────────────────────────
router.get(
  "/book/:bookId/info",
  protect,
  authorizeRoles("student"),
  getBookInfo,
);

// ── NEW: per-page watermarked image ───────────────────────────────────
router.get(
  "/book/:bookId/page/:pageNumber",
  protect,
  authorizeRoles("student"),
  getBookPage,
);

// ── Librarian/Admin view all ──────────────────────────────────────────
router.get("/", protect, authorizeRoles("librarian", "admin"), getAllRequests);

// ── Librarian/Admin approve / reject ──────────────────────────────────
router.put(
  "/approve/:id",
  protect,
  authorizeRoles("librarian", "admin"),
  approveRequest,
);

router.put(
  "/reject/:id",
  protect,
  authorizeRoles("librarian", "admin"),
  rejectRequest,
);

export default router;