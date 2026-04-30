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

  function navClass({ isActive }: { isActive: boolean }): string {
    return `sb-item${isActive ? " active" : ""}`;
  }

  return (
    <>
      {!collapsed && (
        <div className="sidebar-overlay" onClick={onToggle} />
      )}
      <aside className={`sidebar${!collapsed ? " sidebar-open" : ""}`}>

        {/* Logo */}
        <div className="sidebar-logo">IT</div>

        {/* Primary nav */}
        <div className="sb-group" style={{ marginTop: 4 }}>
          <NavLink to="/" end className={navClass} onClick={onToggle}>
            <span className="sb-icon">⚑</span>
            <span className="sb-label">Issues</span>
            <span className="sb-tip">Issues</span>
          </NavLink>
          <NavLink to="/audits" className={navClass} onClick={onToggle}>
            <span className="sb-icon">📋</span>
            <span className="sb-label">Audits</span>
            <span className="sb-tip">Audits</span>
          </NavLink>
          <NavLink to="/risks" className={navClass} onClick={onToggle}>
            <span className="sb-icon">◈</span>
            <span className="sb-label">Risks</span>
            <span className="sb-tip">Risks</span>
          </NavLink>
          <NavLink to="/lessons" className={navClass} onClick={onToggle}>
            <span className="sb-icon">✦</span>
            <span className="sb-label">Lessons Learned</span>
            <span className="sb-tip">Lessons Learned</span>
          </NavLink>
        </div>

        <div className="sb-div" />

        {/* Secondary nav */}
        <div className="sb-group">
          <NavLink to="/analytics" className={navClass} onClick={onToggle}>
            <span className="sb-icon">📊</span>
            <span className="sb-label">Analytics</span>
            <span className="sb-tip">Analytics</span>
          </NavLink>
          <NavLink to="/board" className={navClass} onClick={onToggle}>
            <span className="sb-icon">⊞</span>
            <span className="sb-label">Kanban Board</span>
            <span className="sb-tip">Kanban Board</span>
          </NavLink>
          <NavLink to="/reports" className={navClass} onClick={onToggle}>
            <span className="sb-icon">📑</span>
            <span className="sb-label">Reports</span>
            <span className="sb-tip">Reports</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/teams" className={navClass} onClick={onToggle}>
              <span className="sb-icon">👥</span>
              <span className="sb-label">Teams</span>
              <span className="sb-tip">Teams</span>
            </NavLink>
          )}
        </div>

        {isAdmin && (
          <>
            <div className="sb-div" />
            <div className="sb-group">
              <NavLink to="/admin" end className={navClass} onClick={onToggle}>
                <span className="sb-icon">⚙</span>
                <span className="sb-label">Admin</span>
                <span className="sb-tip">Admin</span>
              </NavLink>
              <NavLink to="/admin/users" className={navClass} onClick={onToggle}>
                <span className="sb-icon">👤</span>
                <span className="sb-label">User Management</span>
                <span className="sb-tip">User Management</span>
              </NavLink>
              <NavLink to="/admin/workflow" className={navClass} onClick={onToggle}>
                <span className="sb-icon">🔄</span>
                <span className="sb-label">Workflow</span>
                <span className="sb-tip">Workflow</span>
              </NavLink>
              <NavLink to="/admin/audit-types" className={navClass} onClick={onToggle}>
                <span className="sb-icon">🏷</span>
                <span className="sb-label">Audit Config</span>
                <span className="sb-tip">Audit Config</span>
              </NavLink>
              <NavLink to="/admin/checklists" className={navClass} onClick={onToggle}>
                <span className="sb-icon">☑</span>
                <span className="sb-label">Checklists</span>
                <span className="sb-tip">Checklists</span>
              </NavLink>
              <NavLink to="/admin/audit" className={navClass} onClick={onToggle}>
                <span className="sb-icon">📜</span>
                <span className="sb-label">Audit Log</span>
                <span className="sb-tip">Audit Log</span>
              </NavLink>
            </div>
          </>
        )}

        {/* Bottom: avatar */}
        <div className="sb-bot">
          <div className="sb-av" onClick={logout} title="Sign out">
            {getInitials()}
            <span className="sb-tip">{user?.fullName || user?.name || user?.email || "Sign out"}</span>
          </div>
        </div>

      </aside>
    </>
  );
}
