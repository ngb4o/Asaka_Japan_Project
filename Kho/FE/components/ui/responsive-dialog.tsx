"use client";

import { useEffect, useState, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Layer = "filter" | "dialog" | "sheet";

const layerClass: Record<Layer, string> = {
  filter: "z-[70]",
  dialog: "z-[80]",
  sheet: "z-[90]",
};

let scrollLocks = 0;
let previousOverflow = "";

function lockScroll() {
  if (scrollLocks === 0) previousOverflow = document.body.style.overflow;
  scrollLocks += 1;
  document.body.style.overflow = "hidden";
  return () => {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) document.body.style.overflow = previousOverflow;
  };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(media.matches);
    update();
    setReady(true);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return { isMobile, ready };
}

export function BottomSheet({
  title,
  ariaLabel,
  onClose,
  children,
  footer,
  layer = "sheet",
  rootRef,
  showClose = true,
}: {
  title?: string;
  ariaLabel?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  layer?: Layer;
  rootRef?: Ref<HTMLDivElement>;
  showClose?: boolean;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    const timer = window.setTimeout(() => setEntered(true), 32);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      onClose();
    }
    const unlock = lockScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div ref={rootRef} data-bottom-sheet="" className={`fixed inset-0 ${layerClass[layer]}`} role="dialog" aria-modal="true" aria-label={ariaLabel || title || "Hộp thoại"}>
      <button
        type="button"
        aria-label="Đóng"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${entered ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-2xl bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] shadow-[0_-12px_40px_rgba(0,0,0,0.22)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${entered ? "translate-y-0" : "translate-y-full"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex shrink-0 flex-col items-center pt-2">
          <div className="mb-1 h-1 w-10 rounded-full bg-[var(--color-border-subtle)]" aria-hidden />
          {title ? (
            <div className="relative flex w-full items-center justify-center border-b border-[var(--color-border-subtle)] px-12 pt-1 pb-3">
              <p className="truncate text-center text-base font-semibold tracking-tight">{title}</p>
              {showClose ? (
                <button
                  type="button"
                  aria-label="Đóng"
                  className="absolute top-1/2 right-3 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain [&_[data-slot=dialog-footer]]:grid [&_[data-slot=dialog-footer]]:w-full [&_[data-slot=dialog-footer]]:grid-cols-2 [&_[data-slot=dialog-footer]]:gap-2 [&_[data-slot=dialog-footer]:has(>:only-child)]:grid-cols-1 [&_[data-slot=dialog-footer]>button]:w-full">
          {children}
        </div>
        {footer ? <div className="shrink-0 border-t border-[var(--color-border-subtle)] p-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

export function ResponsiveDialog({
  label,
  onClose,
  children,
  className = "max-w-lg",
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const { isMobile, ready } = useIsMobile();
  if (!ready) return null;

  if (isMobile) {
    return (
      <BottomSheet ariaLabel={label} onClose={onClose} layer="dialog" showClose={false}>
        {children}
      </BottomSheet>
    );
  }

  return (
    <DesktopDialog label={label} onClose={onClose} className={className}>
      {children}
    </DesktopDialog>
  );
}

function DesktopDialog({
  label,
  onClose,
  children,
  className,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className: string;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      onClose();
    }
    const unlock = lockScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={`fixed inset-0 ${layerClass.dialog} flex items-center justify-center p-4`} role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative flex max-h-[min(90dvh,calc(100dvh-2rem))] w-full flex-col overflow-hidden rounded-xl bg-[var(--color-surface-elevated)] shadow-xl ${className}`}>
        {children}
      </div>
    </div>,
    document.body
  );
}
