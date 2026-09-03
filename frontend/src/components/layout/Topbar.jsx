import { Menu, Bell, ChevronDown } from "lucide-react";
import { useState } from "react";
import SearchInput from "../ui/SearchInput";
import Avatar from "../ui/Avatar";
import "./Topbar.css";

export default function Topbar({
  title,
  search,
  onSearchChange,
  user,
  onMenuClick,
  rightSlot,
  notificationCount,
  className = "",
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={`cr-topbar ${className}`}>
      <div className="cr-topbar__left">
        {onMenuClick ? (
          <button
            type="button"
            className="cr-topbar__menu"
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
        ) : null}
        {title ? <h2 className="cr-topbar__title">{title}</h2> : null}
      </div>

      <div className="cr-topbar__center">
        {search !== undefined ? (
          <SearchInput
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search books, authors, ISBN…"
            className="cr-topbar__search"
          />
        ) : null}
      </div>

      <div className="cr-topbar__right">
        {rightSlot}
        <button
          type="button"
          className="cr-topbar__icon"
          aria-label={notificationCount ? `Notifications (${notificationCount})` : "Notifications"}
        >
          <Bell size={18} />
          {notificationCount ? (
            <span className="cr-topbar__badge">{notificationCount}</span>
          ) : null}
        </button>
        <button
          type="button"
          className="cr-topbar__user"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <Avatar name={user?.name} size="sm" />
          <span className="cr-topbar__user-name">{user?.name?.split(" ")[0] || "Account"}</span>
          <ChevronDown size={14} />
        </button>
      </div>
    </header>
  );
}