import { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
// import { AppShell, Topbar } from "../components/layout";
import Topbar from "../components/layout/Topbar";
import AppShell from "../components/layout/AppShell";
import AdminOverview from "../components/admin/AdminOverview";
import AdminUsers from "../components/admin/AdminUsers";
import AdminBooks from "../components/admin/AdminBooks";
import AdminCategories from "../components/admin/AdminCategories";
import AdminActivity from "../components/admin/AdminActivity";

export default function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);

  const topbar = () => <Topbar title="Admin console" user={user} />;

  return (
    <PageWrapper>
      <AppShell role="admin" user={user} onLogout={logout} topbar={topbar}>
        <Routes>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="books" element={<AdminBooks />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="activity" element={<AdminActivity />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </AppShell>
    </PageWrapper>
  );
}
