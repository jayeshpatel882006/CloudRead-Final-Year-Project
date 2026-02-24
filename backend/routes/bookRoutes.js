import express from "express";
import {
  addBook,
  getAllBooks,
  getBookById,
  deleteBook,
} from "../controllers/bookController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Anyone logged in can see books
router.get("/", protect, getAllBooks);
router.get("/:id", protect, getBookById);

// Only Librarian & Admin can add
router.post("/", protect, authorizeRoles("librarian", "admin"), addBook);

// Only Admin can delete
router.delete("/:id", protect, authorizeRoles("admin"), deleteBook);

export default router;
