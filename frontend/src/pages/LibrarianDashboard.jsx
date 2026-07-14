import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import PageWrapper from "../components/PageWrapper";
import "../css/libraryan.css";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";


const LibrarianDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [books, setBooks] = useState([]);
  const [activeStudents, setActiveStudents] = useState({});
  const [expandedBook, setExpandedBook] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    category: "",
    description: "",
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const requestsRes = await API.get("/access");
      const booksRes = await API.get("/books");
      // console.log(booksRes.data);
      // console.log(requestsRes.data);
      
      setRequests(requestsRes.data);  
      setBooks(booksRes.data.books);
    } catch (error) {
      console.log("This Errorr");
      console.log(error);
      
      console.log(error.response?.data || error.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approveRequest = async (id) => {
    const tost = toast.loading("Approving request...");
    try {
      await API.put(`/access/approve/${id}`);
      fetchData();
      toast.update(tost,{render:"Request approved!",  type: "success",isLoading: false, autoClose: 2000 });
    } catch (error) {
      console.log(error.response);
      toast.update(tost,{render:error.response?.data?.message || "Approval failed",  type: "error",isLoading: false, autoClose: 2000 });
      // toast.error(error.response?.data?.message || "Approval failed");
    }
  };

  const rejectRequest = async (id) => {
  try {
    await API.put(`/access/reject/${id}`);
    toast.success("Request rejected!");
    fetchData();
  } catch (error) {
    toast.error(error.response?.data?.message || "Rejection failed");
  }
};

  const addBook = async (e) => {
    e.preventDefault();

    if (!pdfFile) {
      toast.error("Please select a PDF file to upload");
      return;
    }
    if (pdfFile.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (pdfFile.size > 50 * 1024 * 1024) {
      toast.error("PDF must be smaller than 50MB");
      return;
    }

    const data = new FormData();
    data.append("title", formData.title);
    data.append("author", formData.author);
    data.append("category", formData.category);
    data.append("description", formData.description);
    data.append("pdf", pdfFile);

    try {
      setUploadLoading(true);
      await API.post("/books", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFormData({
        title: "",
        author: "",
        category: "",
        description: "",
      });
      setPdfFile(null);
      // Reset the native file input by re-mounting — easiest is to clear value via a ref.
      const fileInput = document.getElementById("pdf-input");
      if (fileInput) fileInput.value = "";
      toast.success("Book added successfully!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Book creation failed");
    } finally {
      setUploadLoading(false);
    }
  };

  const fetchActiveStudents = async (bookId) => {
     // 🔁 If same book clicked → close it
  if (expandedBook === bookId) {
    setExpandedBook(null);
    return;
  }
  try {
    const { data } = await API.get(`/admin/book-active/${bookId}`);

    setActiveStudents(prev => ({
      ...prev,
      [bookId]: data
    }));
    // console.log(bookId);
    
    setExpandedBook(bookId);
  } catch (error) {
    console.log(error);
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
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />

            <input
              id="pdf-input"
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files[0] || null)}
              required
            />

            <button
              type="submit"
              className="btn-primary"
              disabled={uploadLoading}
            >
              {uploadLoading ? "Uploading…" : "Add Book"}
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
            {books?.map((book) =>(
              <div key={book._id} className="book-card-modern">
  <h4>{book.title}</h4>
  <p>{book.author}</p>

  <button
    className="view-active-btn"
    onClick={() => navigate(`/librarian/book/${book._id}/active`)}
  >
     {expandedBook === book._id
    ? "Hide Active Students"
    : "View Active Students"}
  </button>

  {/* {expandedBook === book._id && (
  <div className="active-students-list">
    {activeStudents[book._id]?.length > 0 ? (
      activeStudents[book._id].map((item) => (
        <div key={item._id} className="student-card">

          <div className="student-avatar">
            {item.user.name.charAt(0).toUpperCase()}
          </div>

          <div className="student-info">
            <h5>{item.user.name}</h5>
            <p>{item.user.email}</p>
            <span className="access-date">
              Expires: {new Date(item.accessEndDate).toLocaleDateString("en-GB")}
            </span>
          </div>

        </div>
      ))
    ) : (
      <p className="empty-text">No active students</p>
    )}
  </div>
)} */}
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