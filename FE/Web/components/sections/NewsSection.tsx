"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { NEWS_ARTICLES } from "@/lib/constants";
import { getLatestNews, type NewsCard } from "@/lib/api/news";
import { SectionShell } from "@/components/layout/SectionShell";
import { FadeUp } from "@/components/motion/FadeUp";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { isApiId } from "@/lib/format";
import { cn } from "@/lib/utils";

const FALLBACK_NEWS: NewsCard[] = NEWS_ARTICLES.map((article, index) => ({
  id: `fallback-${index}`,
  title: article.title,
  excerpt: article.excerpt,
  date: article.date,
  dateIso: article.date.split("/").reverse().join("-"),
  image: article.image,
  alt: article.alt,
  displayOrder: index,
}));

export function NewsSection() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [articles, setArticles] = useState<NewsCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      setLoading(true);
      try {
        const items = await getLatestNews(12);
        if (!cancelled) {
          setArticles(items.length > 0 ? items : FALLBACK_NEWS);
        }
      } catch {
        if (!cancelled) {
          setArticles(FALLBACK_NEWS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadNews();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollCarousel = useCallback(
    (direction: 1 | -1) => {
      const carousel = carouselRef.current;
      if (!carousel || articles.length === 0) return;

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
    [prefersReducedMotion, articles.length]
  );

  useEffect(() => {
    if (isInteractionPaused || prefersReducedMotion || articles.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => scrollCarousel(1), 2500);
    return () => window.clearInterval(interval);
  }, [isInteractionPaused, prefersReducedMotion, scrollCarousel, articles.length]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || articles.length === 0) return;

    const syncActive = () => {
      const firstCard = carousel.firstElementChild as HTMLElement | null;
      if (!firstCard) return;
      const gap = Number.parseFloat(
        window.getComputedStyle(carousel).columnGap || "0"
      );
      const step = firstCard.offsetWidth + gap;
      const index = Math.round(carousel.scrollLeft / step);
      setActiveIndex(Math.min(Math.max(index, 0), articles.length - 1));
    };

    carousel.addEventListener("scroll", syncActive, { passive: true });
    syncActive();
    return () => carousel.removeEventListener("scroll", syncActive);
  }, [articles.length]);

  return (
    <SectionShell
      id="news"
      eyebrow="Tin tức"
      title="Tin tức mới nhất"
      subtitle="Cập nhật sản phẩm, sự kiện và hoạt động của ASAKA JAPAN."
    >
      <FadeUp>
        {loading ? (
          <div className="flex gap-3 overflow-hidden sm:gap-4 lg:gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="w-[calc((100%_-_12px)/2)] shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)] sm:w-[calc((100%_-_32px)/2)] lg:w-[calc((100%_-_48px)/3)]"
              >
                <div className="aspect-[4/5] animate-pulse bg-[var(--color-surface-muted)] sm:aspect-[16/10]" />
                <div className="space-y-3 p-3 sm:p-5">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-[var(--color-surface-muted)] sm:h-3 sm:w-24" />
                  <div className="h-4 w-full animate-pulse rounded bg-[var(--color-surface-muted)]" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--color-surface-muted)]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            <div
              ref={carouselRef}
              role="region"
              aria-label="Danh sách tin tức"
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
              {articles.map((article) => {
                const cardClassName =
                  "group flex w-[calc((100%_-_12px)/2)] shrink-0 snap-start flex-col overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)] transition-all duration-[400ms] hover:-translate-y-1 sm:w-[calc((100%_-_32px)/2)] lg:w-[calc((100%_-_48px)/3)]";
                const cardContent = (
                  <>
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--color-surface-muted)] sm:aspect-[16/10]">
                      {article.image ? (
                        <Image
                          src={article.image}
                          alt={article.alt}
                          fill
                          className="object-cover transition-transform duration-[600ms] group-hover:scale-[1.08]"
                          sizes="(max-width: 1024px) 50vw, 30vw"
                          unoptimized={
                            article.image.startsWith("http") ||
                            article.image.includes("localhost")
                          }
                        />
                      ) : (
                        <div className="h-full w-full bg-[var(--color-surface-muted)]" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3 sm:p-5">
                      {article.date ? (
                        <p className="flex items-center gap-1 text-[10px] font-normal leading-none text-[var(--color-text-inverse)] sm:gap-2 sm:text-[length:var(--text-xs)]">
                          <Calendar className="h-3 w-3 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
                          <time dateTime={article.dateIso}>{article.date}</time>
                        </p>
                      ) : null}
                      <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-[var(--color-text-primary)] sm:mt-3 sm:text-[length:var(--text-lg)]">
                        {article.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-xs font-normal leading-relaxed text-[var(--color-text-inverse)] sm:line-clamp-3 sm:text-[length:var(--text-sm)]">
                        {article.excerpt}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-2 pt-3 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors group-hover:text-[#016502] sm:pt-4 sm:text-[length:var(--text-sm)]">
                        Đọc thêm
                        <ArrowRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </span>
                    </div>
                  </>
                );

                return isApiId(article.id) ? (
                  <Link
                    key={article.id}
                    href={`/news/${article.id}`}
                    className={cardClassName}
                  >
                    {cardContent}
                  </Link>
                ) : (
                  <article key={article.id} className={cardClassName}>
                    <Link href="#contact" className="flex flex-1 flex-col">
                      {cardContent}
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {!loading && articles.length > 0 ? (
          <div
            className="mt-2 flex items-center justify-center gap-2"
            role="tablist"
            aria-label="Vị trí tin tức trong carousel"
          >
            {articles.map((article, index) => (
              <button
                key={`dot-${article.id}`}
                type="button"
                role="tab"
                aria-selected={activeIndex === index}
                aria-label={`Đến tin ${index + 1}: ${article.title}`}
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
        ) : null}
      </FadeUp>
    </SectionShell>
  );
}
