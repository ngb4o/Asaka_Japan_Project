"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  id?: string;
};

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) return null;
  return date;
}

function formatDisplay(value: string) {
  const date = parseIsoLocal(value);
  if (!date) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

function parseDisplay(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  return parseIsoLocal(`${match[3]}-${match[2]}-${match[1]}`) ? `${match[3]}-${match[2]}-${match[1]}` : "";
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

export function DateInput({
  value,
  onChange,
  className,
  ariaLabel,
  placeholder = "dd/mm/yyyy",
  disabled = false,
  clearable = true,
  id,
}: DateInputProps) {
  const selected = parseIsoLocal(value);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [text, setText] = useState(() => formatDisplay(value));
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selected || new Date()));
  const [menuBox, setMenuBox] = useState({ top: 0, left: 0, openUp: false });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    setText(formatDisplay(value));
    if (selected) setViewMonth(startOfMonth(selected));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open || isMobile) return;
    function place() {
      const trigger = rootRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const width = 320;
      const height = 392;
      const spaceBelow = window.innerHeight - trigger.bottom - 12;
      const openUp = spaceBelow < height && trigger.top > spaceBelow;
      let left = trigger.right - width;
      if (left < 12) left = 12;
      if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - 12 - width);
      setMenuBox({
        top: openUp ? trigger.top - 8 : trigger.bottom + 8,
        left,
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
  }, [open, isMobile, viewMonth]);

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

  function emit(next: string) {
    onChange(next);
  }

  function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
    let masked = digits;
    if (digits.length > 4) masked = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) masked = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setText(masked);
    if (masked.length === 10) {
      const parsed = parseDisplay(masked);
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
    const parsed = parseDisplay(text);
    if (parsed) {
      setText(formatDisplay(parsed));
      emit(parsed);
    } else {
      setText(formatDisplay(value));
    }
  }

  function selectDay(day: Date) {
    const next = toIsoLocal(day);
    emit(next);
    setText(formatDisplay(next));
    setOpen(false);
  }

  function selectToday() {
    const today = new Date();
    selectDay(today);
    setViewMonth(startOfMonth(today));
  }

  function clearValue(event?: SyntheticEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    emit("");
    setText("");
  }

  const days = buildCalendarDays(viewMonth);
  const today = new Date();

  const calendar = (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Tháng trước"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
          onClick={() => setViewMonth((month) => addMonths(month, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold tracking-tight">{monthLabel(viewMonth)}</p>
        <button
          type="button"
          aria-label="Tháng sau"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
          onClick={() => setViewMonth((month) => addMonths(month, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="flex h-8 items-center justify-center text-[12px] font-semibold tracking-wide text-[var(--color-text-inverse)]">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = day.getMonth() === viewMonth.getMonth();
          const isSelected = selected ? sameDay(day, selected) : false;
          const isToday = sameDay(day, today);
          return (
            <button
              key={toIsoLocal(day)}
              type="button"
              onClick={() => selectDay(day)}
              className={cn(
                "flex h-9 items-center justify-center rounded-xl text-sm tabular-nums",
                inMonth ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-inverse)]/45",
                !isSelected && inMonth && "hover:bg-[var(--color-surface-muted)]",
                isSelected && "bg-[var(--color-text-secondary)] font-semibold text-white shadow-sm",
                !isSelected && isToday && "font-semibold text-[var(--color-text-secondary)] ring-1 ring-[var(--color-text-secondary)]/35"
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] pt-3">
        <button
          type="button"
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-text-secondary)]/10"
          onClick={selectToday}
        >
          Hôm nay
        </button>
        <div className="flex items-center gap-1">
          {value ? (
            <button
              type="button"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
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
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
            onClick={() => setOpen(false)}
          >
            Đóng
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <div
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 shadow-sm",
          "hover:border-[var(--color-text-secondary)]/35",
          open && "border-[var(--color-text-secondary)] ring-2 ring-[var(--color-text-secondary)]/20",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={ariaLabel}
          placeholder={placeholder}
          disabled={disabled}
          value={text}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          className="min-w-0 flex-1 bg-transparent text-sm tabular-nums tracking-wide outline-none placeholder:tracking-normal placeholder:text-[var(--color-text-inverse)] disabled:cursor-not-allowed"
        />
        {clearable && value && !disabled ? (
          <button
            type="button"
            aria-label="Xóa ngày"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearValue}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Mở lịch"
          aria-expanded={open}
          aria-controls={titleId}
          disabled={disabled}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-text-secondary)]/10",
            open && "bg-[var(--color-text-secondary)]/10"
          )}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (!disabled) setOpen((current) => !current);
          }}
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            isMobile ? (
              <div ref={menuRef} className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                <button type="button" aria-label="Đóng lịch" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
                <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-[var(--color-surface-elevated)] px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.22)]">
                  <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--color-border-subtle)]" />
                  <p id={titleId} className="mb-3 text-center text-base font-semibold">
                    Chọn ngày
                  </p>
                  {calendar}
                </div>
              </div>
            ) : (
              <div
                ref={menuRef}
                id={titleId}
                role="dialog"
                aria-label="Chọn ngày"
                className="fixed z-[90] w-[320px] rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3 shadow-[var(--shadow-elevated)]"
                style={{
                  top: menuBox.top,
                  left: menuBox.left,
                  transform: menuBox.openUp ? "translateY(-100%)" : undefined,
                }}
              >
                {calendar}
              </div>
            ),
            document.body
          )
        : null}
    </div>
  );
}
