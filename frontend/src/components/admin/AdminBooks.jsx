import { useEffect, useState } from "react";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  Badge,
  BookCard,
  EmptyState,
  PageHeader,
  PageSection,
  SearchInput,
  Spinner,
} from "../ui";
import "./Admin.css";

export default function AdminBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/books");
        setBooks(res.data.books);
      } catch {
        toast.error("Couldn't load the catalog.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = search
    ? books.filter((b) =>
        b.title?.toLowerCase().includes(search.toLowerCase()) ||
        b.author?.toLowerCase().includes(search.toLowerCase()),
      )
    : books;

  return (
    <div className="cr-admin">
      <PageHeader
        eyebrow="Admin console"
        title="Books"
        description="Read-only catalog view. Uploads happen in the librarian workspace."
      />

      <div className="cr-admin__toolbar">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or author…"
        />
      </div>

      {loading ? (
        <div className="cr-admin__loading"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No books yet" description="Once librarians upload, they'll appear here." />
      ) : (
        <PageSection title={`${filtered.length} books`}>
          <div className="cr-admin__books-grid">
            {filtered.map((book) => (
              <BookCard
                key={book._id}
                book={book}
                badge={<Badge variant="primary" size="sm">{book.category || "Uncategorized"}</Badge>}
              />
            ))}
          </div>
        </PageSection>
      )}
    </div>
  );
}