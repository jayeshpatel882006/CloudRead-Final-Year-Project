import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Hourglass,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  ArrowRight,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import API from "../services/api";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
import Topbar from "../components/layout/Topbar";
import AppShell from "../components/layout/AppShell";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  Spinner,
  Tabs,
  Button,
} from "../components/ui";
import BookCover from "../components/ui/BookCover";
import RequestAccessDialog from "../components/student/RequestAccessDialog";
import "./StudentRequests.css";

const STATUS_META = {
  pending: { label: "Pending", variant: "warning", icon: Hourglass },
  approved: { label: "Approved", variant: "success", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "danger", icon: XCircle },
  expired: { label: "Expired", variant: "neutral", icon: Clock },
};

const TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

export default function StudentRequests() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [requestBook, setRequestBook] = useState(null);

  const load = useCallback(
    async (p = 1, status = activeTab) => {
      setLoading(true);
      try {
        const res = await API.get("/access/my", {
          params: { status, page: p, limit: 10 },
        });
        setRequests(res.data.requests);
        setCounts(res.data.counts);
        setTotalPages(res.data.totalPages);
        setPage(res.data.currentPage);
      } catch {
        toast.error("Couldn't load your requests.");
      } finally {
        setLoading(false);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Refresh when the tab becomes active again (cheap, no constant polling).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load(page, activeTab);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [page, activeTab, load]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const daysLeft = (r) =>
    Math.max(0, Math.ceil((new Date(r.accessEndDate).getTime() - Date.now()) / 86400000));

  const topbar = ({ onMenuClick }) => (
    <Topbar
      title="My requests"
      user={user}
      onMenuClick={onMenuClick}
      notificationCount={
        (counts?.pending || 0) > 0 ? counts.pending : undefined
      }
    />
  );

  const emptyCopy = {
    all: {
      title: "No requests yet",
      description: "Browse the library and request a book to see your history here.",
    },
    pending: { title: "Nothing pending", description: "You have no requests awaiting review." },
    approved: { title: "No active approvals", description: "Approved books will appear here." },
    rejected: { title: "No rejected requests", description: "Rejected requests will appear here." },
    expired: { title: "No expired access", description: "Expired access will appear here." },
  }[activeTab];

  return (
    <PageWrapper>
      <AppShell role="student" user={user} onLogout={logout} topbar={topbar}>
        <div className="cr-student-requests">
          <PageHeader
            eyebrow="Your reading room"
            title="Requests & History"
            description="Track every access request — pending, approved, rejected or expired."
          />

          <Tabs
            value={activeTab}
            onValueChange={switchTab}
            items={TABS.map((t) => ({
              ...t,
              count: counts ? counts[t.value] : undefined,
            }))}
          />

          {loading ? (
            <div className="cr-sr__loading">
              <Spinner size={28} />
              <span>Loading your requests…</span>
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={emptyCopy.title}
              description={emptyCopy.description}
              actionLabel={activeTab === "all" ? "Browse the library" : undefined}
              onAction={activeTab === "all" ? () => navigate("/student") : undefined}
            />
          ) : (
            <>
              <div className="cr-sr__list">
                {requests.map((r) => {
                  const meta = STATUS_META[r.status] || STATUS_META.pending;
                  const Icon = meta.icon;
                  const book = typeof r.book === "object" && r.book ? r.book : {};
                  const requested = new Date(r.requestDate || r.createdAt).toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric", year: "numeric" },
                  );
                  return (
                    <Card key={r._id} padding="lg" className="cr-sr__card">
                      <div className="cr-sr__card-top">
                        <div className="cr-sr__card-book">
                          <BookCover title={book.title} author={book.author} />
                          <div className="cr-sr__card-info">
                            <h3 className="cr-sr__card-title" title={book.title}>
                              {book.title || "Untitled"}
                            </h3>
                            <p className="cr-sr__card-author">{book.author || "Unknown author"}</p>
                            <span className="cr-sr__card-date">
                              <CalendarDays size={12} /> Requested {requested}
                            </span>
                          </div>
                        </div>
                        <Badge variant={meta.variant} dot>
                          <Icon size={12} /> {meta.label}
                        </Badge>
                      </div>

                      {/* Contextual body per status */}
                      {r.status === "pending" ? (
                        <p className="cr-sr__status-note">
                          Waiting for librarian approval — we'll update this request
                          as soon as it's reviewed.
                        </p>
                      ) : r.status === "approved" ? (
                        <p className="cr-sr__status-note cr-sr__status-note--success">
                          <CheckCircle2 size={14} />
                          Access granted for 7 days
                          {r.accessEndDate
                            ? ` — expires in ${daysLeft(r)} day${daysLeft(r) === 1 ? "" : "s"} (${new Date(r.accessEndDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })})`
                            : ""}
                          .
                        </p>
                      ) : r.status === "rejected" ? (
                        <p className="cr-sr__status-note cr-sr__status-note--danger">
                          <XCircle size={14} />
                          This request was rejected. You can request the book again.
                        </p>
                      ) : (
                        <p className="cr-sr__status-note">
                          <Clock size={14} />
                          Your access to this book has expired. You can request it again.
                        </p>
                      )}

                      {r.studentMessage ? (
                        <div className="cr-sr__message">
                          <MessageSquare size={13} />
                          <span>
                            <strong>Your message:</strong> “{r.studentMessage}”
                          </span>
                        </div>
                      ) : null}

                      {r.status === "rejected" && r.librarianResponse ? (
                        <div className="cr-sr__message cr-sr__message--response">
                          <MessageSquare size={13} />
                          <span>
                            <strong>Librarian response:</strong> “{r.librarianResponse}”
                          </span>
                        </div>
                      ) : null}

                      <div className="cr-sr__card-actions">
                        {r.status === "approved" && r.accessEndDate
                          ? (() => {
                              const dl = daysLeft(r);
                              if (dl > 0) {
                                return (
                                  <Button
                                    rightIcon={<ArrowRight size={15} />}
                                    onClick={() => navigate(`/student/book/${book._id}`)}
                                  >
                                    Read Book
                                  </Button>
                                );
                              }
                              return (
                                <Button
                                  variant="outline"
                                  rightIcon={<ArrowRight size={15} />}
                                  onClick={() => setRequestBook(book)}
                                >
                                  Request Access Again
                                </Button>
                              );
                            })()
                          : null}
                        {(r.status === "rejected" || r.status === "expired") ? (
                          <Button
                            variant={r.status === "rejected" ? "outline" : "primary"}
                            rightIcon={<ArrowRight size={15} />}
                            onClick={() => setRequestBook(book)}
                          >
                            {r.status === "rejected" ? "Request Again" : "Request Access Again"}
                          </Button>
                        ) : null}
                      </div>
                    </Card>
                  );
                })}
              </div>

              {totalPages > 1 ? (
                <div className="cr-sr__pagination">
                  <Pagination page={page} totalPages={totalPages} onPageChange={(p) => load(p, activeTab)} />
                </div>
              ) : null}
            </>
          )}
        </div>
      </AppShell>

      <RequestAccessDialog
        open={Boolean(requestBook)}
        onClose={() => setRequestBook(null)}
        book={requestBook}
        onSubmitted={() => load(page, activeTab)}
      />
    </PageWrapper>
  );
}