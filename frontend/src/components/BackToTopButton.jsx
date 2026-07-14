import { useEffect, useState, useCallback, memo } from "react";
import { ArrowUp } from "lucide-react";
import "./BackToTopButton.css";

/**
 * BackToTopButton — a premium floating action button that appears after
 * the user scrolls past a threshold.
 *
 * Props:
 *   scrollThreshold  — px to scroll before showing (default 400)
 *   className        — additional classes
 */
const BackToTopButton = memo(function BackToTopButton({ scrollThreshold = 400, className = "" }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setVisible(window.scrollY > scrollThreshold);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    setVisible(window.scrollY > scrollThreshold);
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollThreshold]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <button
      type="button"
      className={`cr-back-to-top ${visible ? "cr-back-to-top--visible" : ""} ${className}`}
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
    >
      <ArrowUp size={18} aria-hidden="true" />
    </button>
  );
});

export default BackToTopButton;
