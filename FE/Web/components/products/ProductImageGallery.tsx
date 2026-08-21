"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { lockAppScroll } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";

type ProductImageGalleryProps = {
  images: string[];
  alt: string;
  fit?: "cover" | "contain";
  /** Stretch the main image to fill the parent box. */
  fill?: boolean;
};

const SWIPE_THRESHOLD = 48;

type SwipeTouch = {
  x: number;
  y: number;
};

function resolveHorizontalSwipe(
  start: SwipeTouch | null,
  end: SwipeTouch,
  hasMultiple: boolean
): "prev" | "next" | null {
  if (!hasMultiple || !start) return null;

  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;

  if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) {
    return null;
  }

  return deltaX < 0 ? "next" : "prev";
}

function useSwipeNavigation(
  hasMultiple: boolean,
  index: number,
  total: number,
  onIndexChange: (index: number) => void
) {
  const touchStart = useRef<SwipeTouch | null>(null);

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + total) % total);
  }, [index, onIndexChange, total]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % total);
  }, [index, onIndexChange, total]);

  const bindSwipeHandlers = useCallback(
    (onTap?: () => void) => {
      let didSwipe = false;

      return {
        onTouchStart: (event: React.TouchEvent) => {
          didSwipe = false;
          const touch = event.touches[0];
          if (!touch) return;
          touchStart.current = { x: touch.clientX, y: touch.clientY };
        },
        onTouchEnd: (event: React.TouchEvent) => {
          const touch = event.changedTouches[0];
          const end = touch
            ? { x: touch.clientX, y: touch.clientY }
            : null;
          if (!end) {
            touchStart.current = null;
            return;
          }

          const direction = resolveHorizontalSwipe(
            touchStart.current,
            end,
            hasMultiple
          );
          touchStart.current = null;

          if (direction === "next") {
            didSwipe = true;
            goNext();
            return;
          }
          if (direction === "prev") {
            didSwipe = true;
            goPrev();
            return;
          }

          onTap?.();
        },
        onClick: (event: React.MouseEvent) => {
          if (didSwipe) {
            event.preventDefault();
            didSwipe = false;
          }
        },
      };
    },
    [goNext, goPrev, hasMultiple]
  );

  return { goPrev, goNext, bindSwipeHandlers };
}

