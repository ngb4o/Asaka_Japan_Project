"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, X, ChevronDown } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import { getProducts } from "@/lib/api/products";
import { getProductCategories, type ProductCategory } from "@/lib/api/product-categories";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

export function ProductsPageContent() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Awaited<ReturnType<typeof getProducts>>["items"]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProductCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProducts({
        search: search || undefined,
        categoryId: categoryId || undefined,
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
  }, [search, categoryId, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function handleCategoryChange(value: string) {
    setCategoryId(value);
    setPage(1);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setCategoryId("");
    setPage(1);
  }

  const hasFilters = Boolean(search || categoryId);

  return (
    <main className="min-h-screen bg-[var(--color-surface-muted)] pt-24 pb-16 md:pt-28">
      <div className="container-wide px-[var(--space-6)]">
        <div className="mb-8 max-w-3xl">
          <p className="mb-2 text-[length:var(--text-sm)] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Sản phẩm
          </p>
          <h1 className="text-headline font-semibold text-[var(--color-text-primary)]">
            Danh mục sản phẩm
          </h1>
          <p className="mt-3 text-[length:var(--text-md)] leading-relaxed text-[var(--color-text-inverse)]">
            Tìm kiếm và lọc theo loại để xem giải pháp bảo vệ thực vật phù hợp.
          </p>
        </div>

        <div className="mb-8 flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm"
              className="h-11 w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition-colors placeholder:text-[var(--color-text-inverse)] focus:border-[var(--color-text-secondary)]"
            />
          </div>

          <div className="relative sm:min-w-[200px]">
            <select
              value={categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] pl-4 pr-10 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-text-secondary)]"
              aria-label="Lọc theo loại sản phẩm"
            >
              <option value="">Tất cả loại</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]"
              aria-hidden="true"
            />
          </div>

          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border-subtle)] px-4 text-sm font-semibold text-[var(--color-text-inverse)] transition-colors hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text-secondary)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Xóa lọc
            </button>
          ) : null}
        </div>

        {!loading && (
          <p className="mb-4 text-sm text-[var(--color-text-inverse)]">
            {total > 0 ? `${total} sản phẩm` : "Không có sản phẩm phù hợp"}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]"
              >
                <div className="aspect-[4/5] animate-pulse bg-[var(--color-surface-muted)] sm:aspect-square" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-surface-muted)]" />
                  <div className="h-3 w-full animate-pulse rounded bg-[var(--color-surface-muted)]" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-6 py-16 text-center">
            <p className="text-[var(--color-text-primary)] font-semibold">
              Không tìm thấy sản phẩm
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-inverse)]">
              Thử đổi từ khóa hoặc bộ lọc khác.
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[#016502]"
              >
                Xóa bộ lọc
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!loading && totalPages > 1 ? (
          <nav
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
            aria-label="Phân trang sản phẩm"
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - page) <= 1
              )
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
                      onClick={() => setPage(p)}
                      aria-current={page === p ? "page" : undefined}
                      className={cn(
                        "min-w-10 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                        page === p
                          ? "border-[var(--color-text-secondary)] bg-[var(--color-text-secondary)] text-white"
                          : "border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:border-[var(--color-text-secondary)]"
                      )}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-[var(--color-border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </nav>
        ) : null}

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[#016502]"
          >
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
