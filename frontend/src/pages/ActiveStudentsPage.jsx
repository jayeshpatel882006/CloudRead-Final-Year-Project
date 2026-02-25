import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../services/api";
import Layout from "../components/Layout";
import "../css/activestudentbook.css";

const ActiveStudentsPage = () => {
  const { bookId } = useParams();
  const [students, setStudents] = useState([]);
  const [bookTitle, setBookTitle] = useState("");

  useEffect(() => {
    const fetchActiveStudents = async () => {
      try {
        const { data } = await API.get(`/admin/book-active/${bookId}`);
        setStudents(data);

        if (data.length > 0) {
          setBookTitle(data[0].book?.title || "Book");
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchActiveStudents();
  }, [bookId]);

  return (
    <Layout>
      <div className="active-page-container">

        <h2>Active Students</h2>
        <p className="active-count">
          Total Active: {students.length}
        </p>

        <div className="students-grid">
          {students.length > 0 ? (
            students.map((item) => (
              <div key={item._id} className="student-card">
                <div className="student-avatar">
                  {item.user.name.charAt(0).toUpperCase()}
                </div>

                <div className="student-info">
                  <h4>{item.user.name}</h4>
                  <p>{item.user.email}</p>
                  <span>
                    Expires: {new Date(item.accessEndDate).toLocaleDateString("en-GB")}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p>No active students for this book.</p>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default ActiveStudentsPage;