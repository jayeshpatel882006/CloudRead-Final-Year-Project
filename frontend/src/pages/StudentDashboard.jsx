import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Hourglass,
  CheckCircle2,
  XCircle,
  Library,
  ShieldCheck,
} from "lucide-react";
import API from "../services/api";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
import Topbar from "../components/layout/Topbar";
import AppShell from "../components/layout/AppShell";

import {
  Badge,
  BookCard,
  EmptyState,
  PageHeader,
  Pagination,
  Spinner,
  Stat,
  Tabs,
} from "../components/ui";
import ActiveReadingCard from "../components/ActiveReadingCard";
import "./StudentDashboard.css";

const STATUS_META = {
  pending: { label: "Pending", variant: "warning", icon: Hourglass },
  approved: { label: "Reading", variant: "success", icon: CheckCircle2 },
  expired: { label: "Expired", variant: "neutral", icon: Hourglass },
  rejected: { label: "Rejected", variant: "danger", icon: XCircle },
};

export default function StudentDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchBooks(1);
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBooks = async (page = 1) => {
    try {
      setLoading(true);
      const res = await API.get(`/books?page=${page}&limit=12`);
      setBooks(res.data.books);
      setCurrentPage(res.data.currentPage);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      toast.error("Couldn't load the library.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await API.get("/access/my");
      setRequests(res.data);
    } catch {
      // silent — main cards still render
    }
  };

  const statusOf = (bookId) => {
    const mine = requests
      .filter(
        (req) =>
          (typeof req.book === "object" ? req.book._id : req.book) === bookId,
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return mine[0]?.status || null;
  };

  const requestAccess = async (bookId) => {
    try {
      setActionLoading(bookId);
      await API.post("/access", { bookId });
      await fetchRequests();
      toast.success("Access request sent.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Request failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const openBook = (bookId) => {
    toast.info("Opening your book…");
    navigate(`/student/book/${bookId}`);
  };

  const filteredBooks = useMemo(() => {
    if (!search) return books;
    const q = search.toLowerCase();
    return books.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q),
    );
  }, [books, search]);

  const tabCounts = useMemo(() => {
    const counts = { all: books.length, reading: 0, pending: 0, finished: 0 };
    for (const book of books) {
      const s = statusOf(book._id);
      if (s === "approved") counts.reading += 1;
      if (s === "pending") counts.pending += 1;
      if (s === "expired" || s === "rejected") counts.finished += 1;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, requests]);

  // Approved requests with populated book data, sorted by least remaining time first
  const activeReadings = useMemo(() => {
    const approved = requests.filter(
      (req) =>
        req.status === "approved" &&
        req.accessEndDate &&
        req.accessStartDate &&
        req.book,
    );
    return approved.sort((a, b) => {
      const endA = new Date(a.accessEndDate).getTime();
      const endB = new Date(b.accessEndDate).getTime();
      return endA - endB; // expiring soonest first
    });
  }, [requests]);

  const filteredByTab = useMemo(() => {
    if (activeTab === "all") return filteredBooks;
    if (activeTab === "reading")
      return filteredBooks.filter((b) => statusOf(b._id) === "approved");
    if (activeTab === "pending")
      return filteredBooks.filter((b) => statusOf(b._id) === "pending");
    if (activeTab === "finished")
      return filteredBooks.filter((b) =>
        ["expired", "rejected"].includes(statusOf(b._id)),
      );
    return filteredBooks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredBooks, activeTab, requests]);

  const topbar = () => (
    <Topbar
      title="Your library"
      search={search}
      onSearchChange={setSearch}
      user={user}
    />
  );

  return (
    <PageWrapper>
      <AppShell role="student" user={user} onLogout={logout} topbar={topbar}>
        <div className="cr-student">
          <PageHeader
            eyebrow={
              user?.name
                ? `Welcome, ${user.name.split(" ")[0]}`
                : "Reading room"
            }
            title="Your library"
            description="Browse the shelf, request access, and keep reading right where you left off."
          />

          <div className="cr-student__stats">
            <Stat label="Books available" value={books.length} icon={Library} />
            <Stat
              label="Active loans"
              value={tabCounts.reading}
              icon={BookOpen}
            />
            <Stat
              label="Pending requests"
              value={tabCounts.pending}
              icon={Hourglass}
            />
            <Stat
              label="Past reads"
              value={tabCounts.finished}
              icon={ShieldCheck}
            />
          </div>

          {/* ── Active Reading Section ───────────────────────── */}
          {activeReadings.length > 0 ? (
            <section className="cr-student__active">
              <header className="cr-student__active-header">
                <div>
                  <h2 className="cr-student__active-title">Active Reading</h2>
                  <p className="cr-student__active-desc">
                    {activeReadings.length}{" "}
                    {activeReadings.length === 1 ? "book" : "books"}{" "}
                    currently on loan
                  </p>
                </div>
              </header>
              <div className="cr-student__active-grid">
                {activeReadings.map((req) => (
                  <ActiveReadingCard key={req._id} request={req} />
                ))}
              </div>
            </section>
          ) : null}

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            items={[
              { value: "all", label: "All books", count: tabCounts.all },
              { value: "reading", label: "Reading", count: tabCounts.reading },
              { value: "pending", label: "Pending", count: tabCounts.pending },
              { value: "finished", label: "Past", count: tabCounts.finished },
            ]}
          />

          {loading ? (
            <div className="cr-student__loading">
              <Spinner size={28} />
              <span>Loading your library…</span>
            </div>
          ) : filteredByTab.length === 0 ? (
            <EmptyState
              title={search ? "No matches" : "Your shelf is quiet"}
              description={
                search
                  ? "Try a different title, author, or category."
                  : "New books will appear here as your library adds them."
              }
              actionLabel={search ? undefined : "Browse the catalog"}
              onAction={search ? undefined : () => setActiveTab("all")}
            />
          ) : (
            <div className="cr-student__grid">
              {filteredByTab.map((book) => {
                const status = statusOf(book._id);
                const meta = status ? STATUS_META[status] : null;
                return (
                  <BookCard
                    key={book._id}
                    book={book}
                    onClick={() =>
                      status === "approved" ? openBook(book._id) : null
                    }
                    badge={
                      meta ? (
                        <Badge variant={meta.variant} dot size="sm">
                          {meta.label}
                        </Badge>
                      ) : null
                    }
                  >
                    <div className="cr-student__card-actions">
                      {status === "approved" ? (
                        <button
                          type="button"
                          className="cr-btn cr-btn--primary cr-btn--md"
                          onClick={(e) => {
                            e.stopPropagation();
                            openBook(book._id);
                          }}
                        >
                          Open book
                        </button>
                      ) : null}
                      {status === "pending" ? (
                        <button
                          className="cr-btn cr-btn--secondary cr-btn--md"
                          disabled
                        >
                          <Hourglass size={14} /> Pending
                        </button>
                      ) : null}
                      {status === "expired" || status === "rejected" ? (
                        <button
                          type="button"
                          className="cr-btn cr-btn--outline cr-btn--md"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestAccess(book._id);
                          }}
                          disabled={actionLoading === book._id}
                        >
                          Request again
                        </button>
                      ) : null}
                      {!status ? (
                        <button
                          type="button"
                          className="cr-btn cr-btn--primary cr-btn--md"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestAccess(book._id);
                          }}
                          disabled={actionLoading === book._id}
                          loading={actionLoading === book._id}
                        >
                          Request access
                        </button>
                      ) : null}
                    </div>
                  </BookCard>
                );
              })}
            </div>
          )}

          {!loading && totalPages > 1 ? (
            <div className="cr-student__pagination">
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onPageChange={fetchBooks}
              />
            </div>
          ) : null}
        </div>
      </AppShell>
    </PageWrapper>
  );
}
