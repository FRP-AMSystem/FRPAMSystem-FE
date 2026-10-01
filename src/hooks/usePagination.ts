import { useEffect, useMemo, useState } from "react";
export default function usePagination<T>(items: T[], initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => { setCurrentPage((page) => Math.min(page, totalPages)); }, [totalPages]);
  const paginatedItems = useMemo(() => { const start = (currentPage - 1) * pageSize; return items.slice(start, start + pageSize); }, [items, currentPage, pageSize]);
  const setPageSize = (size: number) => { setPageSizeState(size); setCurrentPage(1); };
  return { currentPage, pageSize, paginatedItems, setCurrentPage, setPageSize };
}
