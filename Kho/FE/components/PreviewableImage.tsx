"use client";

import { Eye, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type PreviewableImageProps = {
  src: string;
  alt: string;
};

export function PreviewableImage({ src, alt }: PreviewableImageProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={alt}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className="group absolute inset-0 block h-full w-full overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/45 group-hover:opacity-100 group-focus-visible:bg-black/45 group-focus-visible:opacity-100">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white shadow-sm">
            <Eye className="h-4 w-4" />
          </span>
        </span>
      </button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4"
              role="dialog"
              aria-modal="true"
              aria-label={alt}
              onClick={() => setOpen(false)}
            >
              <button
                type="button"
                aria-label="Đóng ảnh"
                className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-sm hover:bg-black/70"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                }}
              >
                <X className="h-5 w-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-h-[90vh] w-auto max-w-[min(96vw,1100px)] rounded-xl object-contain shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
