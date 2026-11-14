"use client";

import { ArrowDownToLine, ArrowUpFromLine, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createMovement, listDrivers, listItems, listMovements } from "@/lib/api";
import { foldText } from "@/lib/text";
import type { Driver, MovementType, StockMovement, WarehouseItem } from "@/lib/types";

const fieldClass =
  "flex h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-sm font-normal shadow-sm outline-none placeholder:text-[var(--color-text-inverse)] focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";

export function MovementDialog({
  item: fixedItem = null,
  type: lockedType,
  onClose,
  onDone,
}: {
  item?: WarehouseItem | null;
  type?: MovementType;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [type, setType] = useState<MovementType>(lockedType ?? "in");
  const [picked, setPicked] = useState<WarehouseItem | null>(fixedItem);
  const [catalog, setCatalog] = useState<WarehouseItem[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState("");
  const [driverQuery, setDriverQuery] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const item = picked;

  const matches = useMemo(() => {
    const keyword = foldText(productQuery.trim());
    const source = keyword
      ? catalog.filter((entry) => foldText(entry.name).includes(keyword))
      : catalog;
    return source.slice(0, 8);
  }, [catalog, productQuery]);

  const driver = drivers.find((entry) => entry.id === driverId) ?? null;
  const driverMatches = useMemo(() => {
    const keyword = foldText(driverQuery.trim());
    const source = keyword
      ? drivers.filter((entry) => foldText(`${entry.name} ${entry.plate} ${entry.mooc}`).includes(keyword))
      : drivers;
    return source.slice(0, 8);
  }, [driverQuery, drivers]);

  const amount = Number(quantity);
  const nextBalance = item && Number.isFinite(amount)
    ? Math.round((item.quantity + (type === "in" ? amount : -amount)) * 100) / 100
    : item?.quantity ?? 0;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (fixedItem) return;
    let active = true;
    listItems({ limit: 500 })
      .then((result) => {
        if (active) setCatalog(result.items);
      })
      .catch(() => {
        if (active) setCatalog([]);
      });
    return () => {
      active = false;
    };
  }, [fixedItem]);

  useEffect(() => {
    if (lockedType === "in") return;
    let active = true;
    listDrivers({ limit: 500 })
      .then((result) => {
        if (active) setDrivers(result.items);
      })
      .catch(() => {
        if (active) setDrivers([]);
      });
    return () => {
      active = false;
    };
  }, [lockedType]);

  useEffect(() => {
    if (!item) {
      setHistory([]);
      return;
    }
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
  }, [item]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!item) {
      setError("Chọn sản phẩm");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Số lượng phải lớn hơn 0");
      return;
    }
    if (type === "out" && amount > item.quantity) {
      setError("Tồn kho không đủ để xuất");
      return;
    }
    if (type === "out" && !driver) {
      setError("Chọn lái xe");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await createMovement(item.id, {
        type,
        quantity: amount,
        note: note.trim(),
        ...(type === "out" && driver ? { driverId: driver.id } : {}),
      });
      onDone(type === "in"
        ? `Đã nhập ${formatQuantity(amount)} ${item.name}`
        : `Đã xuất ${formatQuantity(amount)} ${item.name} cho ${driver?.name ?? ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được phiếu");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <button type="button" aria-label="Đóng" className="absolute inset-0" onClick={onClose} />
      <div className="relative flex h-[640px] w-[720px] max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl bg-[var(--color-surface-elevated)] shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{type === "in" ? "Nhập kho" : "Xuất kho"}</h2>
            <p className="truncate text-sm text-[var(--color-text-inverse)]">{item ? item.name : "Chọn sản phẩm"}</p>
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
        <div className="min-h-0 flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="grid gap-4 px-6 py-4">
          {fixedItem ? null : item ? (
            <div className="flex h-12 items-center justify-between gap-3 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] px-3">
              <p className="min-w-0 truncate text-sm font-medium">{item.name}</p>
              <button
                type="button"
                className="shrink-0 text-sm font-semibold text-[var(--color-text-secondary)]"
                onClick={() => {
                  setPicked(null);
                  setProductQuery("");
                }}
              >
                Đổi
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="movement-product">
                Sản phẩm *
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
                <input
                  id="movement-product"
                  value={productQuery}
                  autoFocus
                  placeholder="Tìm sản phẩm..."
                  onChange={(event) => setProductQuery(event.target.value)}
                  className={`${fieldClass} pl-9`}
                />
              </div>
              <ul className="h-40 overflow-y-auto rounded-[var(--radius-button)] border border-[var(--color-border-subtle)]">
                {matches.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-[var(--color-text-inverse)]">Không có sản phẩm khớp.</li>
                ) : (
                  matches.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                        onClick={() => setPicked(entry)}
                      >
                        <span className="min-w-0 truncate font-medium">{entry.name}</span>
                        <span className="shrink-0 tabular-nums text-[var(--color-text-inverse)]">
                          Tồn {formatQuantity(entry.quantity)}{entry.unit ? ` ${entry.unit}` : ""}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
          {item ? (
            <p className="text-sm">
              Tồn hiện tại{" "}
              <span className="font-semibold tabular-nums">{formatQuantity(item.quantity)}</span>
              {item.unit ? ` ${item.unit}` : ""}
              {item.column == null ? "" : ` · Cột ${item.column}`}
            </p>
          ) : null}
          {lockedType ? null : (
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
          )}
          {type === "out" ? (
            driver ? (
              <div className="flex h-14 items-center justify-between gap-3 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] px-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{driver.name}</p>
                  <p className="truncate text-xs text-[var(--color-text-inverse)]">
                    Đầu {driver.plate || "—"} · Mooc {driver.mooc || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-sm font-semibold text-[var(--color-text-secondary)]"
                  onClick={() => {
                    setDriverId("");
                    setDriverQuery("");
                  }}
                >
                  Đổi
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium" htmlFor="movement-driver">
                  Lái xe *
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
                  <input
                    id="movement-driver"
                    value={driverQuery}
                    placeholder="Tìm lái xe, biển đầu, biển mooc..."
                    onChange={(event) => setDriverQuery(event.target.value)}
                    className={`${fieldClass} pl-9`}
                  />
                </div>
                <ul className="h-32 overflow-y-auto rounded-[var(--radius-button)] border border-[var(--color-border-subtle)]">
                  {driverMatches.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-[var(--color-text-inverse)]">Không có lái xe khớp.</li>
                  ) : (
                    driverMatches.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]"
                          onClick={() => setDriverId(entry.id)}
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">{entry.name}</span>
                          <span className="max-w-[55%] shrink-0 truncate text-[var(--color-text-inverse)]">
                            Đầu {entry.plate || "—"} · Mooc {entry.mooc || "—"}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )
          ) : null}
          <label className="space-y-2 text-sm font-medium">
            <span className="block">Số lượng *</span>
            <input
              inputMode="decimal"
              value={quantity}
              placeholder="0"
              autoFocus={Boolean(fixedItem)}
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
              {item && Number.isFinite(amount) && amount > 0 ? formatQuantity(Math.max(nextBalance, 0)) : formatQuantity(item?.quantity ?? 0)}
            </span>
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onClose} className={outlineButton}>
              Hủy
            </button>
            <button type="submit" disabled={submitting} className={type === "out" ? dangerButton : primaryButton}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {type === "in" ? "Nhập kho" : "Xuất kho"}
            </button>
          </div>
        </form>
        <div className="min-h-36 border-t border-[var(--color-border-subtle)] px-6 py-4">
          <p className="mb-2 text-sm font-semibold">Phiếu gần đây</p>
          {!item || history.length === 0 ? (
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
                    {formatRecipient(movement) ? (
                      <p className="truncate text-xs text-[var(--color-text-inverse)]">{formatRecipient(movement)}</p>
                    ) : null}
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

export function formatRecipient(movement: Pick<StockMovement, "type" | "driverName" | "plate" | "mooc">) {
  if (movement.type !== "out") return "";
  const name = movement.driverName?.trim();
  if (!name) return "";
  return `${name} · Đầu ${movement.plate?.trim() || "—"} · Mooc ${movement.mooc?.trim() || "—"}`;
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
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#016502] disabled:opacity-50";

const outlineButton =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-4 text-sm font-semibold shadow-sm transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50";

const dangerButton =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50";

const idleChoice =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] text-sm font-semibold";

const activeChoice =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] text-sm font-semibold text-white";

const activeOut =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-red-600 text-sm font-semibold text-white";
