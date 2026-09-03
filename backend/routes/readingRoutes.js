import express from "express";
import {
  startReading,
  heartbeat,
  stopReading,
  getStudentAnalyticsHandler,
  getStudentInsightsHandler,
  getLibrarianAnalyticsHandler,
  getLibrarianInsightsHandler,
  getAdminAnalyticsHandler,
  getAdminInsightsHandler,
} from "../controllers/readingController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// ── Session lifecycle (student only) ─────────────────────────────────────
router.post("/start", protect, authorizeRoles("student"), startReading);
router.post("/heartbeat", protect, authorizeRoles("student"), heartbeat);
router.post("/stop", protect, authorizeRoles("student"), stopReading);

// ── Student analytics + insights ─────────────────────────────────────────
router.get(
  "/student/analytics",
  protect,
  authorizeRoles("student"),
  getStudentAnalyticsHandler,
);
router.get(
  "/student/insights",
  protect,
  authorizeRoles("student"),
  getStudentInsightsHandler,
);

// ── Librarian analytics + insights (librarian scoped to own books, admin sees all) ──
router.get(
  "/librarian/analytics",
  protect,
  authorizeRoles("librarian", "admin"),
  getLibrarianAnalyticsHandler,
);
router.get(
  "/librarian/insights",
  protect,
  authorizeRoles("librarian", "admin"),
  getLibrarianInsightsHandler,
);

// ── Admin platform analytics + insights ──────────────────────────────────
router.get(
  "/admin/analytics",
  protect,
  authorizeRoles("admin"),
  getAdminAnalyticsHandler,
);
router.get(
  "/admin/insights",
  protect,
  authorizeRoles("admin"),
  getAdminInsightsHandler,
);

export default router;