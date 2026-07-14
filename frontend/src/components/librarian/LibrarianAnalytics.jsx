import { useEffect, useMemo, useState } from "react";
import { BookOpen, TrendingUp, Layers, BarChart3 } from "lucide-react";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  Card,
  EmptyState,
  PageHeader,
  Spinner,
} from "../ui";
import "./Librarian.css";

export default function LibrarianAnalytics() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/books");
        setBooks(res.data.books);
      } catch {
        toast.error("Couldn't load analytics data.");
      } finally {
        setLoading(false);
      }
    })();
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

  if (loading) {
    return (
      <div className="cr-librarian">
        <PageHeader eyebrow="Librarian workspace" title="Analytics" description="Category distribution and catalog insights." />
        <div className="cr-librarian__loading"><Spinner size={28} /></div>
      </div>
    );
  }

  return (
    <div className="cr-librarian">
      <PageHeader
        eyebrow="Librarian workspace"
        title="Analytics"
        description="Category distribution and catalog insights."
      />

      {/* ─── Metric cards ───────────────────────────────── */}
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
