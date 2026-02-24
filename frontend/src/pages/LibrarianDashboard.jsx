import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";


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
      <h2>📚 Librarian Dashboard</h2>

      {/* Add Book Section */}
      <h3>➕ Add New Book</h3>
      <form onSubmit={addBook} style={{ marginBottom: "30px" }}>
        <input
          placeholder="Title"
          value={formData.title}
          onChange={(e) =>
            setFormData({ ...formData, title: e.target.value })
          }
        />
        <input
          placeholder="Author"
          value={formData.author}
          onChange={(e) =>
            setFormData({ ...formData, author: e.target.value })
          }
        />
        <input
          placeholder="Category"
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
        />
        <input
          placeholder="PDF Link"
          value={formData.pdfLink}
          onChange={(e) =>
            setFormData({ ...formData, pdfLink: e.target.value })
          }
        />
        <button type="submit">Add Book</button>
      </form>

      {/* Pending Requests Section */}
      <h3>📩 Pending Access Requests</h3>
      {requests
        .filter((req) => req.status === "pending")
        .map((req) => (
          <div
            key={req._id}
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <p>
              👤 {req.user?.name} → 📖 {req.book?.title}
            </p>
            <button
  onClick={() => approveRequest(req._id)}
  style={{ marginRight: "10px" }}
>
  ✅ Approve
</button>

<button
  onClick={() => rejectRequest(req._id)}
  style={{ backgroundColor: "#ff4d4d", color: "white" }}
>
  ❌ Reject
</button>
          </div>
        ))}

      {/* All Books */}
      <h3>📖 All Books</h3>
      {books.map((book) => (
        <div
          key={book._id}
          style={{
            border: "1px solid #eee",
            padding: "10px",
            marginBottom: "5px",
          }}
        >
          {book.title} — {book.author}
        </div>
      ))}
      
    </Layout>
  );
};

export default LibrarianDashboard;