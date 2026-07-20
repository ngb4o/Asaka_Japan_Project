"use client";

import { useState } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ProductImageGalleryProps = {
  images: string[];
  alt: string;
};

export function ProductImageGallery({ images, alt }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activeImage = images[activeIndex] || "";

  function openLightbox(index: number) {
    setActiveIndex(index);
    setLightboxOpen(true);
  }

  if (!activeImage) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] text-sm text-[var(--color-text-inverse)] sm:aspect-square lg:aspect-[4/5]">
        Chưa có ảnh
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => openLightbox(activeIndex)}
          className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] sm:aspect-square lg:aspect-[4/5]"
          aria-label={`Phóng to ảnh ${alt}`}
        >
          <Image
            src={activeImage}
            alt={alt}
            fill
            className="object-cover transition-transform duration-[400ms] group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            unoptimized={
              activeImage.startsWith("http") || activeImage.includes("localhost")
            }
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-[400ms] group-hover:bg-black/20">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[var(--color-text-secondary)] opacity-0 shadow-sm transition-opacity duration-[400ms] group-hover:opacity-100">
              <ZoomIn className="h-5 w-5" aria-hidden="true" />
            </span>
          </span>
        </button>

        {images.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                onDoubleClick={() => openLightbox(index)}
                aria-label={`Xem ảnh ${index + 1}`}
                aria-pressed={activeIndex === index}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                  activeIndex === index
                    ? "border-[var(--color-text-secondary)]"
                    : "border-[var(--color-border-subtle)] hover:border-[var(--color-text-secondary)]/40"
                )}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized={
                    image.startsWith("http") || image.includes("localhost")
                  }
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[min(96vw,56rem)] border-none bg-transparent p-0 shadow-none [&>button]:right-2 [&>button]:top-2 [&>button]:bg-white/15 [&>button]:text-white [&>button]:hover:bg-white/25 [&>button]:hover:opacity-100">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="relative flex max-h-[90vh] min-h-[240px] w-full items-center justify-center overflow-hidden rounded-[var(--radius-card)] bg-black/90 p-2 sm:p-4">
            <Image
              src={activeImage}
              alt={alt}
              width={1200}
              height={1200}
              className="max-h-[85vh] w-auto max-w-full object-contain"
              unoptimized={
                activeImage.startsWith("http") || activeImage.includes("localhost")
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
