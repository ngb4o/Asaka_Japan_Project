"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageGalleryProps = {
  images: string[];
  alt: string;
  /** Close callback — gallery unmounts when this changes from false→true */
  onClose: () => void;
};

const SWIPE_THRESHOLD = 48;

type SwipeTouch = { x: number; y: number };

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

function lockScroll() {
  const prev = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = prev;
  };
}

function ImageGalleryLightbox({ images, alt, onClose }: ImageGalleryProps) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<SwipeTouch | null>(null);
  const hasMultiple = images.length > 1;
  const activeImage = images[index] || "";

  useEffect(() => {
    return lockScroll();
  }, []);

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i < images.length - 1 ? i + 1 : 0));
  }, [images.length]);

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

  if (typeof document === "undefined") return null;

  let didSwipe = false;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`Xem ảnh ${alt}`}
      onTouchStart={(event) => {
        didSwipe = false;
        const touch = event.touches[0];
        if (!touch) return;
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        const touch = event.changedTouches[0];
        const end = touch ? { x: touch.clientX, y: touch.clientY } : null;
        if (!end) {
          touchStart.current = null;
          return;
        }
        const dir = resolveHorizontalSwipe(touchStart.current, end, hasMultiple);
        touchStart.current = null;
        if (dir === "next") {
          didSwipe = true;
          goNext();
        } else if (dir === "prev") {
          didSwipe = true;
          goPrev();
        }
      }}
      onClick={(event) => {
        if (didSwipe) {
          event.preventDefault();
          didSwipe = false;
        }
      }}>
      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {hasMultiple ? (
          <p className="text-sm font-medium text-white/80">{index + 1} / {images.length}</p>
        ) : (
          <span aria-hidden="true" />
        )}
        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10">
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
              className="absolute left-2 z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:inline-flex">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Ảnh sau"
              onClick={goNext}
              className="absolute right-2 z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:inline-flex">
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
            unoptimized
          />
        ) : null}
      </div>
    </div>,
    document.body
  );
}

type ImageGalleryProps2 = {
  images: string[];
  alt: string;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  lightboxOpen: boolean;
  onLightboxClose: () => void;
};

export function ImageGallery({
  images,
  alt,
  activeIndex,
  onIndexChange,
  lightboxOpen,
  onLightboxClose,
}: ImageGalleryProps2) {
  const hasMultiple = images.length > 1;
  const activeImage = images[activeIndex] || "";

  if (!activeImage) {
    return (
      <div className="flex h-full items-center justify-center bg-white text-sm text-[var(--color-text-inverse)]">
        Chưa có ảnh
      </div>
    );
  }

  return (
    <>
      <div className="relative h-full w-full">
        <Image
          src={activeImage}
          alt={alt}
          fill
          className="object-cover"
          sizes="100vw"
          priority
          unoptimized
        />
        <span className="absolute inset-0 hidden items-center justify-center bg-black/0 transition-colors duration-200 hover:bg-black/20 sm:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[var(--color-text-secondary)] opacity-0 shadow-sm transition-opacity duration-200 hover:opacity-100 sm:h-11 sm:w-11">
            <ZoomIn className="h-5 w-5" aria-hidden="true" />
          </span>
        </span>
      </div>

      {hasMultiple ? (
        <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-black/30 p-1.5 backdrop-blur-sm sm:bottom-3 sm:rounded-xl sm:p-2">
          <div className="flex max-w-full gap-1.5 overflow-x-auto">
            {images.map((image, i) => (
              <button
                key={`${image}-${i}`}
                type="button"
                onClick={() => onIndexChange(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-pressed={activeIndex === i}
                className={cn(
                  "relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-colors sm:h-14 sm:w-14 sm:rounded-xl",
                  activeIndex === i
                    ? "border-[var(--color-text-secondary)]"
                    : "border-[var(--color-border-subtle)] hover:border-[var(--color-text-secondary)]/40"
                )}>
                <Image
                  src={image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {lightboxOpen ? (
        <ImageGalleryLightbox
          images={images}
          alt={alt}
          onClose={onLightboxClose}
        />
      ) : null}
    </>
  );
}
