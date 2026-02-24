import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import "../css/admin.css";
import { ResponsiveContainer } from "recharts";

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
    <div className="admin-container">

      <h2 className="admin-title">Admin Dashboard</h2>

      {/* Stats Cards */}
      <div className="admin-stats">
        <div className="stat-card">
          <h4>Total Users</h4>
          <p>{stats.totalUsers || 0}</p>
        </div>

        <div className="stat-card">
          <h4>Total Books</h4>
          <p>{stats.totalBooks || 0}</p>
        </div>

        <div className="stat-card">
          <h4>Active Access</h4>
          <p>{stats.activeAccess || 0}</p>
        </div>

        <div className="stat-card">
          <h4>Expired Access</h4>
          <p>{stats.expiredAccess || 0}</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="chart-section">
        <h3>Most Accessed Books</h3>

        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={350}>
          <BarChart
            width="100%"
            height={350}
            data={topBooks}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="title" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="totalAccessCount" fill="#2563eb" />
          </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  </Layout>
);
};


export default AdminDashboard;