import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import { ClipLoader } from "react-spinners";
import Loader from "../components/Loader";

const StudentDashboard = () => {
  const [books, setBooks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
 const fetchData = async () => {
  try {
    setLoading(true);
    const booksRes = await API.get("/books");
    const requestsRes = await API.get("/access/my");

    setBooks(booksRes.data);
    setRequests(requestsRes.data);
  } catch (error) {
    console.log(error.response?.data || error.message);
  } finally {
    setLoading(false);
  }
};

  fetchData();
}, []);
//   useEffect(() => {
//     const fetchBooks = async () => {
//       try {
//         const { data } = await API.get("/books");
//         setBooks(data);
//       } catch (error) {
//         console.log(error.response?.data || error.message);
//       }
//     };

//     fetchBooks();
//   }, []);

  const requestAccess = async (bookId) => {
    try {
      await API.post("/access", { bookId });
      // 🔥 Refetch updated requests
    const requestsRes = await API.get("/access/my");
    setRequests(requestsRes.data);
        console.log("Updated Requests:",requestsRes.data);
        
      alert("Access request sent!");
    } catch (error) {
      alert(error.response?.data?.message || "Request failed");
    }
  };

  const openBook = async (bookId) => {
    try {
      const { data } = await API.get(`/access/book/${bookId}`);
      window.open(data.pdfLink, "_blank");
    } catch (error) {
      alert(error.response?.data?.message || "Access denied");
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

// if (loading) {
//   return (
//     <Layout>
//        <Loader />
//     </Layout>
//   );
// }

//   return (

//     <Layout>
//       <h2>📚 Student Dashboard</h2>
      

//       {books.map((book) =>{
//         const status = getBookStatus(book._id);
        
//         return(
//         <div
//           key={book._id} className="card"
//           style={{
//             border: "1px solid #ccc",
//             padding: "15px",
//             marginBottom: "10px",
//           }}
//         >
//           <h3>{book.title}</h3>
//           <p>Author: {book.author}</p>
//           <p>Category: {book.category}</p>
//          {status && (
//   <span className={`status ${status}`}>
//     {status.toUpperCase()}
//   </span>
// )}

// {status === "pending" && (
//   <button disabled>⏳ Pending Approval</button>
// )}

// {status === "approved" && (
//   <button style={{ backgroundColor: "#4f46e5", color: "white" }} onClick={() => openBook(book._id)}>
//     📖 Open Book
//   </button>
// )}

// {status === "expired" || status === "rejected" && (
//   <button style={{ backgroundColor: "#4f46e5", color: "white" }} onClick={() => requestAccess(book._id)}>
//     🔄 Request Again
//   </button>
// )}
//         </div>
//       ) })}
//     {/* </div> */}
//     </Layout>

//   );
// };
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
                  <button className="btn disabled" disabled>
                    ⏳ Pending Approval
                  </button>
                )}

                {status === "approved" && (
                  <button
                    className="btn primary"
                    onClick={() => openBook(book._id)}
                  >
                    📖 Open Book
                  </button>
                )}

                {(status === "expired" || status === "rejected") && (
                  <button
                    className="btn primary"
                    onClick={() => requestAccess(book._id)}
                  >
                    🔄 Request Again
                  </button>
                )}

                {!status && (
                  <button
                    className="btn primary"
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
    </div>
  </Layout>
);
}

export default StudentDashboard;