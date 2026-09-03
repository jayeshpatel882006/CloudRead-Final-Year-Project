import { Link, NavLink } from "react-router-dom";
import { useTheme } from "../../theme/ThemeProvider";
import {
  Sun,
  Moon,
  Monitor,
  BookOpen,
  Users,
  Upload,
  LayoutDashboard,
  CheckCircle2,
  History,
  Tags,
  Activity,
  LogOut,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import "./Sidebar.css";

const ROLE_META = {
  student: {
    brand: "Reading room",
    sections: [
      {
        items: [
          { to: "/student", label: "Library", icon: BookOpen, end: true },
          { to: "/student/requests", label: "My requests", icon: BookMarked },
          { to: "/student/analytics", label: "My analytics", icon: BarChart3 },
          { to: "/student/history", label: "Reading history", icon: History },
        ],
      },
    ],
  },
  librarian: {
    brand: "Librarian",
    sections: [
      {
        items: [
          { to: "/librarian", label: "Overview", icon: LayoutDashboard, end: true },
          { to: "/librarian/upload", label: "Upload book", icon: Upload },
          { to: "/librarian/approvals", label: "Approvals", icon: CheckCircle2 },
          { to: "/librarian/books", label: "Books", icon: BookOpen },
          { to: "/librarian/analytics", label: "Analytics", icon: BarChart3 },
        ],
      },
    ],
  },
  admin: {
    brand: "Admin",
    sections: [
      {
        items: [
          { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
          { to: "/admin/users", label: "Users", icon: Users },
          { to: "/admin/books", label: "Books", icon: BookOpen },
          { to: "/admin/categories", label: "Categories", icon: Tags },
          { to: "/admin/activity", label: "Activity", icon: Activity },
          { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
        ],
      },
    ],
  },
};

export default function Sidebar({
  role,
  user,
  collapsed = false,
  onCollapsedChange,
  onLogout,
  className = "",
}) {
  const { preference, resolved, cycleTheme } = useTheme();
  const meta = ROLE_META[role] || ROLE_META.student;

  return (
    <aside
      className={`cr-sidebar ${collapsed ? "cr-sidebar--collapsed" : ""} ${className}`}
      aria-label="Application navigation"
    >
      <Link to="/" className="cr-sidebar__brand" aria-label="Go to home page">
        <div className="cr-sidebar__logo" aria-hidden="true">
          <BrandMark size={28} />
        </div>
        <div className="cr-sidebar__brand-text">
          <span className="cr-sidebar__brand-name">CloudRead</span>
          <span className="cr-sidebar__brand-role">{meta.brand}</span>
        </div>
      </Link>

      <nav className="cr-sidebar__nav">
        {meta.sections.map((section, sIdx) => (
          <div key={sIdx} className="cr-sidebar__section">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `cr-sidebar__link ${isActive ? "cr-sidebar__link--active" : ""}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className="cr-sidebar__link-icon" />
                  <span className="cr-sidebar__link-label">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="cr-sidebar__footer">
        <button
          type="button"
          className="cr-sidebar__theme"
          onClick={cycleTheme}
          aria-label={`Theme: ${preference}. Click to cycle.`}
          title={`Theme: ${preference}`}
        >
          {preference === "system" ? <Monitor size={16} /> : resolved === "dark" ? <Moon size={16} /> : <Sun size={16} />}
          <span className="cr-sidebar__link-label">
            {preference === "system" ? "System" : resolved === "dark" ? "Dark" : "Light"}
          </span>
        </button>

        <button
          type="button"
          className="cr-sidebar__user"
          onClick={onLogout}
          title={user?.name ? `Sign out ${user.name}` : "Sign out"}
        >
          <span className="cr-sidebar__user-name">{user?.name || "Account"}</span>
          <LogOut size={16} />
        </button>

        {onCollapsedChange ? (
          <button
            type="button"
            className="cr-sidebar__collapse"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function BrandMark({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="32" height="32" rx="8" fill="var(--color-primary)" />
      <path
        d="M6 22 L6 11 Q6 10 7 10 L15 10 Q16 10 16 11 L16 22 Q16 23 15 23 L7 23 Q6 23 6 22 Z"
        fill="white"
        opacity="0.95"
      />
      <path
        d="M16 22 L16 11 Q16 10 17 10 L25 10 Q26 10 26 11 L26 22 Q26 23 25 23 L17 23 Q16 23 16 22 Z"
        fill="white"
        opacity="0.85"
      />
      <path
        d="M21 8 Q23 6 25 7"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}