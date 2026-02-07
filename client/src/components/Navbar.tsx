import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        Issues Tracker
      </Link>
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
