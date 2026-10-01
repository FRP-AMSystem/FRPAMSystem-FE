import React from "react";
import "./Pagination.css";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems === 0) return null;
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const pages: number[] = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, page + 2);
  for (let i = from; i <= to; i += 1) pages.push(i);

  return (
    <div className="app-pagination">
      <div className="app-pagination-summary">Showing {start}–{end} of {totalItems}</div>
      <div className="app-pagination-pages">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
        {from > 1 && <button type="button" onClick={() => onPageChange(1)}>1</button>}
        {from > 2 && <span>…</span>}
        {pages.map((p) => (
          <button key={p} type="button" className={p === page ? "active" : ""} onClick={() => onPageChange(p)}>{p}</button>
        ))}
        {to < totalPages - 1 && <span>…</span>}
        {to < totalPages && <button type="button" onClick={() => onPageChange(totalPages)}>{totalPages}</button>}
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
      <label className="app-pagination-size">
        Rows per page:
        <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
          {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
    </div>
  );
}
