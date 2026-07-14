import express from "express";
import {
  addBook,
  getAllBooks,
  getBookById,
  deleteBook,
} from "../controllers/bookController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import upload from "../config/multer.js";

const router = express.Router();

// Anyone logged in can see books (public fields only — see bookController)
router.get("/", protect, getAllBooks);
router.get("/:id", protect, getBookById);

// Only Librarian & Admin can add a book — multipart/form-data with field `pdf`.
router.post(
  "/",
  protect,
  authorizeRoles("librarian", "admin"),
  upload.single("pdf"),
  addBook,
);

// Only Admin can delete
router.delete("/:id", protect, authorizeRoles("admin"), deleteBook);

export default router;