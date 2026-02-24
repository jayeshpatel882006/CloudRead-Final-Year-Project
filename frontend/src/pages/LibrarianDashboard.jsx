import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import PageWrapper from "../components/PageWrapper";
import "../css/libraryan.css";

const LibrarianDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [books, setBooks] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    category: "",
    description: "",
    pdfLink: "",
  });

  const fetchData = async () => {
    try {
      const requestsRes = await API.get("/access");
      const booksRes = await API.get("/books");

      setRequests(requestsRes.data);
      setBooks(booksRes.data);
    } catch (error) {
      console.log(error.response?.data || error.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approveRequest = async (id) => {
    try {
      await API.put(`/access/approve/${id}`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Approval failed");
    }
  };

  const rejectRequest = async (id) => {
  try {
    await API.put(`/access/reject/${id}`);
    fetchData();
  } catch (error) {
    alert("Rejection failed");
  }
};

  const addBook = async (e) => {
    e.preventDefault();
    try {
      await API.post("/books", formData);
      setFormData({
        title: "",
        author: "",
        category: "",
        description: "",
        pdfLink: "",
      });
      fetchData();
    } catch (error) {
      alert("Book creation failed");
    }
  };

 
return (
  <Layout>
    <PageWrapper>
      <div className="librarian-container">

        <h2 className="dashboard-title">Librarian Dashboard</h2>

        {/* Add Book Section */}
        <div className="card-section">
          <h3>Add New Book</h3>

          <form onSubmit={addBook} className="librarian-form">
            <input
              type="text"
              placeholder="Title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />

            <input
              type="text"
              placeholder="Author"
              value={formData.author}
              onChange={(e) =>
                setFormData({ ...formData, author: e.target.value })
              }
              required
            />

            <input
              type="text"
              placeholder="Category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              required
            />

            <input
              type="text"
              placeholder="PDF Link"
              value={formData.pdfLink}
              onChange={(e) =>
                setFormData({ ...formData, pdfLink: e.target.value })
              }
              required
            />

            <button type="submit" className="btn-primary">
              Add Book
            </button>
          </form>
        </div>

        {/* Pending Requests */}
        <div className="card-section">
          <h3>Pending Requests</h3>

          {requests.filter(r => r.status === "pending").length === 0 && (
            <p className="empty-text">No pending requests</p>
          )}

          {requests
            .filter(r => r.status === "pending")
            .map((req) => (
              <div key={req._id} className="request-card">
                <div>
                  <strong>{req.user?.name}</strong>
                  <p>{req.book?.title}</p>
                </div>

                <div className="request-actions">
                  <button
                    onClick={() => approveRequest(req._id)}
                    className="btn-success"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => rejectRequest(req._id)}
                    className="btn-danger"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* All Books */}
        <div className="card-section">
          <h3>All Books</h3>

          <div className="books-grid">
            {books.map((book) => (
              <div key={book._id} className="book-card-modern">
                <h4>{book.title}</h4>
                <p>{book.author}</p>
                <span className="category-tag">
                  {book.category}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </PageWrapper>
  </Layout>
);
};

export default LibrarianDashboard;