type GalleryLightboxProps = {
  images: string[];
  alt: string;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

function GalleryLightbox({
  images,
  alt,
  index,
  onIndexChange,
  onClose,
}: GalleryLightboxProps) {
  const hasMultiple = images.length > 1;
  const { goPrev, goNext, bindSwipeHandlers } = useSwipeNavigation(
    hasMultiple,
    index,
    images.length,
    onIndexChange
  );
  const swipeHandlers = bindSwipeHandlers();

  useEffect(() => {
    return lockAppScroll();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (!hasMultiple) return;
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, hasMultiple, onClose]);

  const activeImage = images[index] || "";

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`Xem ảnh ${alt}`}
      {...swipeHandlers}
    >
      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {hasMultiple ? (
          <p className="text-[length:var(--text-sm)] font-medium text-white/80">
            {index + 1} / {images.length}
          </p>
        ) : (
          <span aria-hidden="true" />
        )}
        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {hasMultiple ? (
          <>
            <button
              type="button"
              aria-label="Ảnh trước"
              onClick={goPrev}
              className="absolute left-2 z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:inline-flex"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Ảnh sau"
              onClick={goNext}
              className="absolute right-2 z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:inline-flex"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        ) : null}

        {activeImage ? (
          <Image
            src={activeImage}
            alt={alt}
            width={1400}
            height={1400}
            className="max-h-full max-w-full object-contain"
            draggable={false}
            unoptimized={
              activeImage.startsWith("http") || activeImage.includes("localhost")
            }
          />
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export function ProductImageGallery({
  images,
  alt,
  fit = "cover",
  fill = false,
}: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activeImage = images[activeIndex] || "";
  const hasMultiple = images.length > 1;
  const { bindSwipeHandlers } = useSwipeNavigation(
    hasMultiple,
    activeIndex,
    images.length,
    setActiveIndex
  );

  function openLightbox(index: number) {
    setActiveIndex(index);
    setLightboxOpen(true);
  }

  const { onTouchStart, onTouchEnd, onClick: guardSwipeClick } = bindSwipeHandlers();

  const isContain = fit === "contain";
  const frameClassName = fill
    ? "h-full w-full min-h-0"
    : isContain
      ? "aspect-[4/5] w-full sm:aspect-square lg:aspect-[4/3]"
      : "aspect-[4/5] w-full sm:aspect-square lg:aspect-[4/5]";
  const imageClassName = isContain
    ? fill
      ? "object-contain p-1 sm:p-4"
      : "object-contain p-0 sm:p-6"
    : "object-cover transition-transform duration-[400ms] group-hover:scale-[1.02]";

  if (!activeImage) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-white text-[length:var(--text-sm)] text-[var(--color-text-inverse)]",
          fill
            ? "h-full min-h-0 rounded-none"
            : "rounded-2xl border border-[var(--color-border-subtle)]",
          frameClassName
        )}
      >
        Chưa có ảnh
      </div>
    );
  }

  return (
    <>
      <div className={cn(fill ? "flex h-full min-h-0 flex-col" : "space-y-2 sm:space-y-3")}>
        <button
          type="button"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={(event) => {
            guardSwipeClick(event);
            if (!event.defaultPrevented) openLightbox(activeIndex);
          }}
          className={cn(
            "group relative block overflow-hidden bg-white touch-pan-y",
            fill
              ? "min-h-0 flex-1 rounded-none border-0 shadow-none"
              : "rounded-2xl border border-[var(--color-border-subtle)] shadow-[var(--shadow-soft)]",
            frameClassName
          )}
          aria-label={
            hasMultiple
              ? `Ảnh ${activeIndex + 1} của ${alt}. Vuốt để xem ảnh khác, chạm để phóng to.`
              : `Phóng to ảnh ${alt}`
          }
        >
          <Image
            src={activeImage}
            alt={alt}
            fill
            className={imageClassName}
            sizes="100vw"
            priority
            unoptimized={
              activeImage.startsWith("http") || activeImage.includes("localhost")
            }
          />
          <span className="absolute inset-0 hidden items-center justify-center bg-black/0 transition-colors duration-[400ms] group-hover:bg-black/20 sm:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[var(--color-text-secondary)] opacity-0 shadow-sm transition-opacity duration-[400ms] group-hover:opacity-100 sm:h-11 sm:w-11">
              <ZoomIn className="h-5 w-5" aria-hidden="true" />
            </span>
          </span>
        </button>

        {images.length > 1 ? (
          <div
            className={cn(
              "flex w-max max-w-full gap-1.5 overflow-x-auto pb-0.5 sm:gap-2 sm:pb-1",
              fill
                ? "absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-black/30 p-1.5 backdrop-blur-sm sm:bottom-3 sm:rounded-xl sm:p-2"
                : "mx-auto px-0.5"
            )}
          >
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                onDoubleClick={() => openLightbox(index)}
                aria-label={`Xem ảnh ${index + 1}`}
                aria-pressed={activeIndex === index}
                className={cn(
                  "relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-colors sm:h-14 sm:w-14 sm:rounded-xl lg:h-16 lg:w-16",
                  activeIndex === index
                    ? "border-[var(--color-text-secondary)]"
                    : "border-[var(--color-border-subtle)] hover:border-[var(--color-text-secondary)]/40"
                )}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  className={isContain ? "object-contain p-0.5 sm:p-1" : "object-cover"}
                  sizes="(max-width: 640px) 40px, 64px"
                  unoptimized={
                    image.startsWith("http") || image.includes("localhost")
                  }
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {lightboxOpen ? (
        <GalleryLightbox
          images={images}
          alt={alt}
          index={activeIndex}
          onIndexChange={setActiveIndex}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </>
  );
}
