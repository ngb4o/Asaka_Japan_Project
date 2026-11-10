"use client";

import { ArrowDownToLine, ArrowUpFromLine, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createMovement, listMovements } from "@/lib/api";
import type { MovementType, StockMovement, WarehouseItem } from "@/lib/types";

const fieldClass =
  "flex h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-sm font-normal shadow-sm outline-none placeholder:text-[var(--color-text-inverse)] focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";

export function MovementDialog({
  item,
  onClose,
  onDone,
}: {
  item: WarehouseItem;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [type, setType] = useState<MovementType>("in");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amount = Number(quantity);
  const nextBalance = Number.isFinite(amount)
    ? Math.round((item.quantity + (type === "in" ? amount : -amount)) * 100) / 100
    : item.quantity;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    listMovements({ itemId: item.id, limit: 8 })
      .then((result) => {
        if (active) setHistory(result.items);
      })
      .catch(() => {
        if (active) setHistory([]);
      });
    return () => {
      active = false;
    };
  }, [item.id]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Số lượng phải lớn hơn 0");
      return;
    }
    if (type === "out" && amount > item.quantity) {
      setError("Tồn kho không đủ để xuất");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await createMovement(item.id, {
        type,
        quantity: amount,
        note: note.trim(),
      });
      onDone(type === "in" ? `Đã nhập ${formatQuantity(amount)} ${item.name}` : `Đã xuất ${formatQuantity(amount)} ${item.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được phiếu");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <button type="button" aria-label="Đóng" className="absolute inset-0" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--color-surface-elevated)] shadow-xl sm:max-w-lg sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Xuất nhập kho</h2>
            <p className="truncate text-sm text-[var(--color-text-inverse)]">{item.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 px-4 py-4 sm:px-6">
          <p className="text-sm">
            Tồn hiện tại{" "}
            <span className="font-semibold tabular-nums">{formatQuantity(item.quantity)}</span>
            {item.column == null ? "" : ` · Cột ${item.column}`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("in")}
              className={type === "in" ? activeChoice : idleChoice}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Nhập
            </button>
            <button
              type="button"
              onClick={() => setType("out")}
              className={type === "out" ? activeOut : idleChoice}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Xuất
            </button>
          </div>
          <label className="space-y-2 text-sm font-medium">
            <span className="block">Số lượng *</span>
            <input
              inputMode="decimal"
              value={quantity}
              placeholder="0"
              autoFocus
              onChange={(event) => setQuantity(sanitizeQuantity(event.target.value))}
              className={fieldClass}
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            <span className="block">Ghi chú</span>
            <input
              value={note}
              maxLength={300}
              placeholder="Người lấy, lý do, số chứng từ..."
              onChange={(event) => setNote(event.target.value)}
              className={fieldClass}
            />
          </label>
          <p className="text-sm">
            Tồn sau phiếu{" "}
            <span className={`font-semibold tabular-nums ${nextBalance < 0 ? "text-red-600" : ""}`}>
              {Number.isFinite(amount) && amount > 0 ? formatQuantity(Math.max(nextBalance, 0)) : formatQuantity(item.quantity)}
            </span>
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={outlineButton}>
              Hủy
            </button>
            <button type="submit" disabled={submitting} className={type === "out" ? dangerButton : primaryButton}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {type === "in" ? "Nhập kho" : "Xuất kho"}
            </button>
          </div>
        </form>
        <div className="border-t border-[var(--color-border-subtle)] px-4 py-4 sm:px-6">
          <p className="mb-2 text-sm font-semibold">Phiếu gần đây</p>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có phiếu cho sản phẩm này.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((movement) => (
                <li key={movement.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      <MovementBadge type={movement.type} /> {formatQuantity(movement.quantity)}
                    </p>
                    <p className="truncate text-xs text-[var(--color-text-inverse)]">
                      {formatWhen(movement.createdAt)}
                      {movement.createdBy ? ` · ${movement.createdBy}` : ""}
                      {movement.note ? ` · ${movement.note}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums text-[var(--color-text-inverse)]">
                    Còn {formatQuantity(movement.balanceAfter)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function MovementBadge({ type }: { type: MovementType }) {
  const incoming = type === "in";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        incoming ? "bg-[var(--color-badge-success-bg)] text-[var(--color-badge-success-fg)]" : "bg-red-50 text-red-700"
      }`}
    >
      {incoming ? "Nhập" : "Xuất"}
    </span>
  );
}

export function formatQuantity(value: number) {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

export function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function sanitizeQuantity(value: string) {
  const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const [whole, ...fraction] = cleaned.split(".");
  if (!fraction.length) return whole;
  return `${whole}.${fraction.join("").slice(0, 2)}`;
}

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#016502] disabled:opacity-50";

const outlineButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-4 text-sm font-semibold shadow-sm transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50";

const dangerButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50";

const idleChoice =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] text-sm font-semibold";

const activeChoice =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] text-sm font-semibold text-white";

const activeOut =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-red-600 text-sm font-semibold text-white";
