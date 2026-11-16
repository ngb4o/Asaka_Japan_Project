"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Filter, X } from "lucide-react";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function FilterTrigger({
  open,
  activeCount = 0,
  onClick,
}: {
  open: boolean;
  activeCount?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Bộ lọc"
      aria-expanded={open}
      onClick={onClick}
      className={`crm-toolbar-elevated relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] ${
        open ? "border-[var(--color-text-secondary)] bg-[var(--color-surface-muted)]" : "border-[var(--color-border-subtle)]"
      }`}
    >
      <Filter className="h-4 w-4" />
      {activeCount > 0 ? (
        <span className="absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-text-secondary)] px-1 text-[11px] font-bold text-white">
          {activeCount}
        </span>
      ) : null}
    </button>
  );
}

function FilterFooter({
  canClear,
  onClear,
  onDone,
}: {
  canClear: boolean;
  onClear?: () => void;
  onDone: () => void;
}) {
  return (
    <div className={`grid gap-2 ${canClear && onClear ? "grid-cols-2" : "grid-cols-1"}`}>
      {canClear && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-sm font-semibold hover:bg-[var(--color-surface-muted)]"
        >
          Xóa lọc
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDone}
        className="inline-flex h-10 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] text-sm font-semibold text-white hover:bg-[#016502]"
      >
        Xong
      </button>
    </div>
  );
}

export function FilterDrawer({
  open,
  onOpenChange,
  onApply,
  onClear,
  title = "Bộ lọc",
  draftCount = 0,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: () => void;
  onClear?: () => void;
  title?: string;
  draftCount?: number;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  const footer = <FilterFooter canClear={draftCount > 0} onClear={onClear} onDone={onApply} />;

  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" aria-label="Đóng bộ lọc" className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
        <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-[var(--color-surface-elevated)] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.22)]">
          <div className="flex shrink-0 flex-col items-center pt-2">
            <div className="mb-1 h-1 w-10 rounded-full bg-[var(--color-border-subtle)]" />
            <div className="relative flex w-full items-center justify-center border-b border-[var(--color-border-subtle)] px-12 pt-1 pb-3">
              <p className="truncate text-base font-semibold">{title}</p>
              <button
                type="button"
                aria-label="Đóng"
                className="absolute top-1/2 right-3 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)]"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">{children}</div>
          </div>
          <div className="shrink-0 border-t border-[var(--color-border-subtle)] p-4">{footer}</div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Đóng bộ lọc" className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <aside className="absolute top-0 right-0 flex h-full w-[min(100vw-2.5rem,380px)] flex-col border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-2xl">
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-base font-semibold">{title}</p>
          <button
            type="button"
            aria-label="Đóng"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)]"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">{children}</div>
        </div>
        <div className="shrink-0 border-t border-[var(--color-border-subtle)] p-4">{footer}</div>
      </aside>
    </div>,
    document.body
  );
}
