"use client";

import { Droplet, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ListSkeleton } from "@/components/PageSkeleton";
import { getOil, listOils, recordOilChange, setOilKm } from "@/lib/api";
import type { DistanceOil, EngineOil, OilEvent, OilKind, OilStatus, OilVehicle } from "@/lib/types";
import { foldText } from "@/lib/text";

const KINDS: { id: OilKind; label: string }[] = [
  { id: "may", label: "Dầu máy" },
  { id: "cau", label: "Dầu cầu" },
  { id: "so", label: "Dầu số" },
];

const STATUS_RANK: Record<OilStatus, number> = {
  urgent: 0,
  change: 1,
  prepare: 2,
  wait: 3,
  "missing-base": 4,
  "missing-km": 5,
};

const fieldClass =
  "flex h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white disabled:opacity-50";

const outlineButton =
  "inline-flex h-10 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-4 text-sm font-semibold disabled:opacity-50";

function formatKm(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function today() {
  const shifted = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function statusClass(status: OilStatus) {
  if (status === "urgent") return "bg-[#fee2e2] text-[#b91c1c]";
  if (status === "change") return "bg-[#ffedd5] text-[#c2410c]";
  if (status === "prepare") return "bg-[#fef3c7] text-[#b45309]";
  if (status === "wait") return "bg-[#dcfce7] text-[#15803d]";
  return "bg-[#f1f5f9] text-[#64748b]";
}

function useCloseOnEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

export default function OilPage() {
  const [items, setItems] = useState<OilVehicle[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OilVehicle | null>(null);
  const [events, setEvents] = useState<OilEvent[]>([]);
  const [toast, setToast] = useState("");

  async function reload(keepId?: string) {
    const data = await listOils();
    setItems(data.items);
    if (keepId) {
      setSelected(data.items.find((item) => item.driverId === keepId) || null);
    }
  }

  useEffect(() => {
    let active = true;
    listOils()
      .then((data) => {
        if (active) setItems(data.items);
      })
      .catch((error) => {
        if (active) setToast(error instanceof Error ? error.message : "Không tải được sổ dầu");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visible = useMemo(() => {
    const keyword = foldText(query.trim()).replace(/[^a-z0-9]/g, "");
    const rows = keyword
      ? items.filter((item) => foldText(`${item.name} ${item.plate} ${item.mooc}`).replace(/[^a-z0-9]/g, "").includes(keyword))
      : items;
    return [...rows].sort((a, b) => STATUS_RANK[a.may.status] - STATUS_RANK[b.may.status] || a.name.localeCompare(b.name, "vi"));
  }, [items, query]);

  async function openVehicle(item: OilVehicle) {
    setSelected(item);
    setEvents([]);
    try {
      const detail = await getOil(item.driverId);
      setSelected(detail.vehicle);
      setEvents(detail.events);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Không tải được xe");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight">Thay dầu</h1>
            <p className="text-xs text-[var(--color-text-inverse)]">Dầu máy theo mốc 11.000 km. Dầu cầu và dầu số theo km đã chạy.</p>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
          <label className="relative block shrink-0">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm lái xe, biển đầu, biển mooc"
              aria-label="Tìm xe"
              className={`${fieldClass} pl-9`}
            />
          </label>
          {loading ? (
            <ListSkeleton />
          ) : visible.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-sm text-[var(--color-text-inverse)]">
              {query ? "Không có xe khớp." : "Chưa có lái xe."}
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {visible.map((item) => (
                <button
                  key={item.driverId}
                  type="button"
                  onClick={() => void openVehicle(item)}
                  className="flex w-full flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-3 py-3 text-left hover:border-[var(--color-text-secondary)]"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{item.name}</span>
                      <span className="block truncate text-sm text-[var(--color-text-inverse)]">
                        Đầu {item.plate || "—"} · Mooc {item.mooc || "—"}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(item.may.status)}`}>{item.may.label}</span>
                  </span>
                  <span className="grid grid-cols-3 gap-2 text-xs text-[var(--color-text-inverse)]">
                    <span>Máy {formatKm(item.may.traveled)}</span>
                    <span>Cầu {formatKm(item.cau.traveled)}</span>
                    <span>Số {formatKm(item.so.traveled)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      {selected ? (
        <VehicleDialog
          vehicle={selected}
          events={events}
          onClose={() => setSelected(null)}
          onSaved={async (vehicle, message) => {
            setToast(message);
            await reload(vehicle.driverId);
            const detail = await getOil(vehicle.driverId);
            setSelected(detail.vehicle);
            setEvents(detail.events);
          }}
          onError={(message) => setToast(message)}
        />
      ) : null}
      {toast ? (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0f172a] px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      ) : null}
    </div>
  );
}

function VehicleDialog({
  vehicle,
  events,
  onClose,
  onSaved,
  onError,
}: {
  vehicle: OilVehicle;
  events: OilEvent[];
  onClose: () => void;
  onSaved: (vehicle: OilVehicle, message: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [km, setKm] = useState(vehicle.currentKm == null ? "" : String(vehicle.currentKm));
  const [kmDate, setKmDate] = useState(vehicle.currentKmDate || today());
  const [kind, setKind] = useState<OilKind>("may");
  const [changeKm, setChangeKm] = useState(vehicle.currentKm == null ? "" : String(vehicle.currentKm));
  const [changeDate, setChangeDate] = useState(today());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  useCloseOnEscape(true, onClose);

  useEffect(() => {
    setKm(vehicle.currentKm == null ? "" : String(vehicle.currentKm));
    setKmDate(vehicle.currentKmDate || today());
  }, [vehicle]);

  async function saveKm() {
    const value = Number(km);
    if (!Number.isInteger(value) || value < 0) {
      onError("Nhập km hiện tại");
      return;
    }
    setSaving(true);
    try {
      const updated = await setOilKm(vehicle.driverId, { km: value, date: kmDate });
      await onSaved(updated, "Đã lưu km hiện tại");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Không lưu được km");
    } finally {
      setSaving(false);
    }
  }

  async function saveChange() {
    const value = Number(changeKm);
    if (!Number.isInteger(value) || value < 0) {
      onError("Nhập km lúc thay");
      return;
    }
    setSaving(true);
    try {
      const updated = await recordOilChange(vehicle.driverId, { kind, km: value, date: changeDate, note });
      setNote("");
      await onSaved(updated, "Đã ghi lần thay dầu");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Không ghi được lần thay");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <button type="button" aria-label="Đóng" className="absolute inset-0" onClick={onClose} />
      <div className="relative flex max-h-[calc(100vh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{vehicle.name}</h2>
            <p className="truncate text-sm text-[var(--color-text-inverse)]">Đầu {vehicle.plate || "—"} · Mooc {vehicle.mooc || "—"}</p>
          </div>
          <button type="button" aria-label="Đóng hộp thoại" className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[#f1f5f9]" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <section className="space-y-2">
            <p className="text-sm font-semibold">Km hiện tại</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_11rem]">
              <input value={km} inputMode="numeric" onChange={(event) => setKm(event.target.value.replace(/[^\d]/g, ""))} className={fieldClass} aria-label="Km hiện tại" placeholder="Nhập km đồng hồ" />
              <input type="date" value={kmDate} onChange={(event) => setKmDate(event.target.value)} className={fieldClass} aria-label="Ngày nhập km" />
            </div>
            <button type="button" className={`${primaryButton} w-full`} disabled={saving} onClick={() => void saveKm()}>Lưu km</button>
          </section>
          <EngineCard oil={vehicle.may} />
          <DistanceCard title="Dầu cầu" oil={vehicle.cau} />
          <DistanceCard title="Dầu số" oil={vehicle.so} />
          <section className="space-y-2 rounded-xl border border-[var(--color-border-subtle)] p-3">
            <p className="text-sm font-semibold">Ghi đã thay</p>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((item) => (
                <button key={item.id} type="button" className={kind === item.id ? primaryButton : outlineButton} onClick={() => setKind(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_11rem]">
              <input value={changeKm} inputMode="numeric" onChange={(event) => setChangeKm(event.target.value.replace(/[^\d]/g, ""))} className={fieldClass} aria-label="Km lúc thay" placeholder="Km lúc thay" />
              <input type="date" value={changeDate} onChange={(event) => setChangeDate(event.target.value)} className={fieldClass} aria-label="Ngày thay" />
            </div>
            <input value={note} onChange={(event) => setNote(event.target.value)} className={fieldClass} placeholder="Ghi chú" aria-label="Ghi chú thay dầu" />
            <button type="button" className={`${primaryButton} w-full`} disabled={saving} onClick={() => void saveChange()}>
              <Droplet className="h-4 w-4" />
              Lưu lần thay
            </button>
          </section>
          <section className="space-y-2">
            <p className="text-sm font-semibold">Lịch sử</p>
            {events.length === 0 ? <p className="text-sm text-[var(--color-text-inverse)]">Chưa có lần thay.</p> : null}
            {events.map((event) => (
              <div key={event.id} className="rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 text-sm">
                <p className="font-medium">{KINDS.find((item) => item.id === event.kind)?.label} · {formatKm(event.km)} km</p>
                <p className="text-xs text-[var(--color-text-inverse)]">
                  {formatDate(event.date)}
                  {event.createdBy ? ` · ${event.createdBy}` : ""}
                  {event.note ? ` · ${event.note}` : ""}
                </p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function EngineCard({ oil }: { oil: EngineOil }) {
  return (
    <section className="space-y-1 rounded-xl border border-[var(--color-border-subtle)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Dầu máy</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(oil.status)}`}>{oil.label}</span>
      </div>
      <p className="text-sm">Đã đi {formatKm(oil.traveled)} km · Mốc gần nhất {formatKm(oil.lastKm)} km · {formatDate(oil.lastDate)}</p>
      <p className="text-xs text-[var(--color-text-inverse)]">
        Km dự kiến {formatKm(oil.dueKm)} · Ngày dự kiến {oil.dueDate ? formatDate(oil.dueDate) : oil.status === "missing-km" ? "Chưa nhập km hiện tại" : "—"}
      </p>
      <p className="text-xs text-[var(--color-text-inverse)]">Chưa đến km đến 11.000. Chuẩn bị đến 11.500. Thay đến 13.000. Sau đó là thay gấp.</p>
    </section>
  );
}

function DistanceCard({ title, oil }: { title: string; oil: DistanceOil }) {
  return (
    <section className="space-y-1 rounded-xl border border-[var(--color-border-subtle)] p-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-sm">Đã đi {formatKm(oil.traveled)} km · Mốc gần nhất {formatKm(oil.lastKm)} km · {formatDate(oil.lastDate)}</p>
      <p className="text-xs text-[var(--color-text-inverse)]">Km đã đi bằng km hiện tại trừ km thay gần nhất.</p>
    </section>
  );
}
