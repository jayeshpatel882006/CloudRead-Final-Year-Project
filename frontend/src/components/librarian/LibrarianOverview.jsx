import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Hourglass,
  CheckCircle2,
  ArrowRight,
  UploadCloud,
  ClipboardCheck,
  BarChart3,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  PageSection,
  Spinner,
  Stat,
} from "../ui";
import "./Librarian.css";

const STATUS_META = {
  pending: { label: "Pending", variant: "warning", icon: Hourglass },
  approved: { label: "Approved", variant: "success", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "danger" },
  expired: { label: "Expired", variant: "neutral" },
};

const QUICK_ACTIONS = [
  {
    to: "/librarian/upload",
    label: "Upload a book",
    description: "Add a new title to the catalog",
    icon: UploadCloud,
    color: "var(--color-primary)",
  },
  {
    to: "/librarian/approvals",
    label: "Review requests",
    description: "Approve or reject pending access",
    icon: ClipboardCheck,
    color: "var(--color-accent)",
  },
  {
    to: "/librarian/books",
    label: "Manage books",
    description: "View and organize your catalog",
    icon: BookOpen,
    color: "var(--color-success)",
  },
  {
    to: "/librarian/analytics",
    label: "Analytics",
    description: "Categories and usage insights",
    icon: BarChart3,
    color: "var(--color-info)",
  },
];

export default function LibrarianOverview() {
  const [requests, setRequests] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [reqs, booksRes] = await Promise.all([
          API.get("/access", { params: { limit: 100 } }),
          API.get("/books"),
        ]);
        setRequests(reqs.data.requests);
        setBooks(booksRes.data.books);
      } catch {
        toast.error("Couldn't load overview data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pending = requests.filter((r) => r.status === "pending");
  const active = requests.filter((r) => r.status === "approved");

  const recent = [...requests]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="cr-librarian">
        <PageHeader eyebrow="Librarian workspace" title="Overview" description="A quick read of your catalog, queue, and active loans." />
        <div className="cr-librarian__loading"><Spinner size={28} /></div>
      </div>
    );
  }

  return (
    <div className="cr-librarian">
      <PageHeader
        eyebrow="Librarian workspace"
        title="Overview"
        description="A quick read of your catalog, queue, and active loans."
      />

      {/* ─── Stats ───────────────────────────────────────── */}
      <div className="cr-librarian__stats">
        <Stat label="Books in catalog" value={books.length} icon={BookOpen} />
        <Stat label="Pending requests" value={pending.length} icon={Hourglass} />
        <Stat label="Active loans" value={active.length} icon={CheckCircle2} />
        <Stat label="Categories" value={new Set(books.map(b => b.category).filter(Boolean)).size} icon={TrendingUp} />
      </div>

      {/* ─── Quick Actions ───────────────────────────────── */}
      <PageSection title="Quick actions" description="Common tasks to keep your library moving.">
        <div className="cr-librarian__quick-actions">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.to} to={action.to} className="cr-librarian__quick-action">
                <span className="cr-librarian__quick-action-icon" style={{ backgroundColor: action.color }}>
                  <Icon size={20} />
                </span>
                <div className="cr-librarian__quick-action-text">
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </div>
                <ExternalLink size={14} className="cr-librarian__quick-action-arrow" />
              </Link>
            );
          })}
        </div>
      </PageSection>

      {/* ─── Action Queue ────────────────────────────────── */}
      <PageSection
        title="Action queue"
        description="Requests waiting for your review."
        actions={
          pending.length > 0 ? (
            <Link to="approvals" className="cr-link">
              Open approvals <ArrowRight size={14} />
            </Link>
          ) : null
        }
      >
        {pending.length === 0 ? (
          <EmptyState
            title="Queue is clear"
            description="No pending requests right now. Take a sip of tea."
          />
        ) : (
          <Card padding="none">
            <ul className="cr-librarian__queue">
              {pending.slice(0, 4).map((req) => {
                const meta = STATUS_META[req.status];
                return (
                  <li key={req._id} className="cr-librarian__queue-item">
                    <Avatar name={req.user?.name} size="sm" />
                    <div className="cr-librarian__queue-text">
                      <strong>{req.user?.name}</strong>
                      <span>wants <em>{req.book?.title}</em></span>
                    </div>
                    {meta ? <Badge variant={meta.variant} dot size="sm">{meta.label}</Badge> : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </PageSection>

      {/* ─── Recent Activity ──────────────────────────────── */}
      <PageSection
        title="Recent activity"
        description="The latest access events in your library."
        actions={
          requests.length > 0 ? (
            <Link to="/librarian/approvals" className="cr-link">
              View all <ArrowRight size={14} />
            </Link>
          ) : null
        }
      >
        {recent.length === 0 ? (
          <EmptyState title="No activity yet" description="Activity will appear here once readers start borrowing." />
        ) : (
          <Card padding="none">
            <ul className="cr-librarian__queue">
              {recent.map((req) => {
                const meta = STATUS_META[req.status];
                return (
                  <li key={req._id} className="cr-librarian__queue-item">
                    <Avatar name={req.user?.name} size="sm" />
                    <div className="cr-librarian__queue-text">
                      <strong>{req.user?.name}</strong>
                      <span>{req.book?.title}</span>
                    </div>
                    <span className="cr-librarian__queue-time">
                      {new Date(req.createdAt).toLocaleDateString(undefined, {
                        month: "short", day: "numeric",
                      })}
                    </span>
                    {meta ? <Badge variant={meta.variant} dot size="sm">{meta.label}</Badge> : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </PageSection>
    </div>
  );
}