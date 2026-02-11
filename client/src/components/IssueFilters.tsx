interface User {
  id: string;
  email: string;
  name: string | null;
}

interface Filters {
  status: string;
  priority: string;
  assignee_id: string;
  stage_id: string;
}

interface IssueFiltersProps {
  filters: Filters;
  users: User[];
  onFilterChange: (filters: Filters) => void;
}

export default function IssueFilters({
  filters,
  users,
  onFilterChange,
}: IssueFiltersProps) {
  function handleChange(field: keyof Filters, value: string) {
    onFilterChange({ ...filters, [field]: value });
  }

  return (
    <div className="filters">
      <select
        value={filters.status}
        onChange={(e) => handleChange("status", e.target.value)}
      >
        <option value="">All Statuses</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="closed">Closed</option>
      </select>

      <select
        value={filters.priority}
        onChange={(e) => handleChange("priority", e.target.value)}
      >
        <option value="">All Priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>

      <select
        value={filters.assignee_id}
        onChange={(e) => handleChange("assignee_id", e.target.value)}
      >
        <option value="">All Assignees</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name || u.email}
          </option>
        ))}
      </select>
    </div>
  );
}
