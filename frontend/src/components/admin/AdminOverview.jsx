import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  Users, BookOpen, Activity, AlertOctagon,
  Tags, ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  Card, EmptyState, PageHeader, PageSection, Spinner, Stat,
} from "../ui";
import "./Admin.css";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: 12,
  letterSpacing: "-0.005em",
  padding: "6px 10px",
  boxShadow: "var(--elev-3)",
};

const QUICK_ACTIONS = [
  {
    to: "/admin/users",
    label: "Manage users",
    description: "View and manage all accounts",
    icon: Users,
    color: "var(--color-primary)",
  },
  {
    to: "/admin/books",
    label: "Browse books",
    description: "Inspect the catalog",
    icon: BookOpen,
    color: "var(--color-accent)",
  },
  {
    to: "/admin/categories",
    label: "Categories",
    description: "Organize your catalog",
    icon: Tags,
    color: "var(--color-success)",
  },
  {
    to: "/admin/activity",
    label: "Activity log",
    description: "Review all access events",
    icon: Activity,
    color: "var(--color-info)",
  },
];

export default function AdminOverview() {
  const [stats, setStats] = useState({});
  const [top, setTop] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, b] = await Promise.all([
          API.get("/admin/dashboard"),
          API.get("/admin/top-books"),
        ]);
        setStats(s.data);
        setTop(b.data);
      } catch {
        toast.error("Couldn't load admin overview.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="cr-admin">
        <PageHeader eyebrow="Admin console" title="System overview" description="A quiet pulse on users, books, and access patterns." />
        <div className="cr-admin__loading"><Spinner size={28} /></div>
      </div>
    );
  }

  return (
    <div className="cr-admin">
      <PageHeader
        eyebrow="Admin console"
        title="System overview"
        description="A quiet pulse on users, books, and access patterns."
      />

      <div className="cr-admin__stats">
        <Stat label="Total users" value={stats.totalUsers ?? 0} icon={Users} />
        <Stat label="Total books" value={stats.totalBooks ?? 0} icon={BookOpen} />
        <Stat label="Active access" value={stats.activeAccess ?? 0} icon={Activity} />
        <Stat label="Expired access" value={stats.expiredAccess ?? 0} icon={AlertOctagon} />
      </div>

      {/* ─── Quick Actions ────────────────────────────────── */}
      <PageSection title="Quick actions" description="Navigate the admin panel.">
        <div className="cr-admin__quick-actions">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.to} to={action.to} className="cr-admin__quick-action">
                <span className="cr-admin__quick-action-icon" style={{ backgroundColor: action.color }}>
                  <Icon size={20} />
                </span>
                <div className="cr-admin__quick-action-text">
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </div>
                <ExternalLink size={14} className="cr-admin__quick-action-arrow" />
              </Link>
            );
          })}
        </div>
      </PageSection>

      {/* ─── Top Books Chart ────────────────────────────────── */}
      <PageSection
        title="Most accessed books"
        description="Reader demand, ranked by total accesses."
      >
        <Card padding="lg">
          {top.length === 0 ? (
            <EmptyState title="No reads yet" description="Once readers start, charts will appear." />
          ) : (
            <div className="cr-admin__chart">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={top} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="title"
                    stroke="var(--color-text-muted)"
                    tick={{ fontSize: 11, letterSpacing: "-0.005em" }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke="var(--color-text-muted)"
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-primary-tint)" }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar
                    dataKey="totalAccessCount"
                    fill="var(--color-primary)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </PageSection>
    </div>
  );
}