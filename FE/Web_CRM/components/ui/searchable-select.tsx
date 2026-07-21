"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
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
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

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

    const timer = window.setTimeout(() => {
      searchRef.current?.focus();
    }, 10);

    return () => window.clearTimeout(timer);
  }, [open]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className={cn("relative w-full", className)}>
        <Popover.Trigger asChild disabled={disabled}>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-expanded={open}
            aria-controls={listId}
            className={cn(
              "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-left text-sm text-[var(--color-text-primary)] transition-colors",
              "hover:border-[var(--color-text-secondary)]/40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
              open && "border-[var(--color-text-secondary)] ring-2 ring-[var(--color-text-secondary)]/20",
              triggerClassName
            )}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                !selected && "text-[var(--color-text-inverse)]"
              )}
            >
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
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className={cn(
              "z-[60] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-elevated)]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            )}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            {searchable && (
              <div className="border-b border-[var(--color-border-subtle)] p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-9 w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] py-2 pl-8 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-inverse)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]"
                  />
                </div>
              </div>
            )}

            <div
              id={listId}
              role="listbox"
              className="max-h-60 overflow-y-auto p-1"
            >
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-[var(--color-text-inverse)]">
                  {emptyText}
                </p>
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
                          ? "bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]"
                          : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                      )}
                      onClick={() => handleSelect(option.value)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{option.label}</span>
                        {option.description ? (
                          <span className="mt-0.5 block truncate text-xs text-[var(--color-text-inverse)]">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                      {isSelected ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );
}

export const STATUS_OPTIONS = {
  product: [
    { value: "active", label: "Đang bán" },
    { value: "inactive", label: "Ngưng bán" },
  ] as SelectOption[],
  category: [
    { value: "active", label: "Hoạt động" },
    { value: "inactive", label: "Ngưng" },
  ] as SelectOption[],
  warehouse: [
    { value: "active", label: "Hoạt động" },
    { value: "inactive", label: "Ngưng" },
  ] as SelectOption[],
  news: [
    { value: "active", label: "Hiển thị" },
    { value: "inactive", label: "Ẩn" },
  ] as SelectOption[],
  lead: [
    { value: "new", label: "Mới" },
    { value: "contacted", label: "Đã liên hệ" },
    { value: "qualified", label: "Tiềm năng" },
    { value: "converted", label: "Đã chuyển đổi" },
    { value: "closed", label: "Đóng" },
  ] as SelectOption[],
  dealer: [
    { value: "pending", label: "Chờ duyệt" },
    { value: "active", label: "Hoạt động" },
    { value: "inactive", label: "Ngưng" },
  ] as SelectOption[],
  dealerTier: [
    { value: "standard", label: "Tiêu chuẩn" },
    { value: "silver", label: "Bạc" },
    { value: "gold", label: "Vàng" },
  ] as SelectOption[],
  quote: [
    { value: "draft", label: "Nháp" },
    { value: "sent", label: "Đã gửi" },
    { value: "accepted", label: "Chấp nhận" },
    { value: "rejected", label: "Từ chối" },
    { value: "expired", label: "Hết hạn" },
  ] as SelectOption[],
  order: [
    { value: "pending", label: "Chờ xử lý" },
    { value: "confirmed", label: "Đã xác nhận" },
    { value: "delivering", label: "Đang giao" },
    { value: "completed", label: "Hoàn tất" },
    { value: "cancelled", label: "Hủy" },
  ] as SelectOption[],
  payment: [
    { value: "unpaid", label: "Chưa thanh toán" },
    { value: "partial", label: "Thanh toán một phần" },
    { value: "paid", label: "Đã thanh toán" },
  ] as SelectOption[],
  userRole: [
    { value: "sales", label: "Kinh doanh" },
    { value: "warehouse", label: "Kho" },
    { value: "accountant", label: "Kế toán" },
  ] as SelectOption[],
};
