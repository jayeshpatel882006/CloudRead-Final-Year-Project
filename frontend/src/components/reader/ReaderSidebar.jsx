// components/reader/ReaderSidebar.jsx
// -----------------------------------------------------------------------------
// Collapsible left sidebar for the full-screen PDF reader.
//
// Contains:
//   - Book Cover (placeholder)
//   - Book Details (title, author, total pages)
//   - Bookmarks (future feature — placeholder)
//   - Table of Contents (future feature — placeholder)
//   - Notes (future feature — placeholder)
//   - Recently Viewed Pages
// -----------------------------------------------------------------------------

import { FiX, FiBookmark, FiList, FiEdit3, FiClock, FiBook } from "react-icons/fi";

export default function ReaderSidebar({ open, onClose, meta, currentPage }) {
  if (!meta) return null;

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
          <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--reader-text)" }}>
            Book Info
          </span>
          <button className="reader-sidebar-close" onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className="reader-sidebar-body">
          {/* Book Cover (placeholder) */}
          <div
            style={{
              width: "100%",
              height: 160,
              borderRadius: 8,
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "2.5rem",
              opacity: 0.9,
            }}
          >
            <FiBook size={48} />
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

          {/* Menu Items (future features) */}
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

          {/* Recently Viewed */}
          <div className="reader-sidebar-section">
            <div className="reader-sidebar-section-title">Current Page</div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--reader-text)",
                padding: "8px 12px",
                background: "rgba(79, 70, 229, 0.06)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FiClock size={14} />
              <span>Page {currentPage} of {meta.totalPages}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
