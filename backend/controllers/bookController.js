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
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;
    // console.log(limit);

    const skip = (page - 1) * limit;

    const totalBooks = await Book.countDocuments();

    const books = await Book.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      books,
      currentPage: page,
      totalPages: Math.ceil(totalBooks / limit),
      totalBooks,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
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
