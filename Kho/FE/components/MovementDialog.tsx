"use client";

import { ArrowDownToLine, ArrowUpFromLine, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { createMovement, deleteMovement, getMovement, listDrivers, listItems, listMovements, updateMovement } from "@/lib/api";
import { foldText } from "@/lib/text";
import type { Driver, MovementType, StockMovement, WarehouseItem } from "@/lib/types";

const fieldClass =
  "flex h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-sm font-normal shadow-sm outline-none placeholder:text-[var(--color-text-inverse)] focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";

export function MovementDialog({
  item: fixedItem = null,
  movement = null,
  type: lockedType,
  onClose,
  onDone,
}: {
  item?: WarehouseItem | null;
  movement?: StockMovement | null;
  type?: MovementType;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const editing = Boolean(movement);
  const [type, setType] = useState<MovementType>(movement?.type ?? lockedType ?? "in");
  const [picked, setPicked] = useState<WarehouseItem | null>(fixedItem);
  const [catalog, setCatalog] = useState<WarehouseItem[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState(movement?.driverId || "");
  const [driverQuery, setDriverQuery] = useState("");
  const [quantity, setQuantity] = useState(movement ? String(movement.quantity) : "");
  const [note, setNote] = useState(movement?.note || "");
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [allocated, setAllocated] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const item = picked;
  const typeLocked = Boolean(lockedType) || (editing && allocated > 0);

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
  const previewBase = item
    ? movement
      ? item.quantity - (movement.type === "in" ? movement.quantity : -movement.quantity)
      : item.quantity
    : 0;
  const nextBalance = item && Number.isFinite(amount)
    ? Math.round((previewBase + (type === "in" ? amount : -amount)) * 100) / 100
    : item?.quantity ?? 0;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!movement) return;
    let active = true;
    getMovement(movement.id)
      .then((result) => {
        if (!active) return;
        setPicked(result.item);
        setAllocated(result.allocated || 0);
        setType(result.movement.type);
        setQuantity(String(result.movement.quantity));
        setNote(result.movement.note || "");
        setDriverId(result.movement.driverId || "");
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Không tải được phiếu");
      });
    return () => {
      active = false;
    };
  }, [movement]);

  useEffect(() => {
    if (fixedItem || movement) return;
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
  }, [fixedItem, movement]);

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
    if (!item || movement) {
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
  }, [item, movement]);

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
    if (type === "out" && nextBalance < 0) {
      setError("Tồn kho không đủ để xuất");
      return;
    }
    if (allocated > 0 && type === "out" && amount < allocated) {
      setError(`Phiếu đã dùng ${formatQuantity(allocated)} trên phiếu xuất vật tư`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const input = {
        type,
        quantity: amount,
        note: note.trim(),
        ...(type === "out" && driver ? { driverId: driver.id } : {}),
      };
      if (movement) {
        await updateMovement(movement.id, input);
        onDone(`Đã sửa phiếu ${item.name}`);
      } else {
        await createMovement(item.id, input);
        onDone(type === "in"
          ? `Đã nhập ${formatQuantity(amount)} ${item.name}`
          : driver
            ? `Đã xuất ${formatQuantity(amount)} ${item.name} cho ${driver.name}`
            : `Đã xuất ${formatQuantity(amount)} ${item.name}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được phiếu");
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!movement) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setRemoving(true);
    setError("");
    try {
      await deleteMovement(movement.id);
      onDone(`Đã xóa phiếu ${movement.itemName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được phiếu");
      setRemoving(false);
      setConfirmDelete(false);
    }
  }

  return (
    <ResponsiveDialog label={editing ? "Sửa phiếu" : type === "in" ? "Nhập kho" : "Xuất kho"} onClose={onClose} className="max-w-[720px]">
      <div className="flex max-h-[min(640px,85dvh)] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{editing ? "Sửa phiếu" : type === "in" ? "Nhập kho" : "Xuất kho"}</h2>
            <p className="truncate text-sm text-[var(--color-text-inverse)]">{item ? item.name : movement?.itemName || "Chọn sản phẩm"}</p>
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
        <form id="movement-form" onSubmit={handleSubmit} className="grid min-w-0 gap-4 px-4 py-4 sm:px-6">
          {fixedItem || editing ? null : item ? (
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
              <ul className="h-24 overflow-y-auto rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] sm:h-40">
                {matches.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-[var(--color-text-inverse)]">Không có sản phẩm khớp.</li>
                ) : (
                  matches.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="flex w-full min-w-0 flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                        onClick={() => setPicked(entry)}
                      >
                        <span className="w-full min-w-0 truncate font-medium">{entry.name}</span>
                        <span className="shrink-0 tabular-nums text-xs text-[var(--color-text-inverse)] sm:text-sm">
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
          {typeLocked ? null : (
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
          {allocated > 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">
              Phiếu đã dùng {formatQuantity(allocated)} trên phiếu xuất vật tư. Chỉ sửa số lượng lớn hơn hoặc bằng mức này, không xóa được.
            </p>
          ) : null}
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
                  Lái xe
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
                <ul className="h-20 overflow-y-auto rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] sm:h-32">
                  {driverMatches.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-[var(--color-text-inverse)]">Không có lái xe khớp.</li>
                  ) : (
                    driverMatches.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          className="flex w-full min-w-0 flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)] sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                          onClick={() => setDriverId(entry.id)}
                        >
                          <span className="w-full min-w-0 truncate font-medium">{entry.name}</span>
                          <span className="w-full min-w-0 truncate text-xs text-[var(--color-text-inverse)] sm:max-w-[55%] sm:text-sm">
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
            {editing ? "Tồn kho sau khi lưu" : "Tồn sau phiếu"}{" "}
            <span className={`font-semibold tabular-nums ${nextBalance < 0 ? "text-red-600" : ""}`}>
              {item && Number.isFinite(amount) && amount > 0 ? formatQuantity(Math.max(nextBalance, 0)) : formatQuantity(item?.quantity ?? 0)}
            </span>
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
        </div>
        <div className={`grid shrink-0 gap-2 border-t border-[var(--color-border-subtle)] px-4 py-3 sm:px-6 ${editing ? "grid-cols-3" : "grid-cols-2"}`}>
          {editing ? (
            <button type="button" onClick={() => void handleDelete()} disabled={removing || allocated > 0} className={dangerButton}>
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {confirmDelete ? "Xóa?" : "Xóa"}
            </button>
          ) : null}
          <button type="button" onClick={onClose} className={outlineButton}>
            Hủy
          </button>
          <button type="submit" form="movement-form" disabled={submitting} className={type === "out" && !editing ? dangerButton : primaryButton}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editing ? "Lưu" : type === "in" ? "Nhập kho" : "Xuất kho"}
          </button>
        </div>
        {editing ? null : (
        <div className="max-h-28 overflow-y-auto border-t border-[var(--color-border-subtle)] px-4 py-3 sm:max-h-40 sm:px-6">
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
        )}
      </div>
    </ResponsiveDialog>
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
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-brand-hover)] disabled:opacity-50";

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
