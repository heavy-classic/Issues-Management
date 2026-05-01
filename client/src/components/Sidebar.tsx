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
  issues:    { bg: "rgba(239,68,68,.18)",   color: "#f87171" },
  audits:    { bg: "rgba(245,158,11,.18)",  color: "#fbbf24" },
  risks:     { bg: "rgba(16,185,129,.18)",  color: "#34d399" },
  lessons:   { bg: "rgba(139,92,246,.18)",  color: "#c4b5fd" },
  analytics: { bg: "rgba(59,130,246,.18)",  color: "#60a5fa" },
  board:     { bg: "rgba(236,72,153,.18)",  color: "#f9a8d4" },
  reports:   { bg: "rgba(251,146,60,.18)",  color: "#fb923c" },
  teams:     { bg: "rgba(20,184,166,.18)",  color: "#2dd4bf" },
  admin:     { bg: "rgba(156,163,175,.18)", color: "#d1d5db" },
  users:     { bg: "rgba(99,102,241,.18)",  color: "#a5b4fc" },
  workflow:  { bg: "rgba(167,139,250,.18)", color: "#c4b5fd" },
  auditcfg:  { bg: "rgba(251,191,36,.18)",  color: "#fde68a" },
  checklists:{ bg: "rgba(52,211,153,.18)",  color: "#6ee7b7" },
  auditlog:  { bg: "rgba(148,163,184,.18)", color: "#cbd5e1" },
  instructions:{ bg: "rgba(244,114,182,.18)", color: "#f9a8d4" },
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
          <div className="sb-v2-logo-mark">IT</div>
        </div>

        {/* Primary nav */}
        <div className="sb-v2-group">
          <NavTile to="/" end colorKey="issues"    icon="⚑"  label="Issues"          onToggle={onToggle} />
          <NavTile to="/audits"  colorKey="audits"    icon="📋" label="Audits"          onToggle={onToggle} />
          <NavTile to="/risks"   colorKey="risks"     icon="◈"  label="Risks"           onToggle={onToggle} />
          <NavTile to="/lessons" colorKey="lessons"   icon="✦"  label="Lessons"         onToggle={onToggle} />
        </div>

        <div className="sb-v2-div" />

        {/* Tools */}
        <div className="sb-v2-group">
          <NavTile to="/analytics" colorKey="analytics" icon="📊" label="Analytics"   onToggle={onToggle} />
          <NavTile to="/board"     colorKey="board"     icon="⊞"  label="Board"        onToggle={onToggle} />
          <NavTile to="/reports"   colorKey="reports"   icon="📑" label="Reports"      onToggle={onToggle} />
          {isAdmin && (
            <NavTile to="/admin/teams" colorKey="teams" icon="👥" label="Teams" onToggle={onToggle} />
          )}
        </div>

        {/* Admin */}
        {isAdmin && (
          <>
            <div className="sb-v2-div" />
            <div className="sb-v2-group">
              <NavTile to="/admin"              end colorKey="admin"        icon="⚙"  label="System Admin"     onToggle={onToggle} />
              <NavTile to="/admin/users"            colorKey="users"        icon="👤" label="Users"            onToggle={onToggle} />
              <NavTile to="/admin/workflow"         colorKey="workflow"     icon="🔄" label="Workflow"         onToggle={onToggle} />
              <NavTile to="/admin/audit-types"      colorKey="auditcfg"    icon="🏷"  label="Audit Config"     onToggle={onToggle} />
              <NavTile to="/admin/checklists"       colorKey="checklists"  icon="☑"  label="Checklists"       onToggle={onToggle} />
              <NavTile to="/admin/audit"            colorKey="auditlog"    icon="📜" label="Audit Log"        onToggle={onToggle} />
              <NavTile to="/admin/instructions"     colorKey="instructions" icon="📝" label="Instructions"    onToggle={onToggle} />
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
            <span className="sb-tip">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>

          {/* Avatar with popover */}
          <div style={{ position: "relative" }}>
            {menuOpen && (
              <div className="sb-popover">
                <div className="sb-popover-name">{user?.fullName || user?.name || user?.email}</div>
                {(user?.fullName || user?.name) && (
                  <div className="sb-popover-email">{user?.email}</div>
                )}
                {isAdmin && (
                  <>
                    <NavLink to="/admin" className="sb-popover-item" onClick={() => { setMenuOpen(false); onToggle(); }}>
                      ⚙ System Admin
                    </NavLink>
                    <NavLink to="/admin/users" className="sb-popover-item" onClick={() => { setMenuOpen(false); onToggle(); }}>
                      👤 User Management
                    </NavLink>
                    <NavLink to="/admin/instructions" className="sb-popover-item" onClick={() => { setMenuOpen(false); onToggle(); }}>
                      📝 Issue Instructions
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
              {getInitials()}
              {!menuOpen && <span className="sb-tip">{user?.fullName || user?.name || user?.email}</span>}
            </div>
          </div>
        </div>

      </aside>
    </>
  );
}
