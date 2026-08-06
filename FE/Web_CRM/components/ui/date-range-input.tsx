"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { cn, formatDateDisplay, toDateValue } from "@/lib/utils";

export type DateRangeValue = {
  from: string;
  to: string;
};

type DateRangeInputProps = {
  from?: string;
  to?: string;
  onChange?: (range: DateRangeValue) => void;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  id?: string;
  fromLabel?: string;
  toLabel?: string;
  placeholder?: string;
};

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

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

function dayTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Agoda-style date range picker.
 * First click = from, second click = to. Display: dd/mm/yyyy → dd/mm/yyyy
 */
export function DateRangeInput({
  from = "",
  to = "",
  onChange,
  disabled,
  className,
  clearable = true,
  id,
  fromLabel = "Từ",
  toLabel = "Đến",
  placeholder = "Chọn khoảng ngày",
}: DateRangeInputProps) {
  const fromNorm = toDateValue(from);
  const toNorm = toDateValue(to);
  const fromDate = fromNorm ? parseIsoLocal(fromNorm) : null;
  const toDate = toNorm ? parseIsoLocal(toNorm) : null;

  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const [draftFrom, setDraftFrom] = React.useState<string>(fromNorm);
  const [draftTo, setDraftTo] = React.useState<string>(toNorm);
  const [hoverIso, setHoverIso] = React.useState<string>("");
  const [picking, setPicking] = React.useState<"from" | "to">(
    fromNorm && !toNorm ? "to" : "from"
  );
  const [viewMonth, setViewMonth] = React.useState(() =>
    startOfMonth(fromDate || toDate || new Date())
  );

  React.useEffect(() => {
    if (!open) {
      setDraftFrom(fromNorm);
      setDraftTo(toNorm);
      setHoverIso("");
      setPicking(fromNorm && !toNorm ? "to" : "from");
      if (fromDate || toDate) {
        setViewMonth(startOfMonth(fromDate || toDate || new Date()));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromNorm, toNorm, open]);

  const draftFromDate = draftFrom ? parseIsoLocal(draftFrom) : null;
  const draftToDate = draftTo ? parseIsoLocal(draftTo) : null;
  const hoverDate = hoverIso ? parseIsoLocal(hoverIso) : null;

  const displayText = React.useMemo(() => {
    if (fromNorm && toNorm) {
      return `${formatDateDisplay(fromNorm)} → ${formatDateDisplay(toNorm)}`;
    }
    if (fromNorm) return `${formatDateDisplay(fromNorm)} → …`;
    if (toNorm) return `… → ${formatDateDisplay(toNorm)}`;
    return "";
  }, [fromNorm, toNorm]);

  function emit(nextFrom: string, nextTo: string) {
    onChange?.({ from: nextFrom, to: nextTo });
  }

  function selectDay(day: Date) {
    const iso = toIsoLocal(day);

    if (picking === "from" || !draftFrom) {
      setDraftFrom(iso);
      setDraftTo("");
      setHoverIso("");
      setPicking("to");
      return;
    }

    const start = parseIsoLocal(draftFrom);
    if (!start) {
      setDraftFrom(iso);
      setDraftTo("");
      setHoverIso("");
      setPicking("to");
      return;
    }

    if (dayTime(day) < dayTime(start)) {
      setDraftFrom(iso);
      setDraftTo("");
      setHoverIso("");
      setPicking("to");
      return;
    }

    setDraftTo(iso);
    setHoverIso("");
    emit(draftFrom, iso);
    setOpen(false);
    setPicking("from");
  }

  function clearValue(event?: React.SyntheticEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    setDraftFrom("");
    setDraftTo("");
    setHoverIso("");
    setPicking("from");
    emit("", "");
  }

  const days = buildCalendarDays(viewMonth);
  const today = new Date();
  const hasValue = Boolean(fromNorm || toNorm);

  // Preview end date while choosing "to" (Agoda-style hover fill)
  const previewEnd =
    picking === "to" && draftFromDate && hoverDate && !draftToDate
      ? dayTime(hoverDate) >= dayTime(draftFromDate)
        ? hoverDate
        : null
      : null;

  const rangeStart = draftFromDate;
  const rangeEnd = draftToDate || previewEnd;
  const previewToLabel =
    draftTo ||
    (previewEnd ? toIsoLocal(previewEnd) : "") ||
    "";

  function handleOpenChange(next: boolean) {
    if (disabled) return;
    setOpen(next);
    if (next) {
      setDraftFrom(fromNorm);
      setDraftTo(toNorm);
      setHoverIso("");
      setPicking(fromNorm && !toNorm ? "to" : "from");
    } else {
      setHoverIso("");
    }
  }

  const panel = (
    <>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setPicking("from");
            setHoverIso("");
          }}
          className={cn(
            "rounded-xl border px-3 py-2 text-left transition-colors",
            picking === "from"
              ? "border-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/8 ring-1 ring-[var(--color-text-secondary)]/20"
              : "border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-muted)]"
          )}>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-inverse)]">
            {fromLabel}
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
            {draftFrom ? formatDateDisplay(draftFrom) : "—"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => {
            if (draftFrom) {
              setPicking("to");
              if (draftTo) setDraftTo("");
            }
          }}
          className={cn(
            "rounded-xl border px-3 py-2 text-left transition-colors",
            picking === "to"
              ? "border-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/8 ring-1 ring-[var(--color-text-secondary)]/20"
              : "border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-muted)]",
            !draftFrom && "opacity-50"
          )}>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-inverse)]">
            {toLabel}
          </p>
          <p
            className={cn(
              "mt-0.5 text-sm font-semibold tabular-nums",
              previewEnd && !draftTo
                ? "text-[var(--color-text-secondary)]"
                : "text-[var(--color-text-primary)]"
            )}>
            {previewToLabel ? formatDateDisplay(previewToLabel) : "—"}
          </p>
        </button>
      </div>

      <p className="mb-2 text-center text-xs text-[var(--color-text-inverse)]">
        {picking === "from"
          ? `Chọn ngày ${fromLabel.toLowerCase()}`
          : `Chọn ngày ${toLabel.toLowerCase()}`}
      </p>

      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Tháng trước"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
          onClick={() => setViewMonth((month) => addMonths(month, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
          {monthLabel(viewMonth)}
        </p>
        <button
          type="button"
          aria-label="Tháng sau"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
          onClick={() => setViewMonth((month) => addMonths(month, 1))}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="flex h-8 items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-inverse)]">
            {day}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-1"
        onMouseLeave={() => setHoverIso("")}>
        {days.map((day) => {
          const inMonth = day.getMonth() === viewMonth.getMonth();
          const isFrom = rangeStart ? sameDay(day, rangeStart) : false;
          const isTo = rangeEnd ? sameDay(day, rangeEnd) : false;
          const isConfirmedTo = draftToDate ? sameDay(day, draftToDate) : false;
          const isPreviewTo =
            Boolean(previewEnd) && !draftToDate && sameDay(day, previewEnd!);
          const isEdge = isFrom || isConfirmedTo || isPreviewTo;
          const inRange =
            rangeStart &&
            rangeEnd &&
            dayTime(day) > dayTime(rangeStart) &&
            dayTime(day) < dayTime(rangeEnd);
          const isToday = sameDay(day, today);
          const disabledBeforeFrom =
            picking === "to" &&
            rangeStart &&
            dayTime(day) < dayTime(rangeStart);
          const canHoverPreview =
            picking === "to" &&
            Boolean(draftFromDate) &&
            !draftToDate &&
            !disabledBeforeFrom;

          return (
            <button
              key={toIsoLocal(day)}
              type="button"
              disabled={Boolean(disabledBeforeFrom)}
              onClick={() => selectDay(day)}
              onMouseEnter={() => {
                if (canHoverPreview) setHoverIso(toIsoLocal(day));
              }}
              className={cn(
                "relative flex h-9 items-center justify-center text-sm tabular-nums transition-colors",
                isFrom && !isTo && "rounded-l-xl rounded-r-md",
                isTo && !isFrom && "rounded-r-xl rounded-l-md",
                isFrom && isTo && "rounded-xl",
                !isEdge && inRange && "rounded-none",
                !isEdge && !inRange && "rounded-xl",
                inMonth
                  ? "text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-inverse)]/45",
                !isEdge &&
                  !inRange &&
                  inMonth &&
                  !disabledBeforeFrom &&
                  "hover:bg-[var(--color-surface-muted)]",
                inRange &&
                  (previewEnd && !draftToDate
                    ? "bg-[var(--color-text-secondary)]/18 text-[var(--color-text-primary)]"
                    : "bg-[var(--color-text-secondary)]/12 text-[var(--color-text-primary)]"),
                isEdge &&
                  "bg-[var(--color-text-secondary)] font-semibold text-white shadow-sm hover:bg-[var(--color-text-secondary)]",
                isPreviewTo &&
                  "ring-2 ring-[var(--color-text-secondary)]/40 ring-offset-1 ring-offset-[var(--color-surface-elevated)]",
                !isEdge &&
                  !inRange &&
                  isToday &&
                  "font-semibold text-[var(--color-text-secondary)] ring-1 ring-[var(--color-text-secondary)]/35",
                disabledBeforeFrom && "cursor-not-allowed opacity-30"
              )}>
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] pt-3">
        <button
          type="button"
          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-text-secondary)]/10"
          onClick={() => {
            const todayIso = toIsoLocal(new Date());
            setDraftFrom(todayIso);
            setDraftTo(todayIso);
            emit(todayIso, todayIso);
            setViewMonth(startOfMonth(new Date()));
            setOpen(false);
            setPicking("from");
          }}>
          Hôm nay
        </button>
        <div className="flex items-center gap-1">
          {hasValue || draftFrom || draftTo ? (
            <button
              type="button"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
              onClick={() => {
                clearValue();
                setOpen(false);
              }}>
              Xóa
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
            onClick={() => setOpen(false)}>
            Đóng
          </button>
        </div>
      </div>
    </>
  );

  const field = (
    <div
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 shadow-sm transition-all",
        "hover:border-[var(--color-text-secondary)]/35",
        open &&
          "border-[var(--color-text-secondary)] ring-2 ring-[var(--color-text-secondary)]/20",
        disabled && "cursor-not-allowed opacity-50"
      )}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        className="min-w-0 flex-1 truncate bg-transparent text-left text-base tabular-nums tracking-wide text-[var(--color-text-primary)] outline-none disabled:cursor-not-allowed md:text-sm"
        onClick={() => {
          if (!disabled && isMobile) handleOpenChange(true);
        }}>
        {displayText ? (
          displayText
        ) : (
          <span className="tracking-normal text-[var(--color-text-inverse)]">
            {placeholder}
          </span>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-0.5">
        {clearable && hasValue && !disabled ? (
          <button
            type="button"
            aria-label="Xóa khoảng ngày"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              clearValue(event);
            }}>
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}

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
          onClick={() => {
            if (!disabled && isMobile) handleOpenChange(true);
          }}>
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className={cn("relative w-full", className)}>
        {field}
        <BottomSheet
          open={open}
          onOpenChange={handleOpenChange}
          title="Chọn khoảng ngày">
          <div className="p-4">{panel}</div>
        </BottomSheet>
      </div>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <div className={cn("relative w-full", className)}>
        <Popover.Trigger asChild disabled={disabled}>
          <div className="w-full cursor-pointer">{field}</div>
        </Popover.Trigger>

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
            onCloseAutoFocus={(event) => event.preventDefault()}>
            {panel}
          </Popover.Content>
        </Popover.Portal>
      </div>
    </Popover.Root>
  );

}
