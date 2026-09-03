import { useEffect, useState } from "react";
import {
  BookOpen, CheckCircle2, XCircle, Hourglass,
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
} from "../ui";
import "./Admin.css";

const ICONS = {
  approved: CheckCircle2,
  rejected: XCircle,
  pending: Hourglass,
};

export default function AdminActivity() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/access", { params: { limit: 100 } });
        const sorted = [...res.data.requests].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        setRequests(sorted);
      } catch {
        toast.error("Couldn't load activity.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = (() => {
    const map = new Map();
    for (const r of requests) {
      const day = new Date(r.createdAt).toLocaleDateString(undefined, {
        weekday: "long", month: "short", day: "numeric",
      });
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(r);
    }
    return Array.from(map.entries());
  })();

  return (
    <div className="cr-admin">
      <PageHeader
        eyebrow="Admin console"
        title="Activity"
        description="Every request and access event, in chronological order."
      />

      {loading ? (
        <div className="cr-admin__loading"><Spinner size={28} /></div>
      ) : grouped.length === 0 ? (
        <EmptyState title="No activity yet" description="Reader activity will appear here as it happens." />
      ) : (
        <div className="cr-admin__activity">
          {grouped.map(([day, items]) => (
            <PageSection key={day} title={day} description={`${items.length} event${items.length === 1 ? "" : "s"}`}>
              <Card padding="none">
                <ul className="cr-admin__activity-list">
                  {items.map((r) => {
                    const Icon = ICONS[r.status] || BookOpen;
                    const variant =
                      r.status === "approved" ? "success" :
                      r.status === "rejected" ? "danger" :
                      "warning";
                    return (
                      <li key={r._id} className="cr-admin__activity-item">
                        <span className={`cr-admin__activity-icon cr-admin__activity-icon--${variant}`}>
                          <Icon size={14} />
                        </span>
                        <Avatar name={r.user?.name} size="sm" />
                        <div className="cr-admin__activity-text">
                          <strong>{r.user?.name}</strong>
                          <span>
                            requested <em>{r.book?.title}</em>
                          </span>
                        </div>
                        <span className="cr-admin__activity-time">
                          {new Date(r.createdAt).toLocaleTimeString(undefined, {
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        <Badge variant={variant} dot size="sm">
                          {r.status}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </PageSection>
          ))}
        </div>
      )}
    </div>
  );
}