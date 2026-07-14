// components/reader/FloatingActions.jsx
// -----------------------------------------------------------------------------
// CloudRead-branded floating vertical button group on the right side.
// Uses design tokens from tokens.css — no hardcoded colors.
// -----------------------------------------------------------------------------

import { useState } from "react";
import {
  FiBookmark,
  FiDownload,
  FiFlag,
  FiLink,
  FiChevronUp,
} from "react-icons/fi";
import { toast } from "react-toastify";

export default function FloatingActions({ currentPage, onGoToTop }) {
  const [bookmarked, setBookmarked] = useState(false);

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    toast.success(
      bookmarked ? "Bookmark removed" : `Page ${currentPage} bookmarked`,
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => toast.success("Link copied to clipboard"))
      .catch(() => toast.error("Failed to copy link"));
  };

  const handleReport = () => {
    toast.info("Report feature coming soon");
  };

  const activeStyle = bookmarked ? { color: "var(--color-primary)" } : {};

  return (
    <div className="reader-floating-actions">
      <button
        className="reader-fab"
        onClick={handleBookmark}
        title={bookmarked ? "Remove bookmark" : "Bookmark this page"}
        style={activeStyle}
      >
        <FiBookmark size={16} />
      </button>

      <button className="reader-fab disabled" title="Download (coming soon)">
        <FiDownload size={16} />
      </button>

      <button className="reader-fab" onClick={handleReport} title="Report issue">
        <FiFlag size={16} />
      </button>

      <button className="reader-fab" onClick={handleCopyLink} title="Copy link">
        <FiLink size={16} />
      </button>

      <button className="reader-fab" onClick={onGoToTop} title="Go to top">
        <FiChevronUp size={16} />
      </button>
    </div>
  );
}
