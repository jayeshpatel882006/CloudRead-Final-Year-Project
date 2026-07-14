import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import Loader from "../components/Loader";
import { toast } from "react-toastify";
import AccessCountdown from "../components/AccessCountdown";
import { useNavigate } from "react-router-dom";
import "../css/student.css";

const StudentDashboard = () => {
  const [books, setBooks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {


  fetchBooks(1);
}, []);
 const fetchBooks = async (page =1) => {
  try {
    setLoading(true);
    const tost = toast.loading("Please wait...");
    // toast.info("Loading dashboard data... ⏳",{autoClose:500});
    // const booksRes = await API.get("/books");
    const requestsRes = await API.get("/access/my");
    
    const res = await API.get(`/books?page=${page}&limit=3`);
    console.log(res.data);
    
    setBooks(res.data.books);
    setCurrentPage(res.data.currentPage);
    setTotalPages(res.data.totalPages);
    setRequests(requestsRes.data);
    toast.update(tost,{render:"Dashboard loaded! 🎉",  type: "success",isLoading: false, autoClose: 2000 });
  } catch (error) {
    console.log(error.response?.data || error.message);
  } finally {
    setLoading(false);
  }
};
  const requestAccess = async (bookId) => {
    try {
      await API.post("/access", { bookId });
      // 🔥 Refetch updated requests
    const requestsRes = await API.get("/access/my");
    setRequests(requestsRes.data);
        // console.log("Updated Requests:",requestsRes.data);
        
      toast.success("Access request sent!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Request failed");
    }
  };

  const openBook = async (bookId) => {
    // In the new secure flow we navigate to the BookViewer route which
    // fetches pages one at a time as watermarked PNG images. The raw PDF
    // never reaches the browser.
    try {
      toast.info("Opening book... 📖");
      navigate(`/student/book/${bookId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Access denied");
    }
  };

  
  const getBookStatus = (bookId) => {
  const bookRequests = requests.filter((req) => {
    const requestBookId =
      typeof req.book === "object" ? req.book._id : req.book;

    return requestBookId === bookId;
  });

  if (bookRequests.length === 0) return null;

  // Sort by createdAt descending
  bookRequests.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return bookRequests[0].status;
};

if (loading) {
  return (
    <Layout>
      <Loader />
    </Layout>
  );
}

return (
  <Layout>
    <div className="dashboard-container">
      <h2 className="dashboard-title">📚 Student Dashboard</h2>

      <div className="book-grid">
        {books.map((book) => {
          const status = getBookStatus(book._id);

          return (
            <div key={book._id} className="book-card">
              <div className="card-header">
                <h3>{book.title}</h3>
                {status && (
                  <span className={`status-badge ${status}`}>
                    {status.toUpperCase()}
                  </span>
                )}
              </div>

              <p className="book-meta">👤 {book.author}</p>
              <p className="book-meta">📂 {book.category}</p>

              <div className="card-actions">
                {status === "pending" && (
                  <button className="btn-pending" disabled>
                    ⏳ Pending Approval
                  </button>
                )}

                {status === "approved" && (
  <>
    <AccessCountdown bookId={book._id} />
    <button className="btn-open" onClick={() => openBook(book._id)}>
      📖 Open Book
    </button>
  </>
)}

                {(status === "expired" || status === "rejected") && (
                  <button
                    className="btn-retry"
                    onClick={() => requestAccess(book._id)}
                  >
                    🔄 Request Again
                  </button>
                )}

                {!status && (
                  <button
                    className="btn-request"
                    onClick={() => requestAccess(book._id)}
                  >
                    📩 Request Access
                  </button>
                )}
              </div>
            </div>
          );
        })}
        
      </div>
      <div className="pagination">
  <button
    disabled={currentPage === 1}
    onClick={() => fetchBooks(currentPage - 1)}
  >
    ← Prev
  </button>

  <span>
    Page {currentPage} of {totalPages}
  </span>

  <button
    disabled={currentPage === totalPages}
    onClick={() => fetchBooks(currentPage + 1)}
  >
    Next →
  </button>
</div>
    </div>
  </Layout>
);
}

export default StudentDashboard;