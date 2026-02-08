import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, isAdmin, logout } = useAuth();

  function getInitials(): string {
    if (user?.fullName) {
      return user.fullName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.name) {
      return user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "?";
  }

  function getDisplayName(): string {
    return user?.fullName || user?.name || user?.email || "";
  }

  function navClass({ isActive }: { isActive: boolean }): string {
    return `sidebar-nav-item${isActive ? " active" : ""}`;
  }

  return (
    <>
      {!collapsed && (
        <div className="sidebar-overlay" onClick={onToggle} />
      )}
      <aside className={`sidebar${!collapsed ? " sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">INV<span className="brand-o"></span>KE</span>
            <span className="sidebar-brand-sub">PUBLIC SECTOR</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-label">Applications</div>
            <NavLink to="/" end className={navClass} onClick={onToggle}>
              <span className="sidebar-nav-icon">{"\u{1F4CB}"}</span>
              <span className="sidebar-nav-text">Issues</span>
            </NavLink>
            <NavLink to="/audits" className={navClass} onClick={onToggle}>
              <span className="sidebar-nav-icon">{"\u{1F50D}"}</span>
              <span className="sidebar-nav-text">Audits</span>
            </NavLink>
            <div className="sidebar-nav-item disabled">
              <span className="sidebar-nav-icon">{"\u2713"}</span>
              <span className="sidebar-nav-text">Inspections</span>
              <span className="sidebar-badge">0</span>
            </div>
            <div className="sidebar-nav-item disabled">
              <span className="sidebar-nav-icon">{"\u{1F4A1}"}</span>
              <span className="sidebar-nav-text">Lessons Learned</span>
              <span className="sidebar-badge">0</span>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Main Menu</div>
            <NavLink to="/analytics" className={navClass} onClick={onToggle}>
              <span className="sidebar-nav-icon">{"\u{1F4CA}"}</span>
              <span className="sidebar-nav-text">Dashboard</span>
            </NavLink>
            <NavLink to="/board" className={navClass} onClick={onToggle}>
              <span className="sidebar-nav-icon">{"\u{1F4CB}"}</span>
              <span className="sidebar-nav-text">Kanban Board</span>
            </NavLink>
            <NavLink to="/reports" className={navClass} onClick={onToggle}>
              <span className="sidebar-nav-icon">{"\u{1F4D1}"}</span>
              <span className="sidebar-nav-text">Reports</span>
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin/teams" className={navClass} onClick={onToggle}>
                <span className="sidebar-nav-icon">{"\u{1F465}"}</span>
                <span className="sidebar-nav-text">Teams</span>
              </NavLink>
            )}
          </div>

          {isAdmin && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Settings</div>
              <NavLink to="/admin" end className={navClass} onClick={onToggle}>
                <span className="sidebar-nav-icon">{"\u2699\uFE0F"}</span>
                <span className="sidebar-nav-text">Admin</span>
              </NavLink>
              <NavLink to="/admin/users" className={navClass} onClick={onToggle}>
                <span className="sidebar-nav-icon">{"\u{1F465}"}</span>
                <span className="sidebar-nav-text">User Management</span>
              </NavLink>
              <NavLink to="/admin/workflow" className={navClass} onClick={onToggle}>
                <span className="sidebar-nav-icon">{"\u{1F504}"}</span>
                <span className="sidebar-nav-text">Workflow</span>
              </NavLink>
              <NavLink to="/admin/audit-types" className={navClass} onClick={onToggle}>
                <span className="sidebar-nav-icon">{"\u{1F3F7}\uFE0F"}</span>
                <span className="sidebar-nav-text">Audit Config</span>
              </NavLink>
              <NavLink to="/admin/checklists" className={navClass} onClick={onToggle}>
                <span className="sidebar-nav-icon">{"\u2611\uFE0F"}</span>
                <span className="sidebar-nav-text">Checklists</span>
              </NavLink>
              <NavLink to="/admin/audit" className={navClass} onClick={onToggle}>
                <span className="sidebar-nav-icon">{"\u{1F4DC}"}</span>
                <span className="sidebar-nav-text">Audit Log</span>
              </NavLink>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">{getInitials()}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{getDisplayName()}</div>
              <div className="sidebar-user-role">{user?.role || ""}</div>
            </div>
            <button
              onClick={logout}
              className="sidebar-logout-btn"
              title="Sign out"
            >
              {"\u{1F6AA}"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
