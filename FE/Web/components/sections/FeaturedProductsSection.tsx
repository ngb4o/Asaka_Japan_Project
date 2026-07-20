"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionShell } from "@/components/layout/SectionShell";
import { FadeUp } from "@/components/motion/FadeUp";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import {
  getFeaturedProducts,
  type FeaturedProductCard,
} from "@/lib/api/products";
import { FEATURED_PRODUCTS } from "@/lib/constants";
import { isApiId } from "@/lib/format";
import { cn } from "@/lib/utils";

const FALLBACK_PRODUCTS: FeaturedProductCard[] = FEATURED_PRODUCTS.map(
  (product, index) => ({
    id: `fallback-${index}`,
    name: product.name,
    category: product.category,
    benefit: product.benefit,
    image: product.image,
    alt: product.alt,
    displayOrder: index,
  })
);

export function FeaturedProductsSection() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [products, setProducts] = useState<FeaturedProductCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      try {
        const items = await getFeaturedProducts(12);
        if (!cancelled) {
          setProducts(items.length > 0 ? items : FALLBACK_PRODUCTS);
        }
      } catch {
        if (!cancelled) {
          setProducts(FALLBACK_PRODUCTS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollCarousel = useCallback(
    (direction: 1 | -1) => {
      const carousel = carouselRef.current;
      if (!carousel || products.length === 0) return;

      const firstCard = carousel.firstElementChild as HTMLElement | null;
      const gap = Number.parseFloat(
        window.getComputedStyle(carousel).columnGap || "0"
      );
      const distance = (firstCard?.offsetWidth ?? 340) + gap;
      const reachedEnd =
        carousel.scrollLeft + carousel.clientWidth >=
        carousel.scrollWidth - distance / 2;
      const reachedStart = carousel.scrollLeft <= distance / 2;

      if (direction === 1 && reachedEnd) {
        carousel.scrollTo({
          left: 0,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
        return;
      }

      if (direction === -1 && reachedStart) {
        carousel.scrollTo({
          left: carousel.scrollWidth,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
        return;
      }

      carousel.scrollBy({
        left: distance * direction,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    },
    [prefersReducedMotion, products.length]
  );

  useEffect(() => {
    if (isInteractionPaused || prefersReducedMotion || products.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => scrollCarousel(1), 2500);
    return () => window.clearInterval(interval);
  }, [isInteractionPaused, prefersReducedMotion, scrollCarousel, products.length]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || products.length === 0) return;

    const syncActive = () => {
      const firstCard = carousel.firstElementChild as HTMLElement | null;
      if (!firstCard) return;
      const gap = Number.parseFloat(
        window.getComputedStyle(carousel).columnGap || "0"
      );
      const step = firstCard.offsetWidth + gap;
      const index = Math.round(carousel.scrollLeft / step);
      setActiveIndex(Math.min(Math.max(index, 0), products.length - 1));
    };

    carousel.addEventListener("scroll", syncActive, { passive: true });
    syncActive();
    return () => carousel.removeEventListener("scroll", syncActive);
  }, [products.length]);

  return (
    <SectionShell
      id="products"
      eyebrow="Sản phẩm nổi bật"
      title="Giải pháp được tin dùng trên đồng ruộng"
      subtitle="Danh mục sản phẩm chọn lọc từ đối tác uy tín, phục vụ nhu cầu canh tác thực tế của đại lý và nông dân."
      className="organic-bg"
    >
      <FadeUp>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]"
              >
                <div className="aspect-[4/5] animate-pulse bg-[var(--color-surface-muted)] sm:aspect-square lg:aspect-[4/5]" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-surface-muted)]" />
                  <div className="h-3 w-full animate-pulse rounded bg-[var(--color-surface-muted)]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            <div
              ref={carouselRef}
              role="region"
              aria-label="Danh sách sản phẩm nổi bật"
              className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] sm:gap-4 sm:pb-4 lg:gap-6 [&::-webkit-scrollbar]:hidden"
              onMouseEnter={() => setIsInteractionPaused(true)}
              onMouseLeave={() => setIsInteractionPaused(false)}
              onFocusCapture={() => setIsInteractionPaused(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsInteractionPaused(false);
                }
              }}
            >
              {products.map((product) => {
                const cardClassName =
                  "group relative flex w-[calc((100%_-_12px)/2)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] transition-all duration-[400ms] hover:border-[var(--color-text-secondary)]/25 sm:w-[calc((100%_-_32px)/2)] sm:rounded-[var(--radius-card)] lg:w-[calc((100%_-_48px)/3)]";
                const cardContent = (
                  <>
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--color-surface-muted)] sm:aspect-square lg:aspect-[4/5]">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.alt}
                          fill
                          className="object-cover transition-transform duration-[600ms] group-hover:scale-105"
                          sizes="(max-width: 1024px) 50vw, 30vw"
                          unoptimized={product.image.includes("localhost")}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-inverse)]">
                          Chưa có ảnh
                        </div>
                      )}

                      <div className="absolute left-3 top-3 sm:left-4 sm:top-4 lg:left-5 lg:top-5">
                        <span className="inline-flex rounded-full bg-[var(--color-text-secondary)] px-2 py-1 text-[10px] font-semibold text-white sm:px-3 sm:py-1.5 sm:text-[length:var(--text-xs)]">
                          {product.category}
                        </span>
                      </div>

                      <div className="absolute bottom-5 right-5 hidden h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[var(--color-text-secondary)] opacity-0 transition-all duration-[400ms] group-hover:opacity-100 sm:flex">
                        <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-2 border-t border-[var(--color-border-subtle)] p-3 sm:gap-2.5 sm:p-4 lg:min-h-[11.5rem] lg:gap-3 lg:p-6">
                      <h3 className="line-clamp-2 text-[length:var(--text-sm)] font-semibold leading-tight text-[var(--color-text-primary)] sm:text-[length:var(--text-lg)] lg:text-[length:var(--text-xl)]">
                        {product.name}
                      </h3>
                      <p className="line-clamp-2 text-[length:var(--text-xs)] font-normal leading-relaxed text-[var(--color-text-inverse)] sm:text-[length:var(--text-sm)] lg:text-[length:var(--text-md)]">
                        {product.benefit}
                      </p>
                      <div className="mt-auto hidden pt-1 lg:block">
                        <span className="inline-flex items-center gap-1 text-[length:var(--text-sm)] font-semibold text-[var(--color-text-secondary)] transition-colors duration-[400ms] group-hover:text-[#016502]">
                          Tìm hiểu thêm
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </>
                );

                return isApiId(product.id) ? (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className={cardClassName}
                  >
                    {cardContent}
                  </Link>
                ) : (
                  <article key={product.id} className={cardClassName}>
                    {cardContent}
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {!loading && products.length > 0 ? (
          <div className="mt-6 flex flex-col items-center gap-4">
            <div
              className="flex items-center justify-center gap-2"
              role="tablist"
              aria-label="Vị trí sản phẩm trong carousel"
            >
              {products.map((product, index) => (
                <button
                  key={`dot-${product.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeIndex === index}
                  aria-label={`Đến sản phẩm ${index + 1}: ${product.name}`}
                  onClick={() => {
                    const carousel = carouselRef.current;
                    const card = carousel?.children[index] as
                      | HTMLElement
                      | undefined;
                    card?.scrollIntoView({
                      behavior: prefersReducedMotion ? "auto" : "smooth",
                      inline: "center",
                      block: "nearest",
                    });
                  }}
                  className={cn(
                    "h-2.5 rounded-full transition-all duration-[400ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] focus-visible:ring-offset-2",
                    activeIndex === index
                      ? "w-8 bg-[var(--color-text-secondary)]"
                      : "w-2.5 bg-[var(--color-text-secondary)]/25 hover:bg-[var(--color-text-secondary)]/45"
                  )}
                />
              ))}
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[#016502]"
            >
              Xem tất cả sản phẩm
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </FadeUp>
    </SectionShell>
  );
}
