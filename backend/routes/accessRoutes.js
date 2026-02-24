import express from "express";
import {
  requestAccess,
  approveRequest,
  getMyRequests,
  getAllRequests,
  getSecureBookAccess,
} from "../controllers/accessController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Student requests book
router.post("/", protect, authorizeRoles("student"), requestAccess);

// Student view own requests
router.get("/my", protect, authorizeRoles("student"), getMyRequests);

// Librarian/Admin view all
router.get("/", protect, authorizeRoles("librarian", "admin"), getAllRequests);

// Librarian/Admin approve
router.put(
  "/approve/:id",
  protect,
  authorizeRoles("librarian", "admin"),
  approveRequest,
);

// Student secure book access
router.get(
  "/book/:bookId",
  protect,
  authorizeRoles("student"),
  getSecureBookAccess,
);

export default router;
