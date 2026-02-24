import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [topBooks, setTopBooks] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await API.get("/admin/dashboard");
        const booksRes = await API.get("/admin/top-books");

        setStats(statsRes.data);
        setTopBooks(booksRes.data);
      } catch (error) {
        console.log(error.response?.data || error.message);
      }
    };

    fetchData();
  }, []);

  return (
    <Layout>
      <h2>📊 Admin Dashboard</h2>

      {/* Stats Cards */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "40px" }}>
        <div style={cardStyle}>
          <h3>Total Users</h3>
          <p>{stats.totalUsers}</p>
        </div>

        <div style={cardStyle}>
          <h3>Total Books</h3>
          <p>{stats.totalBooks}</p>
        </div>

        <div style={cardStyle}>
          <h3>Active Access</h3>
          <p>{stats.activeAccess}</p>
        </div>

        <div style={cardStyle}>
          <h3>Expired Access</h3>
          <p>{stats.expiredAccess}</p>
        </div>
      </div>

      {/* Bar Chart */}
      <h3>🔥 Most Accessed Books</h3>
      <BarChart
        width={600}
        height={300}
        data={topBooks}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="title" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="totalAccessCount" fill="#8884d8" />
      </BarChart>
    </Layout>
  );
};

const cardStyle = {
  border: "1px solid #ccc",
  padding: "20px",
  borderRadius: "10px",
  width: "150px",
  textAlign: "center",
};

export default AdminDashboard;