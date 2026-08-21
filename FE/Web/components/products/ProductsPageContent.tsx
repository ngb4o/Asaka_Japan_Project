"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  FilterDrawer,
  FilterOptionList,
  FilterTrigger,
  type FilterOption,
} from "@/components/ui/filter-drawer";
import { getProducts } from "@/lib/api/products";
import { getProductCategories, type PestTypeOption } from "@/lib/api/product-categories";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

export function ProductsPageContent() {
  const [categories, setCategories] = useState<
    { id: string; name: string; pestTypes?: PestTypeOption[] }[]
  >([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  // Draft filters — only apply when drawer confirms
  const [draftCategoryId, setDraftCategoryId] = useState("");
  const [draftPestType, setDraftPestType] = useState("");
  const [draftSearch, setDraftSearch] = useState("");

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Awaited<ReturnType<typeof getProducts>>["items"]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Applied filters (set when "Xong" is pressed)
  const [appliedCategoryId, setAppliedCategoryId] = useState("");
  const [appliedPestType, setAppliedPestType] = useState("");

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === appliedCategoryId) ?? null,
    [categories, appliedCategoryId]
  );

  useEffect(() => {
    getProductCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProducts({
        search: search || undefined,
        categoryId: appliedCategoryId || undefined,
        pestType: appliedPestType || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, appliedCategoryId, appliedPestType, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function openFilter() {
    setDraftSearch(search);
    setDraftCategoryId(appliedCategoryId);
    setDraftPestType(appliedPestType);
    setFilterOpen(true);
  }

  function applyFilters() {
    setAppliedCategoryId(draftCategoryId);
    setAppliedPestType(draftPestType);
    setSearch(draftSearch);
    setPage(1);
    setFilterOpen(false);
  }

  function clearFilters() {
    setDraftCategoryId("");
    setDraftPestType("");
    setDraftSearch("");
    setAppliedCategoryId("");
    setAppliedPestType("");
    setSearch("");
    setSearchInput("");
    setPage(1);
  }

  function clearAllFilters() {
    setDraftCategoryId("");
    setDraftPestType("");
    setDraftSearch("");
    setSearch("");
    setSearchInput("");
    setPage(1);
  }

  // Sync draftCategoryId → search when drawer confirms
  function handleCategoryChange(v: string) {
    setDraftCategoryId(v);
    setDraftPestType(""); // Reset pestType when category changes
  }

  const activeCount =
    (appliedCategoryId ? 1 : 0) + (appliedPestType ? 1 : 0) + (search ? 1 : 0);
  const hasFilters = Boolean(search || appliedCategoryId || appliedPestType);

  const categoryOptions: FilterOption[] = useMemo(
    () => [{ value: "", label: "Tất cả loại" }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories]
  );

  return (
    <main className="min-h-screen bg-[var(--color-surface-elevated)] pt-12 pb-12 md:pt-24 lg:pt-28">
      <div className="container-wide px-[var(--space-6)]">
        <div className="mb-6 max-w-3xl sm:mb-8">
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex items-center gap-2 sm:mb-8 sm:gap-3">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="h-12 w-full rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] pl-11 pr-4 text-[length:var(--text-sm)] text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-inverse)] focus:border-[var(--color-text-secondary)] sm:rounded-xl"
            />
          </div>

          <FilterTrigger
            open={filterOpen}
            activeCount={activeCount}
            onClick={() => (filterOpen ? setFilterOpen(false) : openFilter())}
          />
        </div>

        {/* Active filter chips */}
        {hasFilters ? (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {search ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-[length:var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                &ldquo;{search}&rdquo;
                <button
                  type="button"
                  aria-label="Xóa tìm kiếm"
                  onClick={() => {
                    setSearch("");
                    setSearchInput("");
                    setDraftSearch("");
                    setPage(1);
                  }}
                  className="rounded-full p-0.5 hover:bg-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : null}
            {appliedCategoryId && selectedCategory ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-text-secondary)]/10 px-3 py-1.5 text-[length:var(--text-xs)] font-medium text-[var(--color-text-secondary)]">
                {selectedCategory.name}
                <button
                  type="button"
                  aria-label="Xóa lọc loại"
                  onClick={() => {
                    setAppliedCategoryId("");
                    setAppliedPestType("");
                    setDraftCategoryId("");
                    setDraftPestType("");
                    setPage(1);
                  }}
                  className="rounded-full p-0.5 hover:bg-white/60">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : null}
            {appliedPestType ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-[length:var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                {(() => {
                  const cat = categories.find((c) => c.id === appliedCategoryId);
                  const pt = cat?.pestTypes?.find((p) => p.value === appliedPestType);
                  return pt?.label || appliedPestType;
                })()}
                <button
                  type="button"
                  aria-label="Xóa lọc loại con"
                  onClick={() => {
                    setAppliedPestType("");
                    setDraftPestType("");
                    setPage(1);
                  }}
                  className="rounded-full p-0.5 hover:bg-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : null}
            <button
              type="button"
              onClick={clearFilters}
              className="text-[length:var(--text-xs)] font-semibold text-[var(--color-text-secondary)]">
              Xóa tất cả
            </button>
          </div>
        ) : null}

        {/* Filter Drawer / BottomSheet */}
        <FilterDrawer
          open={filterOpen}
          onOpenChange={setFilterOpen}
          onApply={applyFilters}
          title="Bộ lọc"
          draftCount={activeCount}
          onClear={clearFilters}>
          <FilterOptionList
            label="Loại sản phẩm"
            options={categoryOptions}
            value={draftCategoryId}
            onChange={handleCategoryChange}
            searchable
            searchPlaceholder="Tìm loại..."
            placeholder="Chọn loại..."
          />
          {draftCategoryId && (() => {
            const selectedCat = categories.find((c) => c.id === draftCategoryId);
            const pestTypes = selectedCat?.pestTypes || [];
            if (pestTypes.length === 0) return null;
            return (
              <FilterOptionList
                label={`Loại ${selectedCat?.name || "sản phẩm"}`}
                options={[
                  { value: "", label: "Tất cả" },
                  ...pestTypes.map((pt) => ({ value: pt.value, label: pt.label })),
                ]}
                value={draftPestType}
                onChange={setDraftPestType}
                searchable
                searchPlaceholder="Tìm loại con..."
                placeholder="Chọn loại con..."
              />
            );
          })()}
        </FilterDrawer>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
                <div className="aspect-[4/3] animate-pulse bg-[var(--color-surface-muted)] sm:aspect-square" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-surface-muted)]" />
                  <div className="h-3 w-full animate-pulse rounded bg-[var(--color-surface-muted)]" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-white px-6 py-16 text-center shadow-[var(--shadow-soft)]">
            <p className="font-semibold text-[var(--color-text-primary)]">
              Không tìm thấy sản phẩm
            </p>
            <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-text-inverse)]">
              Thử đổi từ khóa hoặc bộ lọc khác.
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-[length:var(--text-sm)] font-semibold text-[var(--color-text-secondary)] hover:text-[#016502]">
                Xóa bộ lọc
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!loading && totalPages > 1 ? (
          <nav
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
            aria-label="Phân trang sản phẩm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => p - 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-[length:var(--text-sm)] font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-40">
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, index, arr) => {
                const prev = arr[index - 1];
                const showEllipsis = prev != null && p - prev > 1;
                return (
                  <span key={p} className="flex items-center gap-2">
                    {showEllipsis ? (
                      <span className="px-1 text-[var(--color-text-inverse)]">…</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setPage(p);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      aria-current={page === p ? "page" : undefined}
                      className={cn(
                        "min-w-10 rounded-lg border px-3 py-2 text-[length:var(--text-sm)] font-semibold transition-colors",
                        page === p
                          ? "border-[var(--color-text-secondary)] bg-[var(--color-text-secondary)] text-white"
                          : "border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:border-[var(--color-text-secondary)]"
                      )}>
                      {p}
                    </button>
                  </span>
                );
              })}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((p) => p + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-[length:var(--text-sm)] font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-40">
              Sau
            </button>
          </nav>
        ) : null}
      </div>
    </main>
  );
}
