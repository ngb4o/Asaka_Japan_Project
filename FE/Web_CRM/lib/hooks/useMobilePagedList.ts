"use client";

import { useCallback, useRef, useState } from "react";

type PageResult<T> = {
  items: T[];
  page: number;
  total: number;
  totalPages: number;
};

type FetchPage<T> = (page: number) => Promise<PageResult<T>>;

type UseMobilePagedListOptions<T> = {
  fetchPage: FetchPage<T>;
  onError?: (error: unknown) => void;
};

/**
 * Paged list helpers for mobile pull-to-refresh + infinite scroll.
 * Desktop can still jump pages with `goToPage` (replace mode).
 */
export function useMobilePagedList<T>({
  fetchPage,
  onError,
}: UseMobilePagedListOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const requestIdRef = useRef(0);
  const pageRef = useRef(1);
  const totalPagesRef = useRef(1);
  const busyRef = useRef(false);

  const applyResult = useCallback(
    async (targetPage: number, mode: "replace" | "append") => {
      const requestId = ++requestIdRef.current;
      busyRef.current = true;

      if (mode === "append") setLoadingMore(true);
      else if (mode === "replace" && !refreshing) setLoading(targetPage === 1);

      try {
        let result = await fetchPage(targetPage);
        if (requestId !== requestIdRef.current) return;

        // Empty page after deletes → load last available page
        if (result.items.length === 0 && result.total > 0 && targetPage > 1) {
          result = await fetchPage(result.totalPages);
          if (requestId !== requestIdRef.current) return;
          mode = "replace";
        }

        setItems((prev) =>
          mode === "append" ? [...prev, ...result.items] : result.items
        );
        pageRef.current = result.page;
        totalPagesRef.current = result.totalPages;
        setPage(result.page);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (error) {
        if (requestId === requestIdRef.current) onError?.(error);
      } finally {
        if (requestId === requestIdRef.current) {
          busyRef.current = false;
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [fetchPage, onError, refreshing]
  );

  const reload = useCallback(async () => {
    pageRef.current = 1;
    setPage(1);
    await applyResult(1, "replace");
  }, [applyResult]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    pageRef.current = 1;
    setPage(1);
    await applyResult(1, "replace");
  }, [applyResult]);

  const loadMore = useCallback(() => {
    if (busyRef.current || loading || loadingMore || refreshing) return;
    if (pageRef.current >= totalPagesRef.current) return;
    void applyResult(pageRef.current + 1, "append");
  }, [applyResult, loading, loadingMore, refreshing]);

  const goToPage = useCallback(
    (nextPage: number) => {
      pageRef.current = nextPage;
      setPage(nextPage);
      void applyResult(nextPage, "replace");
    },
    [applyResult]
  );

  return {
    items,
    setItems,
    page,
    total,
    totalPages,
    loading,
    loadingMore,
    refreshing,
    hasMore: page < totalPages,
    reload,
    refresh,
    loadMore,
    goToPage,
  };
}
