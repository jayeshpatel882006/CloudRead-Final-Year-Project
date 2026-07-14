import { useEffect, useMemo, useState } from "react";
import { Check, X, Hourglass } from "lucide-react";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  SearchInput,
  Spinner,
  Tabs,
} from "../ui";
import "./Librarian.css";

const STATUS_META = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  expired: { label: "Expired", variant: "neutral" },
};

export default function LibrarianApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await API.get("/access");
      setRequests(res.data);
    } catch {
      toast.error("Couldn't load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, expired: 0 };
    for (const r of requests) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const base = requests.filter((r) => r.status === activeTab);
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(
      (r) =>
        r.user?.name?.toLowerCase().includes(q) ||
        r.book?.title?.toLowerCase().includes(q),
    );
  }, [requests, activeTab, search]);

  const approve = async (id) => {
    try {
      setBusyId(id);
      const t = toast.loading("Approving…");
      await API.put(`/access/approve/${id}`);
      toast.update(t, {
        render: "Approved.",
        type: "success",
        isLoading: false,
        autoClose: 1800,
      });
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Approval failed.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id) => {
    try {
      setBusyId(id);
      await API.put(`/access/reject/${id}`);
      toast.success("Rejected.");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Rejection failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="cr-librarian">
      <PageHeader
        eyebrow="Librarian workspace"
        title="Approvals"
        description="Review and respond to reader requests."
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          { value: "pending", label: "Pending", count: counts.pending },
          { value: "approved", label: "Approved", count: counts.approved },
          { value: "rejected", label: "Rejected", count: counts.rejected },
          { value: "expired", label: "Expired", count: counts.expired },
        ]}
      />

      <div className="cr-librarian__toolbar">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by reader or book…"
        />
      </div>

      {loading ? (
        <div className="cr-librarian__loading"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description={
            activeTab === "pending"
              ? "Your queue is clear. New requests will appear here."
              : `No ${activeTab} requests yet.`
          }
        />
      ) : (
        <Card padding="none" className="cr-librarian__list">
          <ul className="cr-librarian__items">
            {filtered.map((req) => {
              const meta = STATUS_META[req.status];
              const busy = busyId === req._id;
              return (
                <li key={req._id} className="cr-librarian__item">
                  <Avatar name={req.user?.name} size="md" />
                  <div className="cr-librarian__item-main">
                    <strong>{req.user?.name}</strong>
                    <span>requested <em>{req.book?.title}</em></span>
                    <span className="cr-librarian__item-time">
                      {new Date(req.createdAt).toLocaleString(undefined, {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {meta ? (
                    <Badge variant={meta.variant} dot size="md">{meta.label}</Badge>
                  ) : null}
                  {req.status === "pending" ? (
                    <div className="cr-librarian__item-actions">
                      <button
                        type="button"
                        className="cr-btn cr-btn--secondary cr-btn--md"
                        onClick={() => reject(req._id)}
                        disabled={busy}
                      >
                        <X size={14} /> Reject
                      </button>
                      <button
                        type="button"
                        className="cr-btn cr-btn--primary cr-btn--md"
                        onClick={() => approve(req._id)}
                        disabled={busy}
                        loading={busy}
                      >
                        <Check size={14} /> Approve
                      </button>
                    </div>
                  ) : null}
                  {req.status === "approved" && req.accessEndDate ? (
                    <span className="cr-librarian__item-expires">
                      <Hourglass size={14} />
                      until {new Date(req.accessEndDate).toLocaleDateString(undefined, {
                        month: "short", day: "numeric",
                      })}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}