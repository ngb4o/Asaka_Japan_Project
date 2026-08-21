"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Eye } from "@/components/ui/icons";
import { ImageGallery } from "@/components/ui/image-gallery";
import { getImageUrl } from "@/lib/api/uploads";
import { cn } from "@/lib/utils";

type PreviewableImageProps = {
  src?: string;
  alt?: string;
  /** Outer size / layout classes when not using `fill` */
  className?: string;
  imgClassName?: string;
  /** Stretch to parent (parent must be `relative` with size) */
  fill?: boolean;
  /** Overlay badges / counters inside the thumb */
  children?: ReactNode;
  /** Extra class on the hover eye overlay */
  overlayClassName?: string;
  /** Full list of images for lightbox navigation */
  images?: string[];
};

/**
 * Thumbnail that opens ImageGallery fullscreen on click.
 */
export function PreviewableImage({
  src,
  alt = "Xem ảnh",
  className,
  imgClassName,
  fill = false,
  children,
  overlayClassName,
  images,
}: PreviewableImageProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const COMPANY_LOGO = "/images/brand/logo.png";

  useEffect(() => {
    setBroken(false);
    setActiveIndex(0);
  }, [src]);

  const allImages = images?.length ? images : src ? [src] : [];
  const displayThumb = allImages[0];
  const resolved = broken || !displayThumb ? COMPANY_LOGO : displayThumb;
  const displaySrc = getImageUrl(resolved) || COMPANY_LOGO;

  function openLightbox(index: number) {
    setActiveIndex(index);
    setLightboxOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openLightbox(0);
        }}
        aria-label={alt}
        className={cn(
          "group relative block overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]",
          fill ? "absolute inset-0 h-full w-full" : "relative shrink-0",
          className
        )}>
        <Image
          src={displaySrc}
          alt={alt}
          fill
          className={cn(
            broken || !displayThumb ? "object-contain p-2" : "object-cover",
            imgClassName
          )}
          unoptimized
          onError={() => setBroken(true)}
        />
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/45 group-hover:opacity-100 group-focus-visible:bg-black/45 group-focus-visible:opacity-100",
            overlayClassName
          )}
          aria-hidden>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white shadow-sm">
            <Eye className="h-4 w-4" />
          </span>
        </span>
        {children}
      </button>

      {lightboxOpen && (
        <ImageGallery
          images={allImages}
          alt={alt}
          activeIndex={activeIndex}
          onIndexChange={setActiveIndex}
          lightboxOpen={lightboxOpen}
          onLightboxClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
