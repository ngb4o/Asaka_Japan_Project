"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Eye } from "@/components/ui/icons";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { getImageUrl } from "@/lib/api/uploads";
import { cn } from "@/lib/utils";

type PreviewableImageProps = {
  src: string;
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
};

/**
 * Thumbnail that opens ImageLightbox on click and shows an Eye icon on hover.
 */
export function PreviewableImage({
  src,
  alt = "Xem ảnh",
  className,
  imgClassName,
  fill = false,
  children,
  overlayClassName,
}: PreviewableImageProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const COMPANY_LOGO = "/images/brand/logo.png";

  useEffect(() => {
    setBroken(false);
  }, [src]);

  const resolved = broken || !src ? COMPANY_LOGO : src;
  const displaySrc = getImageUrl(resolved) || COMPANY_LOGO;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setPreviewSrc(resolved);
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
            broken || !src ? "object-contain p-2" : "object-cover",
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

      <ImageLightbox
        src={previewSrc}
        alt={alt}
        onClose={() => setPreviewSrc(null)}
      />
    </>
  );
}
