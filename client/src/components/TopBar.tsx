import { Link } from "react-router-dom";
import {
  useBreadcrumbs,
  useDefaultBreadcrumbs,
} from "../context/BreadcrumbContext";

interface TopBarProps {
  onMenuToggle: () => void;
}

export default function TopBar({ onMenuToggle }: TopBarProps) {
  const { breadcrumbs } = useBreadcrumbs();
  const defaultBreadcrumbs = useDefaultBreadcrumbs();
  const displayCrumbs =
    breadcrumbs.length > 0 ? breadcrumbs : defaultBreadcrumbs;

  return (
    <header className="topbar">
      <button
        className="topbar-menu-btn"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
      >
        {"☰"}
      </button>

      {/* Logo — shown on desktop next to breadcrumbs */}
      <div className="topbar-logo">
        <div className="topbar-logo-dot">IT</div>
        <span className="topbar-logo-name">IssueTrack</span>
      </div>

      <span className="topbar-sep">/</span>

      <nav className="topbar-breadcrumbs" aria-label="Breadcrumb">
        {displayCrumbs.map((crumb, i) => (
          <span key={i} className="topbar-breadcrumb">
            {i > 0 && <span className="topbar-breadcrumb-sep">/</span>}
            {crumb.path && i < displayCrumbs.length - 1 ? (
              <Link to={crumb.path} className="topbar-breadcrumb-link">
                {crumb.label}
              </Link>
            ) : (
              <span className="topbar-breadcrumb-current">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="topbar-actions" />
    </header>
  );
}
