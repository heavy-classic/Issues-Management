import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ users: 0, teams: 0, stages: 0 });

  useEffect(() => {
    Promise.all([
      api.get("/admin/users"),
      api.get("/teams"),
      api.get("/workflow-stages"),
    ]).then(([usersRes, teamsRes, stagesRes]) => {
      setStats({
        users: usersRes.data.users.length,
        teams: teamsRes.data.teams.length,
        stages: stagesRes.data.stages.length,
      });
    });
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <div className="admin-cards">
        <Link to="/admin/users" className="admin-card">
          <div className="admin-card-number">{stats.users}</div>
          <div className="admin-card-label">Users</div>
        </Link>
        <Link to="/admin/teams" className="admin-card">
          <div className="admin-card-number">{stats.teams}</div>
          <div className="admin-card-label">Teams</div>
        </Link>
        <Link to="/admin/workflow" className="admin-card">
          <div className="admin-card-number">{stats.stages}</div>
          <div className="admin-card-label">Workflow Stages</div>
        </Link>
        <Link to="/admin/audit" className="admin-card">
          <div className="admin-card-number">--</div>
          <div className="admin-card-label">Audit Log</div>
        </Link>
      </div>
    </div>
  );
}
