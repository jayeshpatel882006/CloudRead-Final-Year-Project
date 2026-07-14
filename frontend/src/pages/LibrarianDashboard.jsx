import { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
// import { AppShell, Topbar } from "../components/layout";
import Topbar from "../components/layout/Topbar";
import AppShell from "../components/layout/AppShell";
import LibrarianOverview from "../components/librarian/LibrarianOverview";
import LibrarianUpload from "../components/librarian/LibrarianUpload";
import LibrarianApprovals from "../components/librarian/LibrarianApprovals";
import LibrarianBooks from "../components/librarian/LibrarianBooks";
import LibrarianActiveReaders from "../components/librarian/LibrarianActiveReaders";
import LibrarianAnalytics from "../components/librarian/LibrarianAnalytics";

export default function LibrarianDashboard() {
  const { user, logout } = useContext(AuthContext);

  const topbar = () => (
    <Topbar title="Librarian workspace" search="" user={user} />
  );

  return (
    <PageWrapper>
      <AppShell role="librarian" user={user} onLogout={logout} topbar={topbar}>
        <Routes>
          <Route index element={<LibrarianOverview />} />
          <Route path="upload" element={<LibrarianUpload />} />
          <Route path="approvals" element={<LibrarianApprovals />} />
          <Route path="books" element={<LibrarianBooks />} />
          <Route
            path="book/:bookId/active"
            element={<LibrarianActiveReaders />}
          />
          <Route path="analytics" element={<LibrarianAnalytics />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </AppShell>
    </PageWrapper>
  );
}
