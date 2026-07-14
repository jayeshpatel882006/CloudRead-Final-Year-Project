import { useState } from "react";
import Sidebar from "./Sidebar";
import BackToTopButton from "../BackToTopButton";
import "./AppShell.css";

/**
 * AppShell — sidebar + main content area.
 *
 * Behavior:
 * - Desktop: sidebar always visible, collapse-toggleable.
 * - Mobile (<768px): sidebar hidden behind a backdrop; toggled via Topbar menu.
 *
 * Renders a skip-link, the sidebar, and a <main> with the page content.
 */
export default function AppShell({
  role,
  user,
  onLogout,
  topbar,
  children,
  className = "",
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`cr-app-shell ${className}`}>
      <a href="#main" className="skip-link">Skip to content</a>

      <div
        className="cr-app-shell__backdrop"
        aria-hidden="true"
        onClick={() => setMobileOpen(false)}
        data-open={mobileOpen}
      />

      <Sidebar
        role={role}
        user={user}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        onLogout={onLogout}
        className={mobileOpen ? "cr-sidebar--open" : ""}
      />

      <div className={`cr-app-shell__main ${collapsed ? "cr-app-shell__main--collapsed" : ""}`}>
        {topbar ? (
          <div className="cr-app-shell__topbar">
            {/* Inject menu trigger into topbar props */}
            {typeof topbar === "function"
              ? topbar({ onMenuClick: () => setMobileOpen(true) })
              : (
                <div className="cr-app-shell__topbar-wrap">
                  {topbar}
                  <button
                    type="button"
                    className="cr-app-shell__menu"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open navigation"
                  >
                    ☰
                  </button>
                </div>
              )}
          </div>
        ) : null}
        <main id="main" tabIndex={-1} className="cr-app-shell__content">
          {children}
        </main>
      </div>
      <BackToTopButton />
    </div>
  );
}