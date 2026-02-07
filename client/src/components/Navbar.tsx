import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          Issues Tracker
        </Link>
        {user && (
          <div className="navbar-links">
            <Link to="/" className="navbar-link">Issues</Link>
            <Link to="/board" className="navbar-link">Board</Link>
            {isAdmin && (
              <Link to="/admin" className="navbar-link">Admin</Link>
            )}
          </div>
        )}
      </div>
      {user && (
        <div className="navbar-right">
          <span className="navbar-user">{user.email}</span>
          <button onClick={logout} className="btn btn-secondary btn-sm">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
