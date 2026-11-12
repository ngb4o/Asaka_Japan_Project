"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { foldText } from "@/lib/text";

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
  searchable?: boolean;
  clearable?: boolean;
  id?: string;
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  searchPlaceholder = "Tìm kiếm...",
  emptyText = "Không có kết quả",
  disabled = false,
  searchable = true,
  clearable = false,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const keyword = foldText(query.trim());
    if (!keyword) return options;
    return options.filter((option) => {
      const haystack = foldText(`${option.label} ${option.description || ""}`);
      return haystack.includes(keyword);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const timer = window.setTimeout(() => searchRef.current?.focus(), 10);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-left text-sm text-[var(--color-text-primary)] shadow-sm transition-colors",
          "hover:border-[var(--color-text-secondary)]/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-[var(--color-text-secondary)] ring-2 ring-[var(--color-text-secondary)]/20"
        )}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-[var(--color-text-inverse)]")}>
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
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronsUpDown className="h-4 w-4 opacity-70" />
        </span>
      </button>

      {open ? (
        <div className="absolute z-[80] mt-1.5 w-full min-w-[12rem] overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-elevated)]">
          {searchable ? (
            <div className="border-b border-[var(--color-border-subtle)] p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] py-2 pr-3 pl-8 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-inverse)] focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] focus-visible:outline-none"
                />
              </div>
            </div>
          ) : null}
          <div id={listId} role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--color-text-inverse)]">{emptyText}</p>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value || "__empty"}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      isSelected
                        ? "text-[var(--color-text-secondary)]"
                        : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.description ? (
                        <span className="mt-0.5 block truncate text-xs text-[var(--color-text-inverse)]">{option.description}</span>
                      ) : null}
                    </span>
                    {isSelected ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
