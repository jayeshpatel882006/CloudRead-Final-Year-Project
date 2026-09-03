import { useEffect, useMemo, useState } from "react";
import { BookOpen, TrendingUp, Layers, BarChart3, Users, Clock, Trophy } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
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
import "./Librarian.css";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: 12,
  padding: "6px 10px",
  boxShadow: "var(--elev-3)",
};

export default function LibrarianAnalytics() {
  const [books, setBooks] = useState([]);
  const [reading, setReading] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [booksRes, readingRes, insightsRes] = await Promise.all([
          API.get("/books"),
          API.get("/reading/librarian/analytics"),
          API.get("/reading/librarian/insights"),
        ]);
        if (cancelled) return;
        setBooks(booksRes.data.books);
        setReading(readingRes.data);
        setInsights(insightsRes.data);
      } catch {
        if (!cancelled) toast.error("Couldn't load analytics data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryData = useMemo(() => {
    const map = new Map();
    for (const b of books) {
      const cat = b.category || "Uncategorized";
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    const total = books.length || 1;
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [books]);

  const totalBooks = books.length;
  const categoryCount = categoryData.length;
  const maxCategory = categoryData[0]?.name || "—";
  const avgPerCategory = categoryCount > 0 ? (totalBooks / categoryCount).toFixed(1) : "0";

  const stats = reading?.stats || {};
  const hasActivity = (stats.totalReadingSeconds ?? 0) > 0;

  const trendData = (reading?.trends || []).map((d) => ({
    ...d,
    label: formatDayKey(d.date),
    minutes: Math.round((d.readingSeconds || 0) / 60),
  }));

  if (loading) {
    return (
      <div className="cr-librarian">
        <PageHeader eyebrow="Librarian workspace" title="Analytics" description="Reading engagement across your catalog." />
        <div className="cr-librarian__loading"><Spinner size={28} /></div>
      </div>
    );
  }

  return (
    <div className="cr-librarian">
      <PageHeader
        eyebrow="Librarian workspace"
        title="Analytics"
        description="Reading engagement across your catalog, powered by live session data."
      />

      {/* ─── Reading statistics ──────────────────────────────── */}
      <div className="cr-librarian__stats">
        <Stat
          label="Total Reading Time"
          value={formatDuration(stats.totalReadingSeconds)}
          icon={Clock}
        />
        <Stat
          label="Active Readers (24h)"
          value={stats.activeReaders24h ?? 0}
          icon={Users}
        />
        <Stat
          label="Unique Readers"
          value={stats.totalUniqueReaders ?? 0}
          icon={BookOpen}
        />
        <Stat
          label="Most Popular Book"
          value={stats.mostPopularBook?.title ? truncate(stats.mostPopularBook.title, 14) : "—"}
          icon={Trophy}
        />
      </div>

      {/* ─── Smart insights ─────────────────────────────────── */}
      {insights?.insights?.length ? (
        <PageSection
          title="Library Smart Insights"
          description="Calculated insights about how students engage with your books."
        >
          <div className="cr-librarian__insights-grid">
            {insights.insights.map((insight) => (
              <InsightCard key={insight.type} insight={insight} />
            ))}
          </div>
        </PageSection>
      ) : null}

      {/* ─── Reading trend chart ─────────────────────────────── */}
      {hasActivity ? (
        <PageSection
          title="Reading Activity Trend"
          description="Active reading minutes across your books over the last 30 days."
        >
          <Card padding="lg">
            <div className="cr-librarian__chart">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="laMinutes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
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
                    formatter={(value, name) =>
                      name === "minutes"
                        ? [`${value} min`, "Reading time"]
                        : [value, "Active readers"]
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#laMinutes)"
                  />
                  <Area
                    type="monotone"
                    dataKey="activeReaders"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </PageSection>
      ) : null}

      {/* ─── Book engagement + top books ────────────────────── */}
      {(reading?.bookEngagement || []).length > 0 ? (
        <div className="cr-librarian__analytics-grid">
          <PageSection
            title="Book Engagement"
            description="Readers, reading time and average progress per book."
          >
            <Card padding="none">
              <ul className="cr-librarian__engagement">
                {reading.bookEngagement.map((b) => (
                  <li key={b.bookId} className="cr-librarian__engagement-item">
                    <div className="cr-librarian__engagement-info">
                      <strong title={b.title}>{b.title}</strong>
                      <span>
                        {b.uniqueReaders} reader{b.uniqueReaders === 1 ? "" : "s"} ·{" "}
                        {formatDuration(b.totalReadingSeconds)} · {b.averageProgress}% avg progress ·{" "}
                        {b.pagesRead} pages read
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </PageSection>

          <PageSection
            title="Most Active Students"
            description="Top readers of your books."
          >
            <Card padding="none">
              <ul className="cr-librarian__engagement">
                {(reading?.topStudents || []).map((s) => (
                  <li key={s.userId} className="cr-librarian__engagement-item">
                    <div className="cr-librarian__engagement-info">
                      <strong>{s.name}</strong>
                      <span>
                        {formatDuration(s.totalReadingSeconds)} · {s.booksRead} book{s.booksRead === 1 ? "" : "s"} ·{" "}
                        {s.averageProgress}% avg progress
                      </span>
                    </div>
                  </li>
                ))}
                {(reading?.topStudents || []).length === 0 ? (
                  <li className="cr-librarian__engagement-item cr-librarian__engagement-item--empty">
                    No student activity yet
                  </li>
                ) : null}
              </ul>
            </Card>
          </PageSection>
        </div>
      ) : null}

      {/* ─── Category distribution (existing) ───────────────── */}
      <div className="cr-librarian__analytics-grid">
        <Card padding="lg" className="cr-librarian__analytics-card">
          <div className="cr-librarian__analytics-card-header">
            <h3>Category distribution</h3>
            <span>{categoryCount} categories</span>
          </div>

          {categoryData.length === 0 ? (
            <EmptyState title="No data yet" description="Upload books with categories to see distribution." />
          ) : (
            <div className="cr-librarian__category-bar-list">
              {categoryData.map((cat) => (
                <div key={cat.name} className="cr-librarian__category-bar">
                  <div className="cr-librarian__category-bar-header">
                    <strong>{cat.name}</strong>
                    <span>{cat.count} book{cat.count === 1 ? "" : "s"} ({cat.percent}%)</span>
                  </div>
                  <div className="cr-librarian__category-bar-track">
                    <div className="cr-librarian__category-bar-fill" style={{ width: `${cat.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="lg" className="cr-librarian__analytics-card">
          <div className="cr-librarian__analytics-card-header">
            <h3>Catalog metrics</h3>
            <span>At a glance</span>
          </div>

          <div className="cr-librarian__analytics-metrics">
            <div className="cr-librarian__analytics-metric">
              <BookOpen size={16} style={{ color: "var(--color-primary)", marginBottom: 4 }} />
              <strong>{totalBooks}</strong>
              <span>Total books</span>
            </div>
            <div className="cr-librarian__analytics-metric">
              <Layers size={16} style={{ color: "var(--color-accent)", marginBottom: 4 }} />
              <strong>{categoryCount}</strong>
              <span>Categories</span>
            </div>
            <div className="cr-librarian__analytics-metric">
              <TrendingUp size={16} style={{ color: "var(--color-success)", marginBottom: 4 }} />
              <strong>{avgPerCategory}</strong>
              <span>Avg books/category</span>
            </div>
            <div className="cr-librarian__analytics-metric">
              <BarChart3 size={16} style={{ color: "var(--color-info)", marginBottom: 4 }} />
              <strong>{maxCategory}</strong>
              <span>Largest category</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function truncate(text, max) {
  const s = String(text || "");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}