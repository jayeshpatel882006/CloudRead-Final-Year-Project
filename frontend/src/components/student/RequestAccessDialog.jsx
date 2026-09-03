import { useEffect, useState } from "react";
import { BookOpen, Send } from "lucide-react";
import API from "../../services/api";
import { toast } from "react-toastify";
import { Button, Dialog, Textarea } from "../ui";
import BookCover from "../ui/BookCover";
import "./RequestAccessDialog.css";

const MAX_MESSAGE_LENGTH = 500;

/**
 * RequestAccessDialog — shared "Request Book Access" modal.
 *
 * Used by the student dashboard and the student request-history page. Shows the
 * target book, an optional ≤500-char reason, and submits POST /api/access.
 * On success it calls `onSubmitted()` so the caller can refetch its data.
 */
export default function RequestAccessDialog({
  open,
  onClose,
  book,
  onSubmitted,
}) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset the message each time the dialog opens for a (possibly different) book.
  useEffect(() => {
    if (open) setMessage("");
  }, [open, book?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!book?._id) return;
    try {
      setSubmitting(true);
      await API.post("/access", {
        bookId: book._id,
        message: message.trim() || undefined,
      });
      toast.success("Access request sent.");
      setMessage("");
      onSubmitted?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Request Book Access"
      description="Tell the librarian why you'd like to read this book."
      size="sm"
    >
      {book ? (
        <form onSubmit={handleSubmit} className="cr-request-dialog">
          <div className="cr-request-dialog__book">
            <BookCover title={book.title} author={book.author} size="sm" />
            <div className="cr-request-dialog__book-info">
              <strong className="cr-request-dialog__title" title={book.title}>
                {book.title}
              </strong>
              <span>{book.author || "Unknown author"}</span>
              {book.category ? <span>{book.category}</span> : null}
            </div>
          </div>

          <Textarea
            label="Message to librarian (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            placeholder="e.g. I need this book for my Cloud Computing semester project."
            rows={3}
            helper={`${message.length}/${MAX_MESSAGE_LENGTH}`}
          />

          <p className="cr-request-dialog__confirm">
            <BookOpen size={14} />
            Your request will be reviewed by the librarian. You'll be notified once
            it's approved.
          </p>

          <div className="cr-request-dialog__actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} leftIcon={<Send size={15} />}>
              Submit Request
            </Button>
          </div>
        </form>
      ) : null}
    </Dialog>
  );
}