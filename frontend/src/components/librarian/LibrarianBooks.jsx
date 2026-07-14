import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ChevronRight } from "lucide-react";
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
import "./Librarian.css";

export default function LibrarianBooks() {
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
    <div className="cr-librarian">
      <PageHeader
        eyebrow="Librarian workspace"
        title="Books"
        description="Every title in your library, at a glance."
        actions={
          <Link to="/librarian/upload" className="cr-btn cr-btn--primary cr-btn--md">
            + Add book
          </Link>
        }
      />

      <div className="cr-librarian__toolbar">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or author…"
        />
      </div>

      {loading ? (
        <div className="cr-librarian__loading"><Spinner size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No books yet"
          description="Upload your first PDF to get started."
          actionLabel="Upload a book"
          onAction={() => (window.location.href = "/librarian/upload")}
        />
      ) : (
        <PageSection title={`${filtered.length} books`} description="Click any cover to see who's reading it.">
          <div className="cr-librarian__books-grid">
            {filtered.map((book) => (
              <Link
                to={`/librarian/book/${book._id}/active`}
                key={book._id}
                className="cr-librarian__book-link"
              >
                <BookCard
                  book={book}
                  variant="default"
                  badge={<Badge variant="primary" size="sm">{book.category || "Uncategorized"}</Badge>}
                />
                <span className="cr-librarian__book-link-hint">
                  <Users size={12} /> Active readers <ChevronRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </PageSection>
      )}
    </div>
  );
}