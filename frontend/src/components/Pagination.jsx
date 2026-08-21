import { ChevronLeft, ChevronRight } from "lucide-react";
import "./Pagination.css";

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button
        type="button"
        className="btn btn-outline pagination-btn"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Halaman sebelumnya"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="pagination-info">
        Halaman {page} dari {totalPages}
      </span>
      <button
        type="button"
        className="btn btn-outline pagination-btn"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Halaman berikutnya"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
