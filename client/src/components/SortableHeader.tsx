interface SortableHeaderProps {
  label: string;
  field: string;
  currentSort: string;
  currentDir: "asc" | "desc";
  onSort: (field: string) => void;
}

export default function SortableHeader({ label, field, currentSort, currentDir, onSort }: SortableHeaderProps) {
  const active = currentSort === field;
  return (
    <th className="th-sortable" onClick={() => onSort(field)}>
      {label}
      <span className="sort-arrow">
        {active ? (currentDir === "asc" ? "\u25B2" : "\u25BC") : "\u25B4"}
      </span>
    </th>
  );
}
