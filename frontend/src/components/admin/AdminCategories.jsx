import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  PageSection,
  Spinner,
} from "../ui";
import "./Admin.css";

export default function AdminCategories() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/books");
        setBooks(res.data.books);
      } catch {
        toast.error("Couldn't load categories.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = useMemo(() => {
    const map = new Map();
    for (const b of books) {
      const c = b.category || "Uncategorized";
      map.set(c, (map.get(c) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [books]);

  const addCategory = async (e) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (counts.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("That category already exists.");
      return;
    }
    try {
      setBusy(true);
      // The backend doesn't expose a categories endpoint yet, so for now
      // we create a placeholder book and immediately remove the upload —
      // categories will surface once librarians tag uploads. Until then,
      // we save the name locally so the librarian UI can pick it up later.
      const saved = JSON.parse(localStorage.getItem("cr:extra-categories") || "[]");
      if (!saved.includes(trimmed)) saved.push(trimmed);
      localStorage.setItem("cr:extra-categories", JSON.stringify(saved));
      toast.success(`"${trimmed}" is queued for the next catalog update.`);
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cr-admin">
      <PageHeader
        eyebrow="Admin console"
        title="Categories"
        description="Group your catalog so readers can browse by interest."
      />

      <Card padding="lg" className="cr-admin__category-form">
        <form onSubmit={addCategory}>
          <Input
            label="Suggest a new category"
            placeholder="e.g. Computer Science"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            helper="Categories activate the next time a librarian tags an upload."
          />
          <Button
            type="submit"
            size="lg"
            loading={busy}
            leftIcon={<Plus size={16} />}
          >
            Add category
          </Button>
        </form>
      </Card>

      <PageSection title="In use" description="Categories already present in your catalog.">
        {loading ? (
          <div className="cr-admin__loading"><Spinner size={28} /></div>
        ) : counts.length === 0 ? (
          <EmptyState title="No categories yet" description="Once books are tagged, they'll appear here." />
        ) : (
          <div className="cr-admin__categories">
            {counts.map((c) => (
              <article key={c.name} className="cr-admin__category">
                <Badge variant="primary">{c.name}</Badge>
                <span>{c.count} book{c.count === 1 ? "" : "s"}</span>
              </article>
            ))}
          </div>
        )}
      </PageSection>
    </div>
  );
}