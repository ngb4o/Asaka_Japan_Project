"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  activeCount?: number;
  onClear?: () => void;
  children: ReactNode;
  className?: string;
};

/**
 * Mobile filter panel — slides in from the right (mirror of the menu drawer).
 */
export function FilterDrawer({
  open,
  onOpenChange,
  title = "Bộ lọc",
  activeCount = 0,
  onClear,
  children,
  className,
}: FilterDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(max-width: 767px)");
    if (!mq.matches) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!window.matchMedia("(max-width: 767px)").matches) return;
      onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Đóng bộ lọc"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 z-10 flex h-full w-[min(100vw-2.5rem,320px)] flex-col border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] shadow-2xl",
          className
        )}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold tracking-tight">
              {title}
            </p>
            {activeCount > 0 ? (
              <p className="mt-0.5 text-xs text-[var(--color-text-inverse)]">
                Đang áp dụng {activeCount} bộ lọc
              </p>
            ) : null}
          </div>
          {activeCount > 0 && onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
            >
              Xóa lọc
            </Button>
          ) : null}
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="space-y-4">{children}</div>
        </div>

        <div className="shrink-0 border-t border-[var(--color-border-subtle)] p-4">
          <Button
            type="button"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Xong
          </Button>
        </div>
      </aside>
    </div>
  );
}
