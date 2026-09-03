import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Clock,
  Flame,
  FileText,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import API from "../services/api";
import { toast } from "react-toastify";
import { AuthContext } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
import Topbar from "../components/layout/Topbar";
import AppShell from "../components/layout/AppShell";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageSection,
  Spinner,
  Stat,
} from "../components/ui";
import BookCover from "../components/ui/BookCover";
import InsightCard from "../components/analytics/InsightCard";
import { formatDuration, formatDayKey } from "../utils/format";
import "./StudentAnalytics.css";

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  fontSize: 12,
  padding: "6px 10px",
  boxShadow: "var(--elev-3)",
};

export default function StudentAnalytics() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [analyticsRes, insightsRes] = await Promise.all([
          API.get("/reading/student/analytics"),
          API.get("/reading/student/insights"),
        ]);
        if (cancelled) return;
        setData(analyticsRes.data);
        setInsights(insightsRes.data);
      } catch {
        if (cancelled) return;
        setLoadError(true);
        toast.error("Couldn't load your reading analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = data?.stats || {};
  const hasActivity = (stats.totalReadingSeconds ?? 0) > 0;

  // Chart rows: UTC day key → short local label.
  const chartData = (data?.weeklyActivity || []).map((d) => ({
    ...d,
    label: formatDayKey(d.date),
    minutes: Math.round((d.readingSeconds || 0) / 60),
  }));

  const topbar = () => (
    <Topbar title="Reading analytics" user={user} />
  );

  return (
    <PageWrapper>
      <AppShell role="student" user={user} onLogout={logout} topbar={topbar}>
        <div className="cr-student-analytics">
          <PageHeader
            eyebrow="Your reading room"
            title="Reading Analytics"
            description="Understand your reading habits and track your progress across every book."
          />

          {loading ? (
            <div className="cr-sa__loading">
              <Spinner size={28} />
              <span>Crunching your reading data…</span>
            </div>
          ) : loadError ? (
            <EmptyState
              title="Couldn't load analytics"
              description="Something went wrong while fetching your reading data. Please try again."
              actionLabel="Retry"
              onAction={() => window.location.reload()}
            />
          ) : !hasActivity ? (
            <>
              <EmptyState
                icon={BookOpen}
                title="Start Reading to Unlock Your Analytics"
                description="Your reading insights, streaks and charts will appear here once you start exploring books. Every page you read is tracked securely on the server."
                actionLabel="Browse the library"
                onAction={() => navigate("/student")}
              />
              {insights?.insights?.length ? (
                <PageSection
                  title="Smart Reading Insights"
                  description="Personalized insights generated from your reading activity."
                >
                  <div className="cr-sa__insights-grid">
                    {insights.insights.map((insight) => (
                      <InsightCard key={insight.type} insight={insight} />
                    ))}
                  </div>
                </PageSection>
              ) : null}
            </>
          ) : (
            <>
              {/* ── Key statistics ───────────────────────────────── */}
              <div className="cr-sa__stats">
                <Stat
                  label="Books Completed"
                  value={stats.booksCompleted ?? 0}
                  icon={BookOpen}
                />
                <Stat
                  label="Total Reading Time"
                  value={formatDuration(stats.totalReadingSeconds)}
                  icon={Clock}
                />
                <Stat
                  label="Current Streak"
                  value={`${stats.currentStreak ?? 0} day${(stats.currentStreak ?? 0) === 1 ? "" : "s"}`}
                  icon={Flame}
                />
                <Stat
                  label="Pages Read"
                  value={stats.pagesRead ?? 0}
                  icon={FileText}
                />
              </div>

              {/* ── Smart insights ───────────────────────────────── */}
              {insights?.insights?.length ? (
                <PageSection
                  title="Smart Reading Insights"
                  description="Personalized insights generated from your reading activity."
                  actions={
                    <span className="cr-sa__insights-note">
                      <Sparkles size={13} /> Calculated from your sessions
                    </span>
                  }
                >
                  <div className="cr-sa__insights-grid">
                    {insights.insights.map((insight) => (
                      <InsightCard key={insight.type} insight={insight} />
                    ))}
                  </div>
                </PageSection>
              ) : null}

              {/* ── Weekly activity chart ────────────────────────── */}
              <PageSection
                title="Weekly Reading Activity"
                description="Active reading minutes over the last 7 days."
              >
                <Card padding="lg">
                  {chartData.every((d) => d.readingSeconds === 0) ? (
                    <EmptyState
                      title="No reading this week"
                      description="Your chart will fill in as you read. Hidden-tab time is never counted."
                    />
                  ) : (
                    <div className="cr-sa__chart">
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                          <defs>
                            <linearGradient id="saReading" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="var(--color-text-muted)"
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            stroke="var(--color-text-muted)"
                            tick={{ fontSize: 11 }}
                            allowDecimals={false}
                          />
                          <Tooltip
                            cursor={{ stroke: "var(--color-border-strong)" }}
                            contentStyle={tooltipStyle}
                            formatter={(value) => [`${value} min`, "Active reading"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="minutes"
                            stroke="var(--color-primary)"
                            strokeWidth={2}
                            fill="url(#saReading)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>
              </PageSection>

              {/* ── Continue reading ─────────────────────────────── */}
              {data?.readingProgress?.length ? (
                <PageSection
                  title="Continue Reading"
                  description="Pick up right where you left off."
                >
                  <div className="cr-sa__continue-grid">
                    {data.readingProgress.map((book) => (
                      <Card key={book.bookId} padding="lg" className="cr-sa__continue-card">
                        <div className="cr-sa__continue-top">
                          <BookCover title={book.title} author={book.author} />
                          <div className="cr-sa__continue-info">
                            <h3 className="cr-sa__continue-title" title={book.title}>
                              {book.title}
                            </h3>
                            <p className="cr-sa__continue-author">{book.author}</p>
                          </div>
                        </div>

                        <div className="cr-sa__progress">
                          <div className="cr-sa__progress-track">
                            <span
                              className="cr-sa__progress-fill"
                              style={{ width: `${Math.min(100, Math.max(0, book.progressPercentage))}%` }}
                            />
                          </div>
                          <div className="cr-sa__progress-meta">
                            <span>{book.progressPercentage}%</span>
                            <span>
                              Page {book.highestPageReached || book.lastPage} / {book.totalPages}
                            </span>
                          </div>
                        </div>

                        <Button
                          fullWidth
                          rightIcon={<ArrowRight size={15} />}
                          onClick={() => navigate(`/student/book/${book.bookId}`)}
                        >
                          Continue Reading
                        </Button>
                      </Card>
                    ))}
                  </div>
                </PageSection>
              ) : null}

              {/* ── Most read books ──────────────────────────────── */}
              {data?.mostReadBooks?.length ? (
                <PageSection
                  title="Most Read Books"
                  description="Your top titles by reading time."
                >
                  <Card padding="none">
                    <ul className="cr-sa__most-list">
                      {data.mostReadBooks.map((book, i) => (
                        <li key={book.bookId} className="cr-sa__most-item">
                          <span className="cr-sa__most-rank">{i + 1}</span>
                          <BookCover title={book.title} author={book.author} size="sm" />
                          <div className="cr-sa__most-info">
                            <strong title={book.title}>{book.title}</strong>
                            <span>{book.author}</span>
                          </div>
                          <div className="cr-sa__most-meta">
                            <span>
                              <Clock size={12} /> {formatDuration(book.totalReadingSeconds)}
                            </span>
                            <span>
                              <TrendingUp size={12} /> {book.progressPercentage}%
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
        </div>
      </AppShell>
    </PageWrapper>
  );
}