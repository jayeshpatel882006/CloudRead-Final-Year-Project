import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Clock,
  Users,
  CalendarDays,
  CalendarRange,
  Trophy,
  BookOpen,
} from "lucide-react";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  Card,
  EmptyState,
  PageHeader,
  PageSection,
  Spinner,
  Stat,
} from "../ui";
import InsightCard from "../analytics/InsightCard";
import { formatDuration, formatDayKey } from "../../utils/format";
import "./Admin.css";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: 12,
  padding: "6px 10px",
  boxShadow: "var(--elev-3)",
};

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, i] = await Promise.all([
          API.get("/reading/admin/analytics"),
          API.get("/reading/admin/insights"),
        ]);
        if (cancelled) return;
        setData(a.data);
        setInsights(i.data);
      } catch {
        if (!cancelled) toast.error("Couldn't load platform analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = data?.stats || {};
  const hasActivity = (stats.platformReadingSeconds ?? 0) > 0;

  const trendData = (data?.trends || []).map((d) => ({
    ...d,
    label: formatDayKey(d.date),
    minutes: Math.round((d.readingSeconds || 0) / 60),
  }));

  const peakData = (data?.peakHours || []).map((p) => ({
    label: p.label,
    count: p.count,
  }));

  return (
    <div className="cr-admin">
      <PageHeader
        eyebrow="Admin console"
        title="Reading Analytics"
        description="Platform-wide reading activity, engagement and smart insights."
      />

      {loading ? (
        <div className="cr-admin__loading"><Spinner size={28} /></div>
      ) : (
        <>
          {/* ─── Platform statistics ─────────────────────────────── */}
          <div className="cr-admin__stats">
            <Stat
              label="Platform Reading Time"
              value={formatDuration(stats.platformReadingSeconds)}
              icon={Clock}
            />
            <Stat
              label="Daily Active Readers"
              value={stats.dailyActiveReaders ?? 0}
              icon={Users}
            />
            <Stat
              label="Weekly Active Readers"
              value={stats.weeklyActiveReaders ?? 0}
              icon={CalendarDays}
            />
            <Stat
              label="Monthly Active Readers"
              value={stats.monthlyActiveReaders ?? 0}
              icon={CalendarRange}
            />
          </div>

          {/* ─── Smart insights ──────────────────────────────────── */}
          {insights?.insights?.length ? (
            <PageSection
              title="Platform Smart Insights"
              description="Calculated insights across every reading session on CloudRead."
            >
              <div className="cr-admin__insights-grid">
                {insights.insights.map((insight) => (
                  <InsightCard key={insight.type} insight={insight} />
                ))}
              </div>
            </PageSection>
          ) : null}

          {!hasActivity ? (
            <EmptyState
              icon={BookOpen}
              title="No reading activity yet"
              description="Once students open approved books, platform analytics will appear here."
            />
          ) : (
            <>
              {/* ─── 30-day reading trend ─────────────────────────── */}
              <PageSection
                title="Platform Reading Trends"
                description="Reading minutes and active readers over the last 30 days."
              >
                <Card padding="lg">
                  <div className="cr-admin__chart">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="aaMinutes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="aaReaders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="label"
                          stroke="var(--color-text-muted)"
                          tick={{ fontSize: 10 }}
                          interval={4}
                        />
                        <YAxis
                          stroke="var(--color-text-muted)"
                          tick={{ fontSize: 10 }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          cursor={{ stroke: "var(--color-border-strong)" }}
                          contentStyle={tooltipStyle}
                        />
                        <Area
                          type="monotone"
                          dataKey="minutes"
                          name="Reading minutes"
                          stroke="var(--color-primary)"
                          strokeWidth={2}
                          fill="url(#aaMinutes)"
                        />
                        <Area
                          type="monotone"
                          dataKey="activeReaders"
                          name="Active readers"
                          stroke="var(--color-accent)"
                          strokeWidth={2}
                          fill="url(#aaReaders)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </PageSection>

              <div className="cr-admin__analytics-grid">
                {/* ─── Peak reading hours ─────────────────────────── */}
                <PageSection
                  title="Peak Reading Hours"
                  description="When readers are most active (server UTC)."
                >
                  <Card padding="lg">
                    <div className="cr-admin__chart">
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={peakData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="var(--color-text-muted)"
                            tick={{ fontSize: 10 }}
                            interval={2}
                          />
                          <YAxis
                            stroke="var(--color-text-muted)"
                            tick={{ fontSize: 10 }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            cursor={{ fill: "var(--color-primary-tint)" }}
                            contentStyle={tooltipStyle}
                          />
                          <Bar dataKey="count" name="Heartbeats" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </PageSection>

                {/* ─── Top books ──────────────────────────────────── */}
                <PageSection
                  title="Most Popular Books"
                  description="Ranked by unique readers and reading time."
                >
                  <Card padding="none">
                    <ul className="cr-admin__top-list">
                      {(data?.topBooks || []).slice(0, 5).map((book, i) => (
                        <li key={book.bookId} className="cr-admin__top-item">
                          <span className="cr-admin__top-rank">
                            {i === 0 ? <Trophy size={14} /> : i + 1}
                          </span>
                          <div className="cr-admin__top-info">
                            <strong title={book.title}>{book.title}</strong>
                            <span>
                              {book.uniqueReaders} reader{book.uniqueReaders === 1 ? "" : "s"} ·{" "}
                              {formatDuration(book.totalReadingSeconds)} · {book.averageProgress}% avg
                            </span>
                          </div>
                        </li>
                      ))}
                      {(data?.topBooks || []).length === 0 ? (
                        <li className="cr-admin__top-item cr-admin__top-item--empty">
                          No book activity yet
                        </li>
                      ) : null}
                    </ul>
                  </Card>
                </PageSection>
              </div>

              {/* ─── Most engaged students ───────────────────────── */}
              {data?.topStudents?.length ? (
                <PageSection
                  title="Most Engaged Students"
                  description="Top students by reading time and consistency."
                >
                  <Card padding="none">
                    <ul className="cr-admin__top-list">
                      {data.topStudents.map((s, i) => (
                        <li key={s.userId} className="cr-admin__top-item">
                          <span className="cr-admin__top-rank">{i + 1}</span>
                          <div className="cr-admin__top-info">
                            <strong>{s.name}</strong>
                            <span>
                              {formatDuration(s.totalReadingSeconds)} · {s.booksRead} book{s.booksRead === 1 ? "" : "s"} ·{" "}
                              {s.averageProgress}% avg progress · {s.sessionCount} sessions
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </PageSection>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}