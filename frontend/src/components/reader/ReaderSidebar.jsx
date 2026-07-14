// components/reader/ReaderSidebar.jsx
// -----------------------------------------------------------------------------
// CloudRead-branded collapsible left sidebar for the full-screen reader.
// Shows book info, access timer, reading progress, and future feature placeholders.
// Uses design tokens from tokens.css.
// -----------------------------------------------------------------------------

import { useState, useEffect } from "react";
import {
  FiX,
  FiBookmark,
  FiList,
  FiEdit3,
  FiClock,
  FiBook,
  FiCalendar,
} from "react-icons/fi";
import API from "../../services/api";
import BookCover from "../ui/BookCover";

export default function ReaderSidebar({ open, onClose, meta, currentPage, bookId }) {
  const [accessInfo, setAccessInfo] = useState(null);

  // ── Fetch access info for remaining time ─────────────────────
  // Only fetch once per bookId; skip subsequent toggles of sidebar
  useEffect(() => {
    if (!bookId || !open || accessInfo) return;
    let cancelled = false;

    const fetchAccess = async () => {
      try {
        const res = await API.get("/access/my");
        if (cancelled) return;
        const request = res.data.find(
          (r) =>
            (typeof r.book === "object" ? r.book._id : r.book) === bookId &&
            r.status === "approved",
        );
        if (request) {
          setAccessInfo(request);
        }
      } catch {
        // silent
      }
    };

    fetchAccess();
    return () => { cancelled = true; };
  }, [bookId, open, accessInfo]);

  if (!meta) return null;

  // ── Calculate time remaining ────────────────────────────────
  let timeRemaining = null;
  let expiryDate = null;
  let isExpired = false;

  if (accessInfo?.accessEndDate) {
    const end = new Date(accessInfo.accessEndDate);
    expiryDate = end;
    const now = Date.now();
    const diff = end.getTime() - now;
    isExpired = diff <= 0;

    if (!isExpired) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      if (days > 0) {
        timeRemaining = `${days}d ${hours}h`;
      } else if (hours > 0) {
        timeRemaining = `${hours}h remaining`;
      } else {
        const mins = Math.max(1, Math.floor((diff / (1000 * 60)) % 60));
        timeRemaining = `${mins}min remaining`;
      }
    } else {
      timeRemaining = "Expired";
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`reader-sidebar-overlay ${open ? "open" : ""}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className={`reader-sidebar ${open ? "open" : ""}`}>
        <div className="reader-sidebar-header">
          <span className="reader-sidebar-header-title">Book Info</span>
          <button className="reader-sidebar-close" onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className="reader-sidebar-body">
          {/* Book Cover */}
          <div className="reader-sidebar-cover">
            <BookCover title={meta.title} author={meta.author || ""} />
          </div>

          {/* Book Details */}
          <div className="reader-sidebar-section">
            <div className="reader-sidebar-book-title">{meta.title}</div>
            <div className="reader-sidebar-book-author">by {meta.author}</div>
          </div>

          {/* Stats */}
          <div className="reader-sidebar-stat">
            <FiBook size={16} />
            <span>{meta.totalPages} pages · Page {currentPage}</span>
          </div>

          {/* Access Timer */}
          {accessInfo && (
            <div className="reader-sidebar-access">
              <div className="reader-sidebar-access-label">Access</div>
              <div className="reader-sidebar-access-row">
                <FiClock size={14} />
                <span className="reader-sidebar-access-value">
                  {isExpired ? "Access expired" : `${timeRemaining} remaining`}
                </span>
              </div>
              {expiryDate && (
                <div className="reader-sidebar-access-row">
                  <FiCalendar size={14} />
                  <span>
                    Until{" "}
                    {expiryDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Features (future) */}
          <div className="reader-sidebar-section">
            <div className="reader-sidebar-section-title">Features</div>

            <button className="reader-sidebar-menu-item disabled">
              <FiBookmark size={16} />
              Bookmarks
            </button>

            <button className="reader-sidebar-menu-item disabled">
              <FiList size={16} />
              Table of Contents
            </button>

            <button className="reader-sidebar-menu-item disabled">
              <FiEdit3 size={16} />
              Notes & Highlights
            </button>
          </div>

          {/* Current Page */}
          <div className="reader-sidebar-section">
            <div className="reader-sidebar-section-title">Reading Progress</div>
            <div className="reader-sidebar-stat">
              <FiClock size={14} />
              <span>
                Page {currentPage} of {meta.totalPages}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
