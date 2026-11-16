"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  title?: string;
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
  title,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [menuBox, setMenuBox] = useState({ top: 0, left: 0, width: 0, maxHeight: 240, openUp: false });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    if (isMobile) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 10);
    return () => window.clearTimeout(timer);
  }, [open, isMobile]);

  useEffect(() => {
    if (!open || isMobile) return;
    function place() {
      const trigger = rootRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const spaceBelow = window.innerHeight - trigger.bottom - 12;
      const spaceAbove = trigger.top - 12;
      const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, Math.min(280, (openUp ? spaceAbove : spaceBelow) - 8));
      const width = Math.max(trigger.width, 192);
      let left = trigger.left;
      if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - 12 - width);
      setMenuBox({
        top: openUp ? trigger.top - 6 : trigger.bottom + 6,
        left,
        width,
        maxHeight,
        openUp,
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, isMobile]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopImmediatePropagation();
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  const menuList = (
    <>
      {searchable ? (
        <div className={cn("border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3 md:p-2", isMobile && "sticky top-0 z-10")}>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] py-2 pr-3 pl-8 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-inverse)] focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)] focus-visible:outline-none md:h-9 md:text-sm"
            />
          </div>
        </div>
      ) : null}
      <div
        id={listId}
        role="listbox"
        className={cn("min-h-0 flex-1 overflow-y-auto", isMobile ? "divide-y divide-[var(--color-border-subtle)]" : "p-1")}
        style={isMobile ? undefined : { maxHeight: menuBox.maxHeight }}
      >
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
                  "flex w-full items-start gap-2 text-left transition-colors",
                  isMobile ? "px-4 py-3.5 text-base" : "rounded-lg px-3 py-2.5 text-sm",
                  isSelected ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                )}
                onClick={() => handleSelect(option.value)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{option.label}</span>
                  {option.description ? <span className="mt-0.5 block truncate text-xs text-[var(--color-text-inverse)]">{option.description}</span> : null}
                </span>
                {isSelected ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })
        )}
      </div>
    </>
  );

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
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChange("");
                setOpen(false);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronsUpDown className="h-4 w-4 opacity-70" />
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            isMobile ? (
              <div ref={menuRef} className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={title || placeholder}>
                <button type="button" aria-label="Đóng" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
                <div className="absolute inset-x-0 bottom-0 flex max-h-[80dvh] flex-col overflow-hidden rounded-t-2xl bg-[var(--color-surface-elevated)] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.22)]">
                  <div className="flex shrink-0 flex-col items-center pt-2">
                    <div className="mb-1 h-1 w-10 rounded-full bg-[var(--color-border-subtle)]" />
                    <div className="relative flex w-full items-center justify-center border-b border-[var(--color-border-subtle)] px-12 pt-1 pb-3">
                      <p className="truncate text-base font-semibold">{title || placeholder}</p>
                      <button
                        type="button"
                        aria-label="Đóng"
                        className="absolute top-1/2 right-3 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)]"
                        onClick={() => setOpen(false)}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  {menuList}
                </div>
              </div>
            ) : (
              <div
                ref={menuRef}
                className="fixed z-[90] overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-elevated)]"
                style={{
                  top: menuBox.top,
                  left: menuBox.left,
                  width: menuBox.width,
                  transform: menuBox.openUp ? "translateY(-100%)" : undefined,
                }}
              >
                {menuList}
              </div>
            ),
            document.body
          )
        : null}
    </div>
  );
}
