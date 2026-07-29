"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  cn,
  formatDateDisplay,
  parseDateDisplay,
  toDateValue,
} from "@/lib/utils";

type DateInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange" | "defaultValue"
> & {
  value?: string;
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  clearable?: boolean;
  /** `day` → yyyy-mm-dd / dd/mm/yyyy · `month` → yyyy-mm / mm/yyyy */
  mode?: "day" | "month";
};

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_SHORT = [
  "Th1",
  "Th2",
  "Th3",
  "Th4",
  "Th5",
  "Th6",
  "Th7",
  "Th8",
  "Th9",
  "Th10",
  "Th11",
  "Th12",
];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toIsoLocal(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function parseIsoLocal(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toMonthValue(date: Date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${mm}`;
}

function parseMonthValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const date = new Date(year, month - 1, 1);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatMonthDisplay(value: string) {
  const date = parseMonthValue(value);
  if (!date) return "";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${mm}/${date.getFullYear()}`;
}

function parseMonthDisplay(value: string): string {
  const match = value.trim().match(/^(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const [, mm, yyyy] = match;
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12) return "";
  return `${yyyy}-${mm}`;
}

function normalizeMonthValue(value?: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7);
  return "";
}

function monthLabel(date: Date) {
  return `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
}

function buildCalendarDays(viewMonth: Date) {
  const first = startOfMonth(viewMonth);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

/**
 * Polished date field with calendar popover.
 * - mode=day: ISO `yyyy-mm-dd`, display `dd/mm/yyyy`
 * - mode=month: ISO `yyyy-mm`, display `mm/yyyy`
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      className,
      value = "",
      onChange,
      onValueChange,
      disabled,
      id,
      name,
      required,
      placeholder,
      clearable = true,
      mode = "day",
      ...props
    },
    ref
  ) => {
    const isMonth = mode === "month";
    const normalized = isMonth ? normalizeMonthValue(value) : toDateValue(value);
    const selectedDate = isMonth
      ? normalized
        ? parseMonthValue(normalized)
        : null
      : normalized
        ? parseIsoLocal(normalized)
        : null;

    const [open, setOpen] = React.useState(false);
    const [text, setText] = React.useState(() =>
      normalized
        ? isMonth
          ? formatMonthDisplay(normalized)
          : formatDateDisplay(normalized)
        : ""
    );
    const [viewMonth, setViewMonth] = React.useState(() =>
      startOfMonth(selectedDate || new Date())
    );
    const [viewYear, setViewYear] = React.useState(
      () => (selectedDate || new Date()).getFullYear()
    );
    const textRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => textRef.current as HTMLInputElement);

    React.useEffect(() => {
      setText(
        normalized
          ? isMonth
            ? formatMonthDisplay(normalized)
            : formatDateDisplay(normalized)
          : ""
      );
      if (selectedDate) {
        setViewMonth(startOfMonth(selectedDate));
        setViewYear(selectedDate.getFullYear());
      }
    }, [normalized, isMonth]); // eslint-disable-line react-hooks/exhaustive-deps

    function emit(next: string) {
      onValueChange?.(next);
      onChange?.(next);
    }

    function handleTextChange(event: React.ChangeEvent<HTMLInputElement>) {
      const digits = event.target.value.replace(/\D/g, "").slice(0, isMonth ? 6 : 8);
      let masked = digits;

      if (isMonth) {
        if (digits.length > 2) {
          masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        }
        setText(masked);
        if (masked.length === 7) {
          const parsed = parseMonthDisplay(masked);
          if (parsed) {
            emit(parsed);
            const date = parseMonthValue(parsed);
            if (date) {
              setViewMonth(startOfMonth(date));
              setViewYear(date.getFullYear());
            }
          }
        } else if (masked.length === 0) {
          emit("");
        }
        return;
      }

      if (digits.length > 4) {
        masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
      } else if (digits.length > 2) {
        masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      }
      setText(masked);

      if (masked.length === 10) {
        const parsed = parseDateDisplay(masked);
        if (parsed) {
          emit(parsed);
          const date = parseIsoLocal(parsed);
          if (date) setViewMonth(startOfMonth(date));
        }
      } else if (masked.length === 0) {
        emit("");
      }
    }

    function handleTextBlur() {
      if (!text) {
        emit("");
        return;
      }

      if (isMonth) {
        const parsed = parseMonthDisplay(text);
        if (parsed) {
          setText(formatMonthDisplay(parsed));
          emit(parsed);
        } else {
          setText(normalized ? formatMonthDisplay(normalized) : "");
        }
        return;
      }

      const parsed = parseDateDisplay(text);
      if (parsed) {
        setText(formatDateDisplay(parsed));
        emit(parsed);
      } else {
        setText(normalized ? formatDateDisplay(normalized) : "");
      }
    }

    function selectDay(day: Date) {
      const next = toIsoLocal(day);
      emit(next);
      setText(formatDateDisplay(next));
      setOpen(false);
    }

    function selectMonth(monthIndex: number) {
      const date = new Date(viewYear, monthIndex, 1);
      const next = toMonthValue(date);
      emit(next);
      setText(formatMonthDisplay(next));
      setViewMonth(startOfMonth(date));
      setOpen(false);
    }

    function selectToday() {
      const today = new Date();
      if (isMonth) {
        const next = toMonthValue(today);
        emit(next);
        setText(formatMonthDisplay(next));
        setViewMonth(startOfMonth(today));
        setViewYear(today.getFullYear());
        setOpen(false);
        return;
      }
      selectDay(today);
      setViewMonth(startOfMonth(today));
    }

    function clearValue(event?: React.SyntheticEvent) {
      event?.preventDefault();
      event?.stopPropagation();
      emit("");
      setText("");
    }

    const days = buildCalendarDays(viewMonth);
    const today = new Date();
    const resolvedPlaceholder =
      placeholder || (isMonth ? "mm/yyyy" : "dd/mm/yyyy");

    return (
      <Popover.Root open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <div className={cn("relative w-full", className)}>
          <div
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 shadow-sm transition-all",
              "hover:border-[var(--color-text-secondary)]/35",
              open &&
                "border-[var(--color-text-secondary)] ring-2 ring-[var(--color-text-secondary)]/20",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <input
              ref={textRef}
              id={id}
              name={name}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={resolvedPlaceholder}
              required={required && !normalized}
              disabled={disabled}
              value={text}
              onChange={handleTextChange}
              onBlur={handleTextBlur}
              onFocus={() => setOpen(true)}
              className="min-w-0 flex-1 bg-transparent text-base tabular-nums tracking-wide text-[var(--color-text-primary)] outline-none placeholder:tracking-normal placeholder:text-[var(--color-text-inverse)] disabled:cursor-not-allowed md:text-sm"
              {...props}
            />

            <div className="flex shrink-0 items-center gap-0.5">
              {clearable && normalized && !disabled ? (
                <button
                  type="button"
                  aria-label={isMonth ? "Xóa tháng" : "Xóa ngày"}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={clearValue}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}

              <Popover.Trigger asChild disabled={disabled}>
                <button
                  type="button"
                  aria-label="Mở lịch"
                  disabled={disabled}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-colors",
                    "hover:bg-[var(--color-text-secondary)]/10",
                    open && "bg-[var(--color-text-secondary)]/10"
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <CalendarDays className="h-4 w-4" />
                </button>
              </Popover.Trigger>
            </div>
          </div>

          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className={cn(
                "z-[90] w-[320px] overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3 shadow-[var(--shadow-elevated)]",
                "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              )}
              onOpenAutoFocus={(event) => event.preventDefault()}
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              {isMonth ? (
                <>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      aria-label="Năm trước"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                      onClick={() => setViewYear((year) => year - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
                      {viewYear}
                    </p>
                    <button
                      type="button"
                      aria-label="Năm sau"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                      onClick={() => setViewYear((year) => year + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {MONTH_SHORT.map((label, monthIndex) => {
                      const isSelected =
                        selectedDate != null &&
                        selectedDate.getFullYear() === viewYear &&
                        selectedDate.getMonth() === monthIndex;
                      const isCurrent =
                        today.getFullYear() === viewYear &&
                        today.getMonth() === monthIndex;

                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => selectMonth(monthIndex)}
                          className={cn(
                            "flex h-11 items-center justify-center rounded-xl text-sm font-medium transition-colors",
                            !isSelected &&
                              "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]",
                            isSelected &&
                              "bg-[var(--color-text-secondary)] font-semibold text-white shadow-sm hover:bg-[var(--color-text-secondary)]",
                            !isSelected &&
                              isCurrent &&
                              "font-semibold text-[var(--color-text-secondary)] ring-1 ring-[var(--color-text-secondary)]/35"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      aria-label="Tháng trước"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                      onClick={() => setViewMonth((month) => addMonths(month, -1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
                      {monthLabel(viewMonth)}
                    </p>
                    <button
                      type="button"
                      aria-label="Tháng sau"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                      onClick={() => setViewMonth((month) => addMonths(month, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mb-1 grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((day) => (
                      <div
                        key={day}
                        className="flex h-8 items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-inverse)]"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day) => {
                      const inMonth = day.getMonth() === viewMonth.getMonth();
                      const isSelected = selectedDate
                        ? sameDay(day, selectedDate)
                        : false;
                      const isToday = sameDay(day, today);

                      return (
                        <button
                          key={toIsoLocal(day)}
                          type="button"
                          onClick={() => selectDay(day)}
                          className={cn(
                            "relative flex h-9 items-center justify-center rounded-xl text-sm tabular-nums transition-colors",
                            inMonth
                              ? "text-[var(--color-text-primary)]"
                              : "text-[var(--color-text-inverse)]/45",
                            !isSelected &&
                              inMonth &&
                              "hover:bg-[var(--color-surface-muted)]",
                            isSelected &&
                              "bg-[var(--color-text-secondary)] font-semibold text-white shadow-sm hover:bg-[var(--color-text-secondary)]",
                            !isSelected &&
                              isToday &&
                              "font-semibold text-[var(--color-text-secondary)] ring-1 ring-[var(--color-text-secondary)]/35"
                          )}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] pt-3">
                <button
                  type="button"
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-text-secondary)]/10"
                  onClick={selectToday}
                >
                  {isMonth ? "Tháng này" : "Hôm nay"}
                </button>
                <div className="flex items-center gap-1">
                  {normalized ? (
                    <button
                      type="button"
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                      onClick={() => {
                        clearValue();
                        setOpen(false);
                      }}
                    >
                      Xóa
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                    onClick={() => setOpen(false)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </div>
      </Popover.Root>
    );
  }
);
DateInput.displayName = "DateInput";
