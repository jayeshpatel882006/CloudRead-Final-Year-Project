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
import { toast } from "react-toastify";


const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [topBooks, setTopBooks] = useState([]);
  const [users,setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await API.get("/admin/dashboard");
        const booksRes = await API.get("/admin/top-books");
       

        setStats(statsRes.data);
        setTopBooks(booksRes.data);
        // setUsers(usersRes.data);
      } catch (error) {
        console.log(error.response?.data || error.message);
      }
    };

    fetchData();
    fetchUsers(1);
  }, []);

   const fetchUsers = async (page = 1) => {
    const res = await API.get(`/admin/users?page=${page}&limit=2`);
      console.log(res.data.totalUsers);
      setTotalUsers(res.data.totalUsers);
      setUsers(res.data.users);
      setCurrentPage(res.data.currentPage);
      setTotalPages(res.data.totalPages);
};

  const refreshUsers = async () => {
  const usersRes = await API.get("/admin/users");
  setUsers(usersRes.data.users);
};

const updateRole = async (id, role) => {
  const data = await API.put(`/admin/users/${id}/role`, { role });
toast.success(data.message || "Role updated successfully");
  refreshUsers();
};

const toggleBlock = async (id) => {
  await API.put(`/admin/users/${id}/block`);
  refreshUsers();
  toast.success("User status updated successfully");
};

const deleteUser = async (id) => {
  if (!window.confirm("Are you sure you want to delete this user?")) return;

  await API.delete(`/admin/users/${id}`);
  toast.success("User deleted successfully");
  refreshUsers();
};


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

      {/* ================= USER MANAGEMENT ================= */}

<div className="user-section">
  <div className="user-header">
  <h3>User Management</h3>
  <span className="user-count-badge">
   Total {totalUsers} Users
  </span>
</div>

  <div className="admin-table-wrapper">
    <table className="admin-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {users?.map((user) => (
          <tr key={user._id}>
            <td>{user.name}</td>
            <td>{user.email}</td>

            <td>
              <select
                className="role-select"
                value={user.role}
                onChange={(e) =>
                  updateRole(user._id, e.target.value)
                }
              >
                <option value="student">Student</option>
                <option value="librarian">Librarian</option>
                <option value="admin">Admin</option>
              </select>
            </td>

            <td>
              <span
                className={`status-badge ${
                  user.isBlocked ? "blocked" : "active"
                }`}
              >
                {user.isBlocked ? "Blocked" : "Active"}
              </span>
            </td>

            <td className="action-buttons">
              <button
                className="btn-block"
                onClick={() => toggleBlock(user._id)}
              >
                {user.isBlocked ? "Unblock" : "Block"}
              </button>

              <button
                className="btn-delete"
                onClick={() => deleteUser(user._id)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

<div className="pagination">
  <button
    disabled={currentPage === 1}
    onClick={() => fetchUsers(currentPage - 1)}
  >
    ← Prev
  </button>

  <span>
    Page {currentPage} of {totalPages}
  </span>

  <button
    disabled={currentPage === totalPages}
    onClick={() => fetchUsers(currentPage + 1)}
  >
    Next →
  </button>
</div>


    </div>
  </Layout>
);
};


export default AdminDashboard;