"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Quote } from "lucide-react";
import { TESTIMONIALS } from "@/lib/constants";
import { SectionShell } from "@/components/layout/SectionShell";
import { Badge } from "@/components/ui/badge";
import { FadeUp } from "@/components/motion/FadeUp";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { cn } from "@/lib/utils";

export function TestimonialsSection() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollCarousel = useCallback(
    (direction: 1 | -1) => {
      const carousel = carouselRef.current;
      if (!carousel) return;

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
    [prefersReducedMotion]
  );

  useEffect(() => {
    if (isInteractionPaused || prefersReducedMotion) return;

    const interval = window.setInterval(() => scrollCarousel(1), 2500);
    return () => window.clearInterval(interval);
  }, [isInteractionPaused, prefersReducedMotion, scrollCarousel]);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const syncActive = () => {
      const firstCard = carousel.firstElementChild as HTMLElement | null;
      if (!firstCard) return;
      const gap = Number.parseFloat(
        window.getComputedStyle(carousel).columnGap || "0"
      );
      const step = firstCard.offsetWidth + gap;
      const index = Math.round(carousel.scrollLeft / step);
      setActiveIndex(Math.min(Math.max(index, 0), TESTIMONIALS.length - 1));
    };

    carousel.addEventListener("scroll", syncActive, { passive: true });
    syncActive();
    return () => carousel.removeEventListener("scroll", syncActive);
  }, []);

  return (
    <SectionShell
      id="testimonials"
      eyebrow="Khách hàng nói gì"
      title="Niềm tin từ đối tác và nông dân"
      subtitle="Phản hồi thực tế từ mạng lưới đại lý và cộng đồng nông dân trên cả nước."
      className="organic-bg"
    >
      <FadeUp>
        <div className="relative">
          <div
            ref={carouselRef}
            role="region"
            aria-label="Đánh giá từ khách hàng"
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
            {TESTIMONIALS.map((testimonial, index) => (
              <blockquote
                key={`${testimonial.author}-${index}`}
                className="flex w-[calc((100%_-_12px)/2)] shrink-0 snap-start flex-col rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3 sm:w-[calc((100%_-_32px)/2)] sm:rounded-[var(--radius-card)] sm:p-4 lg:w-[calc((100%_-_48px)/3)] lg:p-6"
              >
                <Quote
                  className="h-6 w-6 text-[var(--color-text-secondary)]/40 sm:h-8 sm:w-8 lg:h-10 lg:w-10"
                  aria-hidden="true"
                />
                <Badge variant="outline" className="mt-3 w-fit text-[10px] sm:mt-4 sm:text-[length:var(--text-xs)]">
                  {testimonial.type === "dealer" ? "Đại lý" : "Nông dân"}
                </Badge>
                <p className="mt-3 line-clamp-4 flex-1 text-[length:var(--text-xs)] font-normal leading-relaxed text-[var(--color-text-inverse)] sm:mt-4 sm:line-clamp-5 sm:text-[length:var(--text-sm)] lg:mt-5 lg:text-[length:var(--text-md)]">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <footer className="mt-4 flex items-center gap-2 border-t border-[var(--color-border-subtle)] pt-3 sm:mt-6 sm:gap-4 sm:pt-5">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--color-surface-muted)] ring-2 ring-[var(--color-text-secondary)]/15 sm:h-14 sm:w-14 lg:h-16 lg:w-16">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.alt}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <cite className="min-w-0 not-italic">
                    <span className="block truncate text-[length:var(--text-xs)] font-semibold text-[var(--color-text-primary)] sm:text-[length:var(--text-sm)] lg:text-[length:var(--text-md)]">
                      {testimonial.author}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] font-normal text-[var(--color-text-inverse)] sm:mt-1 sm:text-[length:var(--text-xs)] lg:text-[length:var(--text-sm)]">
                      {testimonial.role}
                    </span>
                  </cite>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>

        <div
          className="mt-2 flex items-center justify-center gap-2"
          role="tablist"
          aria-label="Vị trí đánh giá trong carousel"
        >
          {TESTIMONIALS.map((testimonial, index) => (
            <button
              key={`dot-${testimonial.author}-${index}`}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              aria-label={`Đến đánh giá ${index + 1}: ${testimonial.author}`}
              onClick={() => {
                const carousel = carouselRef.current;
                const card = carousel?.children[index] as
                  | HTMLElement
                  | undefined;
                card?.scrollIntoView({
                  behavior: prefersReducedMotion ? "auto" : "smooth",
                  inline: "start",
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
      </FadeUp>
    </SectionShell>
  );
}
