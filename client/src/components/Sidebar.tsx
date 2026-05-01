import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// Color identity per nav item
const NAV_COLORS: Record<string, { bg: string; color: string }> = {
  issues:      { bg: "rgba(239,68,68,.3)",    color: "#fca5a5" },
  audits:      { bg: "rgba(245,158,11,.3)",   color: "#fcd34d" },
  risks:       { bg: "rgba(16,185,129,.3)",   color: "#6ee7b7" },
  lessons:     { bg: "rgba(139,92,246,.3)",   color: "#c4b5fd" },
  procedures:  { bg: "rgba(6,182,212,.3)",    color: "#67e8f9" },
  analytics:   { bg: "rgba(59,130,246,.3)",   color: "#93c5fd" },
  board:       { bg: "rgba(236,72,153,.3)",   color: "#f9a8d4" },
  reports:     { bg: "rgba(251,146,60,.3)",   color: "#fdba74" },
  queue:       { bg: "rgba(34,197,94,.3)",    color: "#86efac" },
  teams:       { bg: "rgba(20,184,166,.3)",   color: "#5eead4" },
  admin:       { bg: "rgba(148,163,184,.3)",  color: "#e2e8f0" },
  users:       { bg: "rgba(99,102,241,.3)",   color: "#a5b4fc" },
  workflow:    { bg: "rgba(167,139,250,.3)",  color: "#ddd6fe" },
  auditcfg:    { bg: "rgba(251,191,36,.3)",   color: "#fde68a" },
  checklists:  { bg: "rgba(52,211,153,.3)",   color: "#a7f3d0" },
  auditlog:    { bg: "rgba(148,163,184,.3)",  color: "#e2e8f0" },
  instructions:{ bg: "rgba(244,114,182,.3)",  color: "#fbcfe8" },
};

interface TileProps {
  to: string;
  colorKey: string;
  icon: string;
  label: string;
  onToggle: () => void;
  end?: boolean;
}

function NavTile({ to, colorKey, icon, label, onToggle, end }: TileProps) {
  const c = NAV_COLORS[colorKey] || NAV_COLORS.admin;
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onToggle}
      className={({ isActive }) => `sb-tile${isActive ? " sb-tile-active" : ""}`}
      style={({ isActive }) => isActive ? { "--tile-bg": c.bg, "--tile-color": c.color } as any : {}}
    >
      <div
        className="sb-tile-ico"
        style={{ background: c.bg }}
      >
        <span style={{ color: c.color }}>{icon}</span>
      </div>
      <span className="sb-tile-lbl">{label}</span>
      <span className="sb-tip">{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function getInitials(): string {
    if (user?.fullName) return user.fullName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    if (user?.name) return user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    return user?.email?.charAt(0).toUpperCase() || "?";
  }

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/login");
  }

  return (
    <>
      {!collapsed && <div className="sidebar-overlay" onClick={onToggle} />}
      {menuOpen && <div className="sb-menu-overlay" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar sb-v2${!collapsed ? " sidebar-open" : ""}`}>

        {/* Logo */}
        <div className="sb-v2-logo">
          <span className="invoke-wordmark">INVOKE</span>
        </div>

        {/* Primary nav */}
        <div className="sb-v2-group">
          <NavTile to="/" end colorKey="issues"     icon="🚨" label="Issues"      onToggle={onToggle} />
          <NavTile to="/audits"      colorKey="audits"     icon="📋" label="Audits"      onToggle={onToggle} />
          <NavTile to="/risks"       colorKey="risks"      icon="🛡️" label="Risks"       onToggle={onToggle} />
          <NavTile to="/lessons"     colorKey="lessons"    icon="💡" label="Lessons"     onToggle={onToggle} />
          <NavTile to="/procedures"  colorKey="procedures" icon="📄" label="Procedures"  onToggle={onToggle} />
        </div>

        <div className="sb-v2-div" />

        {/* Tools */}
        <div className="sb-v2-group">
          <NavTile to="/queue"     colorKey="queue"     icon="✅" label="My Queue"    onToggle={onToggle} />
          <NavTile to="/analytics" colorKey="analytics" icon="📊" label="Analytics"   onToggle={onToggle} />
          <NavTile to="/board"     colorKey="board"     icon="🗂️" label="Board"       onToggle={onToggle} />
          <NavTile to="/reports"   colorKey="reports"   icon="📑" label="Reports"     onToggle={onToggle} />
          {isAdmin && (
            <NavTile to="/admin/teams" colorKey="teams" icon="👥" label="Teams" onToggle={onToggle} />
          )}
        </div>

        {/* Admin */}
        {isAdmin && (
          <>
            <div className="sb-v2-div" />
            <div className="sb-v2-section-label">Administration</div>
            <div className="sb-v2-group">
              <NavTile to="/admin/users"            colorKey="users"        icon="👤" label="Users"        onToggle={onToggle} />
              <NavTile to="/admin/workflow"         colorKey="workflow"     icon="🔄" label="Workflow"     onToggle={onToggle} />
              <NavTile to="/admin/audit-types"      colorKey="auditcfg"    icon="🏷️" label="Audit Config" onToggle={onToggle} />
              <NavTile to="/admin/checklists"       colorKey="checklists"  icon="☑️" label="Checklists"   onToggle={onToggle} />
              <NavTile to="/admin/audit"            colorKey="auditlog"    icon="📜" label="Audit Log"    onToggle={onToggle} />
              <NavTile to="/admin/instructions"     colorKey="instructions" icon="📝" label="Instructions" onToggle={onToggle} />
            </div>
          </>
        )}

        {/* Bottom: dark mode toggle + avatar */}
        <div className="sb-v2-bot">
          {/* Dark mode toggle */}
          <button
            className="sb-v2-theme"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span>{theme === "dark" ? "☀" : "🌙"}</span>
            <span className="sb-v2-theme-lbl">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>

          {/* Avatar with popover */}
          <div style={{ position: "relative", width: "100%" }}>
            {menuOpen && (
              <div className="sb-popover">
                <div className="sb-popover-name">{user?.fullName || user?.name || user?.email}</div>
                {(user?.fullName || user?.name) && (
                  <div className="sb-popover-email">{user?.email}</div>
                )}
                {isAdmin && (
                  <>
                    <NavLink to="/admin/users" className="sb-popover-item" onClick={() => { setMenuOpen(false); onToggle(); }}>
                      👤 User Management
                    </NavLink>
                    <NavLink to="/admin/workflow" className="sb-popover-item" onClick={() => { setMenuOpen(false); onToggle(); }}>
                      🔄 Workflow
                    </NavLink>
                    <NavLink to="/admin/instructions" className="sb-popover-item" onClick={() => { setMenuOpen(false); onToggle(); }}>
                      📝 Instructions
                    </NavLink>
                  </>
                )}
                <div className="sb-popover-div" />
                <button className="sb-popover-signout" onClick={handleLogout}>Sign out</button>
              </div>
            )}
            <div
              className="sb-v2-av"
              onClick={() => setMenuOpen((v) => !v)}
              title={user?.fullName || user?.name || user?.email || "Account"}
            >
              <div className="sb-v2-av-circle">{getInitials()}</div>
              <div className="sb-v2-av-name">{user?.fullName || user?.name || user?.email}</div>
            </div>
          </div>
        </div>

      </aside>
    </>
  );
}
