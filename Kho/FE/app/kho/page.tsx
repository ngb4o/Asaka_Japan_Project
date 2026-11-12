"use client";

import { ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight, ImageIcon, Inbox, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatQuantity, MovementDialog } from "@/components/MovementDialog";
import { PreviewableImage } from "@/components/PreviewableImage";
import { StockJournal } from "@/components/StockJournal";
import { listItems, mediaUrl } from "@/lib/api";
import type { ItemList, MovementType, WarehouseItem } from "@/lib/types";

const PAGE_SIZE = 12;

const emptyList: ItemList = {
  items: [],
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  totalPages: 1,
  columns: [],
  summary: { totalItems: 0, totalQuantity: 0, columnCount: 0 },
};

export default function WarehousePage() {
  const [tab, setTab] = useState<"stock" | "history">("stock");
  const [movementType, setMovementType] = useState<MovementType | null>(null);
  const [revision, setRevision] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight">Kho hàng</h1>
            <p className="text-xs text-[var(--color-text-inverse)]">Tồn kho và lịch sử nhập xuất.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" className={outlineAction} onClick={() => setMovementType("out")}>
              <ArrowUpFromLine className="h-4 w-4" />
              Xuất kho
            </button>
            <button type="button" className={primaryButton} onClick={() => setMovementType("in")}>
              <ArrowDownToLine className="h-4 w-4" />
              Nhập kho
            </button>
          </div>
        </div>
        <div className="flex shrink-0 gap-2 border-b border-[var(--color-border-subtle)] px-4 py-2">
          {(
            [
              ["stock", "Tồn kho"],
              ["history", "Lịch sử"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={tab === value ? activeTab : idleTab}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
          <div className={tab === "stock" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
            <StockLevels revision={revision} />
          </div>
          <div className={tab === "history" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
            <StockJournal revision={revision} />
          </div>
        </div>
      </section>

      {movementType ? (
        <MovementDialog
          type={movementType}
          onClose={() => setMovementType(null)}
          onDone={(message) => {
            setToast(message);
            setMovementType(null);
            setRevision((current) => current + 1);
          }}
        />
      ) : null}

      {toast ? (
        <p className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0c2810] px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </p>
      ) : null}
    </div>
  );
}

function StockLevels({ revision }: { revision: number }) {
  const isMobile = useIsMobile();
  const [data, setData] = useState<ItemList>(emptyList);
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
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
      const next = await listItems({
        q: query || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      if (requestId !== requestRef.current) return;
      setData(next);
      setItems((current) => {
        if (!append) return next.items;
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...next.items.filter((item) => !seen.has(item.id))];
      });
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    }
  }, [query]);

  useEffect(() => {
    if (isMobile === null) return;
    void fetchList(isMobile ? 1 : page, false);
  }, [fetchList, isMobile, isMobile ? 1 : page, revision]);

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
      <SearchBox
        value={query}
        onSearch={(value) => {
          setQuery(value);
          setPage(1);
        }}
      />
      {loading && items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-inverse)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang tải tồn kho...
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Inbox className="h-5 w-5 text-[var(--color-text-inverse)]" />
            <p className="text-sm font-medium">{query ? "Không có sản phẩm khớp" : "Chưa có tồn kho"}</p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto lg:hidden">
            {items.map((item) => (
              <article key={item.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-3 py-2.5">
                <ItemThumb item={item} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-[var(--color-text-inverse)]">
                    {item.unit || "Chưa có ĐVT"}
                    {item.column == null ? "" : ` · Cột ${item.column}`}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">{formatQuantity(item.quantity)}</p>
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
              <table className="crm-data-table min-w-[720px]">
                <thead>
                  <tr>
                    <th className="font-medium">Ảnh</th>
                    <th className="font-medium">Sản phẩm</th>
                    <th className="font-medium">ĐVT</th>
                    <th className="font-medium">Tồn kho</th>
                    <th className="font-medium">Cột</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <ItemThumb item={item} />
                      </td>
                      <td className="font-medium">{item.name}</td>
                      <td>{item.unit || "—"}</td>
                      <td className="font-medium tabular-nums">{formatQuantity(item.quantity)}</td>
                      <td className="tabular-nums">{item.column ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hidden shrink-0 items-center justify-between gap-3 lg:flex">
            <p className="text-xs text-[var(--color-text-inverse)]">
              {data.total} sản phẩm · tổng tồn {formatQuantity(data.summary.totalQuantity)}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className={outlineAction} disabled={loading || page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Trang trước">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm tabular-nums">{data.page}/{data.totalPages}</span>
              <button type="button" className={outlineAction} disabled={loading || page >= data.totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Trang sau">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemThumb({ item }: { item: WarehouseItem }) {
  if (!item.image) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] text-[var(--color-text-inverse)]">
        <ImageIcon className="h-4 w-4" />
      </span>
    );
  }
  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border-subtle)]">
      <PreviewableImage src={mediaUrl(item.image)} alt={item.name} />
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
    <div className="relative shrink-0">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Tìm sản phẩm..."
        aria-label="Tìm sản phẩm trong kho"
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

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#016502] disabled:opacity-50";

const outlineAction =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-4 text-sm font-semibold shadow-sm transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50";

const activeTab =
  "inline-flex h-9 items-center rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-3 text-sm font-semibold text-white";

const idleTab =
  "inline-flex h-9 items-center rounded-[var(--radius-button)] px-3 text-sm font-semibold text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)]";
