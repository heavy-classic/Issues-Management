interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <nav className="pagination" aria-label="Pagination navigation">
      <span className="pagination-info" aria-live="polite" aria-atomic="true">
        Showing {start}–{end} of {total}
      </span>
      <div style={{ display: "flex", gap: "0.25rem" }}>
        <button
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          aria-label={`Go to previous page, page ${page - 1}`}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          className="btn btn-secondary btn-sm"
          disabled={page >= totalPages}
          aria-label={`Go to next page, page ${page + 1}`}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
