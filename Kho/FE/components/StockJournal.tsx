"use client";

import { ChevronLeft, ChevronRight, Inbox, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MovementBadge, formatQuantity, formatWhen } from "@/components/MovementDialog";
import { listMovements } from "@/lib/api";
import type { MovementList, StockMovement } from "@/lib/types";

const PAGE_SIZE = 20;

const emptyList: MovementList = {
  items: [],
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  totalPages: 1,
};

export function StockJournal() {
  const isMobile = useIsMobile();
  const [data, setData] = useState<MovementList>(emptyList);
  const [items, setItems] = useState<StockMovement[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchList = useCallback(async (nextPage: number, append: boolean) => {
    const requestId = ++requestRef.current;
    if (append) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const next = await listMovements({
        q: query || undefined,
        type: type || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      if (requestId !== requestRef.current) return;
      setData(next);
      setError("");
      setItems((current) => {
        if (!append) return next.items;
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...next.items.filter((item) => !seen.has(item.id))];
      });
    } catch (err) {
      if (requestId === requestRef.current) {
        setError(err instanceof Error ? err.message : "Không tải được sổ kho");
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    }
  }, [query, type]);

  useEffect(() => {
    if (isMobile === null) return;
    void fetchList(isMobile ? 1 : page, false);
  }, [fetchList, isMobile, isMobile ? 1 : page]);

  const loadMore = useCallback(() => {
    if (isMobile !== true || loading || loadingMoreRef.current) return;
    if (data.page >= data.totalPages) return;
    void fetchList(data.page + 1, true);
  }, [data.page, data.totalPages, fetchList, isMobile, loading]);

  useEffect(() => {
    if (isMobile !== true) return;
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { root, rootMargin: "240px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isMobile, items.length, loadMore]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <SearchBox
          value={query}
          onSearch={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <div className="flex shrink-0 gap-2">
          {[
            ["", "Tất cả"],
            ["in", "Nhập"],
            ["out", "Xuất"],
          ].map(([value, label]) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => {
                setType(value);
                setPage(1);
              }}
              className={type === value ? activeFilter : idleFilter}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading && items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-inverse)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang tải sổ kho...
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Inbox className="h-5 w-5 text-[var(--color-text-inverse)]" />
            <p className="text-sm font-medium">Chưa có phiếu xuất nhập</p>
            <p className="max-w-sm text-sm text-[var(--color-text-inverse)]">
              Bấm xuất nhập trên một sản phẩm để ghi phiếu. Số tồn sẽ cộng hoặc trừ theo phiếu đó.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto lg:hidden">
            {items.map((movement) => (
              <article
                key={movement.id}
                className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-semibold leading-snug">{movement.itemName}</p>
                  <MovementBadge type={movement.type} />
                </div>
                <p className="mt-1 text-sm tabular-nums">
                  {movement.type === "in" ? "+" : "−"}
                  {formatQuantity(movement.quantity)} · Còn {formatQuantity(movement.balanceAfter)}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-inverse)]">
                  {formatWhen(movement.createdAt)}
                  {movement.createdBy ? ` · ${movement.createdBy}` : ""}
                  {movement.note ? ` · ${movement.note}` : ""}
                </p>
              </article>
            ))}
            <div ref={sentinelRef} className="h-1" aria-hidden />
            {loadingMore ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-[var(--color-text-inverse)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải thêm...
              </div>
            ) : null}
          </div>

          <div className="crm-table-scroll hidden min-h-0 flex-1 overflow-auto lg:block">
            <div className="crm-table-frame min-h-full border-0">
              <table className="crm-data-table min-w-[760px]">
                <thead>
                  <tr>
                    <th className="font-medium">Thời gian</th>
                    <th className="font-medium">Sản phẩm</th>
                    <th className="font-medium">Loại</th>
                    <th className="font-medium">Số lượng</th>
                    <th className="font-medium">Tồn sau</th>
                    <th className="font-medium">Người</th>
                    <th className="font-medium">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((movement) => (
                    <tr key={movement.id}>
                      <td className="whitespace-nowrap text-sm">{formatWhen(movement.createdAt)}</td>
                      <td className="font-medium">{movement.itemName}</td>
                      <td>
                        <MovementBadge type={movement.type} />
                      </td>
                      <td className="tabular-nums">
                        {movement.type === "in" ? "+" : "−"}
                        {formatQuantity(movement.quantity)}
                      </td>
                      <td className="tabular-nums">{formatQuantity(movement.balanceAfter)}</td>
                      <td>{movement.createdBy || "—"}</td>
                      <td className="text-sm text-[var(--color-text-inverse)]">{movement.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            disabled={loading}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

function SearchBox({ value, onSearch }: { value: string; onSearch: (value: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft.trim() !== value.trim()) onSearch(draft.trim());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, onSearch, value]);

  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Tìm sản phẩm hoặc ghi chú..."
        aria-label="Tìm phiếu xuất nhập"
        className="h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] pr-9 pl-9 text-sm shadow-sm outline-none placeholder:text-[var(--color-text-inverse)] focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]"
      />
      {draft ? (
        <button
          type="button"
          aria-label="Xóa tìm kiếm"
          className="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)]"
          onClick={() => {
            setDraft("");
            onSearch("");
          }}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  limit,
  disabled,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = visiblePages(page, totalPages);

  return (
    <div className="hidden shrink-0 items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-3 lg:flex">
      <p className="text-sm text-[var(--color-text-inverse)]">
        Hiển thị <span className="font-medium text-[var(--color-text-primary)]">{from}</span>
        {" - "}
        <span className="font-medium text-[var(--color-text-primary)]">{to}</span>
        {" trong tổng số "}
        <span className="font-medium text-[var(--color-text-primary)]">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button type="button" className={idleFilter} disabled={disabled || page <= 1} aria-label="Trang trước" onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((pageNumber, index) => {
          const previous = pages[index - 1];
          const showEllipsis = previous !== undefined && pageNumber - previous > 1;
          return (
            <span key={pageNumber} className="flex items-center gap-1">
              {showEllipsis ? <span className="px-1 text-sm text-[var(--color-text-inverse)]">...</span> : null}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPageChange(pageNumber)}
                className={pageNumber === page ? activeFilter : idleFilter}
              >
                {pageNumber}
              </button>
            </span>
          );
        })}
        <button type="button" className={idleFilter} disabled={disabled || page >= totalPages} aria-label="Trang sau" onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function visiblePages(page: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set<number>([1, totalPages, page]);
  if (page > 1) pages.add(page - 1);
  if (page < totalPages) pages.add(page + 1);
  return [...pages].sort((a, b) => a - b);
}

const idleFilter =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-sm font-semibold shadow-sm disabled:opacity-50";

const activeFilter =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50";
