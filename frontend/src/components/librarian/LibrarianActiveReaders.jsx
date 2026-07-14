import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Hourglass, Users } from "lucide-react";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  Avatar,
  Badge,
  BookCover,
  Card,
  EmptyState,
  PageHeader,
  PageSection,
  Spinner,
} from "../ui";
import "./Librarian.css";

export default function LibrarianActiveReaders() {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [active, setActive] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [bookRes, activeRes] = await Promise.all([
          API.get(`/books/${bookId}`).catch(() => ({ data: null })),
          API.get(`/admin/book-active/${bookId}`),
        ]);
        setBook(bookRes.data);
        setActive(activeRes.data || []);
      } catch {
        toast.error("Couldn't load active readers.");
      } finally {
        setLoading(false);
      }
    })();
  }, [bookId]);

  return (
    <div className="cr-librarian">
      <Link to="/librarian/books" className="cr-librarian__back">
        <ArrowLeft size={14} /> Back to all books
      </Link>

      {loading ? (
        <div className="cr-librarian__loading"><Spinner size={28} /></div>
      ) : (
        <>
          <header className="cr-librarian__book-hero">
            <BookCover
              title={book?.title}
              author={book?.author}
              coverUrl={book?.coverUrl}
              size="lg"
            />
            <div>
              <PageHeader
                eyebrow="Active readers"
                title={book?.title || "Book"}
                description={book?.description || "Who's reading this right now."}
              />
              <div className="cr-librarian__book-meta">
                {book?.author ? <Badge variant="neutral">{book.author}</Badge> : null}
                {book?.category ? <Badge variant="primary">{book.category}</Badge> : null}
              </div>
            </div>
          </header>

          <PageSection title="Currently reading" description={`${active.length} reader${active.length === 1 ? "" : "s"}`}>
            {active.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No active readers"
                description="Approve a pending request to see readers here."
              />
            ) : (
              <Card padding="none">
                <ul className="cr-librarian__readers">
                  {active.map((item) => (
                    <li key={item._id} className="cr-librarian__reader">
                      <Avatar name={item.user?.name} size="md" />
                      <div className="cr-librarian__reader-main">
                        <strong>{item.user?.name}</strong>
                        <span><Mail size={12} /> {item.user?.email}</span>
                      </div>
                      <span className="cr-librarian__reader-expiry">
                        <Hourglass size={12} />
                        until {new Date(item.accessEndDate).toLocaleDateString(undefined, {
                          month: "short", day: "numeric",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </PageSection>
        </>
      )}
    </div>
  );
}