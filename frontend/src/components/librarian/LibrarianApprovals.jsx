import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, Eye, Hourglass, FileText, Calendar } from "lucide-react";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  PageHeader,
  Pagination,
  SearchInput,
  Spinner,
  Tabs,
  Textarea,
} from "../ui";
import "./Librarian.css";

const STATUS_META = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
  expired: { label: "Expired", variant: "neutral" },
};

const PAGE_SIZE = 10;
const MAX_RESPONSE_LENGTH = 500;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function LibrarianApprovals() {
  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [busyId, setBusyId] = useState(null);

  // Dialog state
  const [detailsRequest, setDetailsRequest] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [responseText, setResponseText] = useState("");

  const load = useCallback(async (tab = activeTab, page = currentPage) => {
    try {
      setLoading(true);
      const res = await API.get("/access", {
        params: { status: tab, page, limit: PAGE_SIZE },
      });
      setRequests(res.data.requests || []);
      setCounts(res.data.counts || {});
      setCurrentPage(res.data.currentPage || 1);
      setTotalPages(res.data.totalPages || 1);
      setTotalRequests(res.data.totalRequests || 0);
    } catch {
      toast.error("Couldn't load requests.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search) return requests;
    const q = search.toLowerCase();
    return requests.filter(
      (r) =>
        r.user?.name?.toLowerCase().includes(q) ||
        r.book?.title?.toLowerCase().includes(q),
    );
  }, [requests, search]);

  const closeDialogs = () => {
    setDetailsRequest(null);
    setApproveTarget(null);
    setRejectTarget(null);
    setResponseText("");
  };

  const approve = async (id, response) => {
    try {
      setBusyId(id);
      const t = toast.loading("Approving…");
      await API.put(`/access/approve/${id}`, {
        response: response?.trim() || undefined,
      });
      toast.update(t, {
        render: "Approved.",
        type: "success",
        isLoading: false,
        autoClose: 1800,
      });
      closeDialogs();
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Approval failed.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id, response) => {
    try {
      setBusyId(id);
      await API.put(`/access/reject/${id}`, { response: response.trim() });
      toast.success("Rejected.");
      closeDialogs();
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
        description="Review and respond to reader requests. Approved access lasts 7 days."
      />

      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          setActiveTab(tab);
          setCurrentPage(1);
          setSearch("");
        }}
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
        <>
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
                      <span>
                        requested <em>{req.book?.title}</em>
                      </span>
                      {req.studentMessage ? (
                        <span className="cr-librarian__item-message">
                          “{req.studentMessage}”
                        </span>
                      ) : null}
                      <span className="cr-librarian__item-time">
                        {formatDate(req.createdAt)}
                      </span>
                    </div>
                    {meta ? (
                      <Badge variant={meta.variant} dot size="md">
                        {meta.label}
                      </Badge>
                    ) : null}
                    <button
                      type="button"
                      className="cr-btn cr-btn--ghost cr-btn--md cr-librarian__item-detail"
                      onClick={() => setDetailsRequest(req)}
                      aria-label="View request details"
                    >
                      <Eye size={15} /> Details
                    </button>
                    {req.status === "pending" ? (
                      <div className="cr-librarian__item-actions">
                        <button
                          type="button"
                          className="cr-btn cr-btn--outline cr-btn--md"
                          onClick={() => {
                            setResponseText("");
                            setRejectTarget(req);
                          }}
                          disabled={busy}
                        >
                          <X size={14} /> Reject
                        </button>
                        <button
                          type="button"
                          className="cr-btn cr-btn--primary cr-btn--md"
                          onClick={() => {
                            setResponseText("");
                            setApproveTarget(req);
                          }}
                          disabled={busy}
                        >
                          <Check size={14} /> Approve
                        </button>
                      </div>
                    ) : null}
                    {req.status === "approved" && req.accessEndDate ? (
                      <span className="cr-librarian__item-expires">
                        <Hourglass size={14} />
                        until{" "}
                        {new Date(req.accessEndDate).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
          {totalPages > 1 ? (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          ) : null}
          <p className="cr-librarian__pagination-note">
            {totalRequests} {totalRequests === 1 ? "request" : "requests"} total
          </p>
        </>
      )}

      {/* ── Details dialog ─────────────────────────────────────────── */}
      <Dialog
        open={Boolean(detailsRequest)}
        onClose={closeDialogs}
        title="Request Details"
        description="Review the reader's request before deciding."
        size="md"
      >
        {detailsRequest ? (
          <div className="cr-approval-dialog">
            <div className="cr-approval-dialog__block">
              <h4><Avatar name={detailsRequest.user?.name} size="sm" /> Reader</h4>
              <div className="cr-approval-dialog__row">
                <span>{detailsRequest.user?.name || "Unknown"}</span>
                <span className="cr-approval-dialog__muted">
                  {detailsRequest.user?.email}
                </span>
              </div>
            </div>
            <div className="cr-approval-dialog__block">
              <h4><FileText size={14} /> Book</h4>
              <div className="cr-approval-dialog__row">
                <span>{detailsRequest.book?.title}</span>
                <span className="cr-approval-dialog__muted">
                  {detailsRequest.book?.author}
                  {detailsRequest.book?.category
                    ? ` · ${detailsRequest.book.category}`
                    : ""}
                </span>
              </div>
            </div>
            <div className="cr-approval-dialog__block">
              <h4><Calendar size={14} /> Request</h4>
              <div className="cr-approval-dialog__row">
                <span>{formatDate(detailsRequest.createdAt)}</span>
              </div>
              {detailsRequest.studentMessage ? (
                <p className="cr-approval-dialog__quote">
                  “{detailsRequest.studentMessage}”
                </p>
              ) : (
                <p className="cr-approval-dialog__muted">
                  No message from the student.
                </p>
              )}
            </div>
            {detailsRequest.status === "pending" ? (
              <div className="cr-approval-dialog__actions">
                <Button
                  variant="outline"
                  leftIcon={<X size={15} />}
                  onClick={() => {
                    setDetailsRequest(null);
                    setResponseText("");
                    setRejectTarget(detailsRequest);
                  }}
                >
                  Reject
                </Button>
                <Button
                  leftIcon={<Check size={15} />}
                  onClick={() => {
                    setDetailsRequest(null);
                    setResponseText("");
                    setApproveTarget(detailsRequest);
                  }}
                >
                  Approve
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      {/* ── Approve dialog ─────────────────────────────────────────── */}
      <Dialog
        open={Boolean(approveTarget)}
        onClose={closeDialogs}
        title="Approve Access Request"
        description="The student gets secure access for 7 days."
        size="sm"
      >
        {approveTarget ? (
          <form
            className="cr-approval-dialog"
            onSubmit={(e) => {
              e.preventDefault();
              approve(approveTarget._id, responseText);
            }}
          >
            <div className="cr-approval-dialog__summary">
              <Avatar name={approveTarget.user?.name} size="md" />
              <div>
                <strong>{approveTarget.user?.name}</strong>
                <span>
                  <em>{approveTarget.book?.title}</em> · Access duration: 7 days
                </span>
              </div>
            </div>
            <Textarea
              label="Message to student (optional)"
              value={responseText}
              onChange={(e) =>
                setResponseText(e.target.value.slice(0, MAX_RESPONSE_LENGTH))
              }
              placeholder="e.g. Your access has been approved. Happy reading!"
              rows={3}
              helper={`${responseText.length}/${MAX_RESPONSE_LENGTH}`}
            />
            <div className="cr-approval-dialog__actions">
              <Button type="button" variant="ghost" onClick={closeDialogs}>
                Cancel
              </Button>
              <Button type="submit" loading={busyId === approveTarget._id}>
                Approve Access
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      {/* ── Reject dialog ──────────────────────────────────────────── */}
      <Dialog
        open={Boolean(rejectTarget)}
        onClose={closeDialogs}
        title="Reject Access Request"
        description="A reason helps the student understand the decision."
        size="sm"
      >
        {rejectTarget ? (
          <form
            className="cr-approval-dialog"
            onSubmit={(e) => {
              e.preventDefault();
              reject(rejectTarget._id, responseText);
            }}
          >
            <div className="cr-approval-dialog__summary">
              <Avatar name={rejectTarget.user?.name} size="md" />
              <div>
                <strong>{rejectTarget.user?.name}</strong>
                <span>
                  <em>{rejectTarget.book?.title}</em>
                </span>
              </div>
            </div>
            <Textarea
              label="Reason for rejection (required)"
              value={responseText}
              onChange={(e) =>
                setResponseText(e.target.value.slice(0, MAX_RESPONSE_LENGTH))
              }
              placeholder="e.g. This book is currently reserved for another course."
              rows={3}
              helper={`${responseText.length}/${MAX_RESPONSE_LENGTH}`}
            />
            <div className="cr-approval-dialog__actions">
              <Button type="button" variant="ghost" onClick={closeDialogs}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                loading={busyId === rejectTarget._id}
                disabled={!responseText.trim()}
              >
                Reject Request
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}