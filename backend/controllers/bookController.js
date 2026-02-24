import Book from "../models/Book.js";

// 📌 Add Book (Librarian / Admin)
export const addBook = async (req, res) => {
  try {
    const { title, author, category, description, pdfLink } = req.body;

    const book = await Book.create({
      title,
      author,
      category,
      description,
      pdfLink,
      uploadedBy: req.user._id,
    });

    res.status(201).json(book);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 Get All Books
export const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find()
      .select("-pdfLink")
      .populate("uploadedBy", "name role");
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 Get Single Book
export const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json(book);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 Delete Book (Admin Only)
export const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    await book.deleteOne();

    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
