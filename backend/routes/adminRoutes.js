import express from "express";
import {
  getDashboardStats,
  getMostAccessedBooks,
  getTopStudents,
  getActiveStudentsForBook,
  getAllUsers,
  updateUserRole,
  deleteUser,
  toggleBlockUser,
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

router.get("/users", protect, authorizeRoles("admin"), getAllUsers);

router.put("/users/:id/role", protect, authorizeRoles("admin"), updateUserRole);

router.delete("/users/:id", protect, authorizeRoles("admin"), deleteUser);

router.put(
  "/users/:id/block",
  protect,
  authorizeRoles("admin"),
  toggleBlockUser,
);

export default router;
