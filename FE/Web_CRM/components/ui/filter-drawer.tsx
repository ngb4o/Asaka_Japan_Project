"use client";

import { useEffect, type ReactNode } from "react";
import { Filter, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { cn } from "@/lib/utils";

type FilterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Apply draft filters — called when pressing Xong */
  onApply: () => void;
  title?: string;
  /** Count of draft filter values (controls Xóa lọc visibility) */
  draftCount?: number;
  /** Badge count on trigger should use applied filters separately */
  onClear?: () => void;
  children: ReactNode;
  className?: string;
};

type FilterTriggerProps = {
  open: boolean;
  activeCount?: number;
  onClick: () => void;
  className?: string;
};

export type FilterOption = {
  value: string;
  label: string;
};

type FilterOptionListProps = {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  placeholder?: string;
};

export function FilterTrigger({
  open,
  activeCount = 0,
  onClick,
  className,
}: FilterTriggerProps) {
  return (
    <button
      type="button"
      aria-label="Bộ lọc"
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]",
        open &&
          "border-[var(--color-text-secondary)] bg-[var(--color-surface-muted)]",
        className
      )}>
      <Filter className="h-4 w-4" />
      {activeCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-text-secondary)] px-1 text-[10px] font-bold text-white">
          {activeCount}
        </span>
      ) : null}
    </button>
  );
}

/** Compact dropdown field for filter panels. */
export function FilterOptionList({
  label,
  options,
  value,
  onChange,
  searchable = false,
  searchPlaceholder = "Tìm...",
  placeholder = "Chọn...",
}: FilterOptionListProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <SearchableSelect
        options={options}
        value={value}
        onChange={onChange}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        placeholder={placeholder}
        clearable
      />
    </div>
  );
}

function FilterFooter({
  onClear,
  onDone,
  canClear,
}: {
  onClear?: () => void;
  onDone: () => void;
  canClear: boolean;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        canClear && onClear ? "grid-cols-2" : "grid-cols-1"
      )}>
      {canClear && onClear ? (
        <Button type="button" variant="outline" onClick={onClear}>
          Xóa lọc
        </Button>
      ) : null}
      <Button type="button" onClick={onDone}>
        Xong
      </Button>
    </div>
  );
}

function FilterPanelBody({
  onClear,
  onDone,
  canClear,
  children,
}: {
  onClear?: () => void;
  onDone: () => void;
  canClear: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <div className="space-y-4 px-4 py-4">{children}</div>
      <div className="sticky bottom-0 shrink-0 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-4">
        <FilterFooter onClear={onClear} onDone={onDone} canClear={canClear} />
      </div>
    </>
  );
}

/**
 * Filter panel:
 * - Mobile: BottomSheet
 * - Desktop: right-side drawer
 */
export function FilterDrawer({
  open,
  onOpenChange,
  onApply,
  title = "Bộ lọc",
  draftCount = 0,
  onClear,
  children,
  className,
}: FilterDrawerProps) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open || isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || isMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange, isMobile]);

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        maxHeight="85dvh"
        className={className}>
        <FilterPanelBody
          canClear={draftCount > 0}
          onClear={onClear}
          onDone={onApply}>
          {children}
        </FilterPanelBody>
      </BottomSheet>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition-opacity duration-200",
        open
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-hidden={!open}>
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        className="absolute inset-0 bg-black/50"
        aria-label="Đóng bộ lọc"
        onClick={() => onOpenChange(false)}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 z-10 flex h-full w-[min(100vw-2.5rem,360px)] flex-col border-l border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] shadow-2xl transition-transform duration-300 ease-out sm:w-[380px]",
          open ? "translate-x-0" : "translate-x-full",
          className
        )}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}>
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold tracking-tight">
              {title}
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="space-y-4">{children}</div>
        </div>
        <div className="shrink-0 border-t border-[var(--color-border-subtle)] p-4">
          <FilterFooter
            canClear={draftCount > 0}
            onClear={onClear}
            onDone={onApply}
          />
        </div>
      </aside>
    </div>
  );
}
