import express from "express";
import {
  getDashboardStats,
  getMostAccessedBooks,
  getTopStudents,
  getActiveStudentsForBook,
} from "../controllers/adminController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All routes are Admin only
router.get("/dashboard", protect, authorizeRoles("admin"), getDashboardStats);

router.get(
  "/top-books",
  protect,
  authorizeRoles("admin"),
  getMostAccessedBooks,
);

router.get("/top-students", protect, authorizeRoles("admin"), getTopStudents);

router.get(
  "/book-active/:bookId",
  protect,
  authorizeRoles("librarian", "admin"),
  getActiveStudentsForBook,
);

export default router;
