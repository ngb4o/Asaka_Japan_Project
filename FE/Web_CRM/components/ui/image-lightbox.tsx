"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "@/components/ui/icons";
import { getImageUrl } from "@/lib/api/uploads";
import { cn } from "@/lib/utils";

type ImageLightboxProps = {
  src: string | null;
  alt?: string;
  onClose: () => void;
};

/**
 * Suspend dialogs / bottom sheets under the lightbox so close/backdrop
 * clicks don't dismiss the parent sheet.
 */
function useSuspendUnderlyingLayers(
  active: boolean,
  selfRef: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!active) return;

    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        [
          "[data-radix-dialog-content]",
          "[data-radix-dialog-overlay]",
          "[data-bottom-sheet]",
        ].join(", ")
      )
    ).filter((node) => node !== selfRef.current);

    const prev = nodes.map((node) => ({
      node,
      inert: node.inert,
      pointerEvents: node.style.pointerEvents,
    }));

    nodes.forEach((node) => {
      node.inert = true;
      node.style.pointerEvents = "none";
    });

    document.body.setAttribute("data-image-lightbox-open", "");

    return () => {
      prev.forEach(({ node, inert, pointerEvents }) => {
        node.inert = inert;
        node.style.pointerEvents = pointerEvents;
      });
      if (!document.querySelector("[data-image-lightbox]")) {
        document.body.removeAttribute("data-image-lightbox-open");
      }
    };
  }, [active, selfRef]);
}

export function ImageLightbox({
  src,
  alt = "Xem ảnh",
  onClose,
}: ImageLightboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const open = Boolean(src);

  const close = useCallback(
    (event?: React.SyntheticEvent) => {
      event?.preventDefault();
      event?.stopPropagation();
      onClose();
    },
    [onClose]
  );

  useSuspendUnderlyingLayers(open, rootRef);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Capture so parent Dialog / BottomSheet don't also handle Escape
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={rootRef}
      data-image-lightbox=""
      className="pointer-events-auto fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => close(event)}>
      <div
        className={cn(
          "relative max-h-[90vh] max-w-[min(96vw,1100px)] overflow-hidden rounded-xl bg-black/40 shadow-2xl"
        )}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}>
        <button
          type="button"
          className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-sm transition hover:bg-black/70"
          aria-label="Đóng ảnh"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => close(event)}>
          <X className="h-5 w-5" />
        </button>
        <Image
          src={getImageUrl(src ?? undefined)}
          alt={alt}
          width={1600}
          height={1200}
          className="max-h-[90vh] w-auto max-w-full object-contain"
          unoptimized
          priority
        />
      </div>
    </div>,
    document.body
  );
}
