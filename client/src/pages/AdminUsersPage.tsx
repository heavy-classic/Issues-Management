import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

interface User {
  id: string;
  email: string;
  name: string | null;
  full_name: string | null;
  role: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    full_name: "",
    role: "user",
  });
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    const res = await api.get("/admin/users");
    setUsers(res.data.users);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/admin/users", form);
      setShowCreate(false);
      setForm({ email: "", password: "", name: "", full_name: "", role: "user" });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create user");
    }
  }

  async function handleUpdate(userId: string) {
    setError("");
    try {
      await api.patch(`/admin/users/${userId}`, {
        name: form.name,
        full_name: form.full_name,
        role: form.role,
      });
      setEditingId(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update user");
    }
  }

  async function toggleStatus(user: User) {
    try {
      if (user.status === "active") {
        await api.post(`/admin/users/${user.id}/disable`);
      } else {
        await api.post(`/admin/users/${user.id}/enable`);
      }
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update status");
    }
  }

  function startEdit(user: User) {
    setForm({
      email: user.email,
      password: "",
      name: user.name || "",
      full_name: user.full_name || "",
      role: user.role,
    });
    setEditingId(user.id);
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>User Management</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn btn-primary"
        >
          {showCreate ? "Cancel" : "Create User"}
        </button>
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      {showCreate && (
        <form onSubmit={handleCreate} className="admin-form">
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Full Legal Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Create</button>
        </form>
      )}

      <table className="issues-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Full Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              {editingId === user.id ? (
                <>
                  <td>{user.email}</td>
                  <td>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="inline-input"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="inline-input"
                    />
                  </td>
                  <td>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="inline-input"
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`badge badge-status-${user.status === "active" ? "open" : "closed"}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : "Never"}</td>
                  <td>
                    <button onClick={() => handleUpdate(user.id)} className="btn btn-primary btn-sm">Save</button>{" "}
                    <button onClick={() => setEditingId(null)} className="btn btn-secondary btn-sm">Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{user.email}</td>
                  <td>{user.name || "-"}</td>
                  <td>{user.full_name || "-"}</td>
                  <td>
                    <span className={`badge badge-role-${user.role}`}>{user.role}</span>
                  </td>
                  <td>
                    <span className={`badge badge-status-${user.status === "active" ? "open" : "closed"}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : "Never"}</td>
                  <td>
                    <button onClick={() => startEdit(user)} className="btn btn-secondary btn-sm">Edit</button>{" "}
                    <button onClick={() => toggleStatus(user)} className={`btn btn-sm ${user.status === "active" ? "btn-danger" : "btn-primary"}`}>
                      {user.status === "active" ? "Disable" : "Enable"}
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
