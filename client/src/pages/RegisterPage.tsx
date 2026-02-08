import { useState, FormEvent } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(email, password, name || undefined);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-name">INV<span className="brand-o"></span>KE</div>
        <div className="auth-brand-sub">PUBLIC SECTOR</div>
      </div>
      <h1>Register</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name (optional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Registering..." : "Register"}
        </button>
      </form>
      <p className="auth-link">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
