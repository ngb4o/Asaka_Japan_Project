"use client";

import { useEffect, useId, useMemo, useRef, useState, cloneElement } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
};

type SearchableSelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  searchable?: boolean;
  clearable?: boolean;
  id?: string;
  /** Custom trigger (e.g. icon button). Opens the same picker. */
  trigger?: React.ReactElement<{
    onClick?: (event: React.MouseEvent) => void;
    disabled?: boolean;
  }>;
  /** Close dropdown after selecting (default: true). Set false for filter panels. */
  closeOnSelect?: boolean;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  searchPlaceholder = "Tìm kiếm...",
  emptyText = "Không có kết quả",
  disabled = false,
  className,
  triggerClassName,
  searchable = true,
  clearable = false,
  id,
  trigger,
  closeOnSelect = true,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const pointerStartRef = useRef<{
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const listId = useId();
  const isMobile = useIsMobile();

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return options;

    return options.filter((option) => {
      const haystack = `${option.label} ${option.description || ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    // Desktop popover: autofocus search. Mobile sheet: let user tap
    // (Dialog focus-trap fights programmatic focus on portaled sheet).
    if (isMobile) return;

    const timer = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 10);

    return () => window.clearTimeout(timer);
  }, [open, isMobile]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    if (closeOnSelect) setOpen(false);
  }

  function handleOptionPointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
  }

  function handleOptionPointerMove(event: React.PointerEvent) {
    const start = pointerStartRef.current;
    if (!start || start.moved) return;
    if (
      Math.abs(event.clientX - start.x) > 8 ||
      Math.abs(event.clientY - start.y) > 8
    ) {
      start.moved = true;
    }
  }

  function handleOptionPointerUp(
    event: React.PointerEvent,
    nextValue: string
  ) {
    if (event.button !== 0) return;
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.moved) return;
    handleSelect(nextValue);
  }

  function handleOptionPointerCancel() {
    pointerStartRef.current = null;
  }

  const triggerClassNameMerged = cn(
    "flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-left text-sm text-[var(--color-text-primary)] shadow-sm transition-colors",
    "hover:border-[var(--color-text-secondary)]/40",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    open && "border-[var(--color-text-secondary)] ring-2 ring-[var(--color-text-secondary)]/20",
    triggerClassName
  );

  const triggerInner = (
    <>
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          !selected && "text-[var(--color-text-inverse)]"
        )}>
        {selected ? selected.label : placeholder}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[var(--color-text-inverse)]">
        {clearable && value ? (
          <span
            aria-label="Xóa lựa chọn"
            className="rounded p-0.5 hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onChange("");
            }}>
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <ChevronsUpDown className="h-4 w-4 opacity-70" />
      </span>
    </>
  );

  const panel = (
    <div>
      {searchable ? (
        <div
          className={cn(
            "border-b border-[var(--color-border-subtle)] p-3 md:p-2",
            isMobile && "sticky top-0 z-10 bg-[var(--color-surface-elevated)]"
          )}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              onPointerDown={(event) => {
                event.stopPropagation();
                const input = event.currentTarget;
                queueMicrotask(() => input.focus({ preventScroll: true }));
              }}
              className="h-11 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] py-2 pl-8 pr-3 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-inverse)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] md:h-9 md:text-sm"
            />
          </div>
        </div>
      ) : null}

      <div
        id={listId}
        role="listbox"
        className={cn(
          !isMobile && "max-h-60 overflow-y-auto p-1",
          isMobile && "divide-y divide-[var(--color-border-subtle)]"
        )}
        onWheel={(event) => event.stopPropagation()}
        onScroll={() => {
          if (pointerStartRef.current) pointerStartRef.current.moved = true;
        }}>
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-[var(--color-text-inverse)]">
            {emptyText}
          </p>
        ) : (
          filtered.map((option) => {
            const isSelected = option.value === value;

            return (
              <div
                key={option.value || "__empty"}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                className={cn(
                  "flex w-full cursor-pointer items-start gap-2 text-left transition-colors select-none",
                  isMobile
                    ? "rounded-none px-4 py-3.5 text-base"
                    : "rounded-lg px-3 py-2.5 text-sm",
                  isSelected
                    ? "bg-[var(--color-text-secondary)] text-white"
                    : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                )}
                onPointerDown={handleOptionPointerDown}
                onPointerMove={handleOptionPointerMove}
                onPointerUp={(event) =>
                  handleOptionPointerUp(event, option.value)
                }
                onPointerCancel={handleOptionPointerCancel}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelect(option.value);
                  }
                }}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 block truncate text-xs text-[var(--color-text-inverse)] md:text-xs">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                {isSelected ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const customTrigger = trigger
    ? cloneElement(trigger, {
        disabled: disabled || trigger.props.disabled,
        ...(isMobile
          ? {
              onClick: (event: React.MouseEvent) => {
                trigger.props.onClick?.(event);
                if (!disabled && !event.defaultPrevented) setOpen(true);
              },
            }
          : {}),
      })
    : null;

  // Wait for hydration
  if (isMobile === undefined) {
    return (
      <div className={cn(triggerClassNameMerged, className)}>
        <span className="min-w-0 flex-1 truncate text-[var(--color-text-inverse)]">
          {placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-[var(--color-text-inverse)] opacity-70" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className={cn(customTrigger ? "inline-flex" : "relative w-full", className)}>
        {customTrigger ? (
          customTrigger
        ) : (
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-expanded={open}
            aria-controls={listId}
            className={triggerClassNameMerged}
            onClick={() => {
              if (!disabled) setOpen(true);
            }}>
            {triggerInner}
          </button>
        )}
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title={placeholder === "Chọn..." ? "Chọn" : placeholder}>
          {panel}
        </BottomSheet>
      </div>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal>
      <div className={cn(customTrigger ? "inline-flex" : "relative w-full", className)}>
        {customTrigger ? (
          <Popover.Trigger asChild disabled={disabled}>
            {customTrigger}
          </Popover.Trigger>
        ) : (
          <Popover.Trigger asChild disabled={disabled}>
            <button
              type="button"
              id={id}
              disabled={disabled}
              aria-expanded={open}
              aria-controls={listId}
              className={triggerClassNameMerged}>
              {triggerInner}
            </button>
          </Popover.Trigger>
        )}

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 w-[var(--radix-popover-trigger-width)] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-elevated)] outline-none"
            onOpenAutoFocus={(event) => event.preventDefault()}>
            {panel}
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );
}
