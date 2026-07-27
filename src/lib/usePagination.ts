import { useState, useMemo, useCallback } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
}

interface UsePaginationReturn {
  page: number;
  limit: number;
  setPage: (p: number) => void;
  setLimit: (l: number) => void;
  offset: number;
  slice: <T>(data: T[]) => T[];
  total: number;
  totalPages: number;
  setTotal: (t: number) => void;
}

export function usePagination(opts?: UsePaginationOptions): UsePaginationReturn {
  const [page, setPage] = useState(opts?.initialPage ?? 1);
  const [limit, setLimit] = useState(opts?.initialLimit ?? 20);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;

  const setLimitAndReset = useCallback((l: number) => {
    setLimit(l);
    setPage(1);
  }, []);

  const slice = useMemo(() => {
    return <T,>(data: T[]): T[] => {
      return data.slice(offset, offset + limit);
    };
  }, [offset, limit]);

  return {
    page,
    limit,
    setPage,
    setLimit: setLimitAndReset,
    offset,
    slice,
    total,
    totalPages,
    setTotal,
  };
}
