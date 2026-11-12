"use client";

import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, Trash2, Truck, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { createDriver, deleteDriver, listDrivers, updateDriver } from "@/lib/api";
import type { Driver, DriverInput, DriverList } from "@/lib/types";

const PAGE_SIZE = 20;

const emptyList: DriverList = {
  items: [],
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  totalPages: 1,
};

const emptyForm: DriverInput = { name: "", phone: "", plate: "", mooc: "", note: "" };

export default function DriversPage() {
  const [data, setData] = useState<DriverList>(emptyList);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Driver | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listDrivers({ q: query || undefined, page, limit: PAGE_SIZE }));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Không tải được danh sách lái xe");
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleSubmit(input: DriverInput) {
    if (editing) {
      await updateDriver(editing.id, input);
      setToast("Đã cập nhật lái xe");
    } else {
      await createDriver(input);
      setToast("Đã thêm lái xe");
    }
    setDialogOpen(false);
    setEditing(null);
    await fetchList();
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setActionId(pendingDelete.id);
    try {
      await deleteDriver(pendingDelete.id);
      setToast(`Đã xóa "${pendingDelete.name}"`);
      setPendingDelete(null);
      await fetchList();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Xóa thất bại");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3">
          <h1 className="text-base font-semibold tracking-tight">Lái xe</h1>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className={primaryButton}
          >
            <Plus className="h-4 w-4" />
            Thêm lái xe
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
          <label className="relative block shrink-0">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm tên, số điện thoại, biển số đầu, mooc"
              className={`${fieldClass} pl-9`}
            />
          </label>
          {loading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center text-[var(--color-text-inverse)]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : data.items.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
              <Truck className="h-8 w-8 text-[var(--color-text-inverse)]" />
              <p className="font-semibold">{query ? "Không có lái xe khớp tìm kiếm" : "Chưa có lái xe"}</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto lg:hidden">
                {data.items.map((driver) => (
                  <article key={driver.id} className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] p-3 shadow-[var(--shadow-card)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{driver.name}</p>
                        <p className="mt-1 text-sm text-[var(--color-text-inverse)]">{driver.phone || "Chưa có số"} · Đầu {driver.plate || "—"} · Mooc {driver.mooc || "—"}</p>
                        {driver.note ? <p className="mt-1 line-clamp-2 text-sm">{driver.note}</p> : null}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" aria-label="Sửa" className={outlineButton} title="Sửa" onClick={() => { setEditing(driver); setDialogOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" aria-label="Xóa" className={dangerButton} title="Xóa" disabled={actionId === driver.id} onClick={() => setPendingDelete(driver)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="crm-table-frame hidden min-h-0 flex-1 lg:block">
                <div className="h-full overflow-auto">
                  <table className="crm-data-table">
                    <thead>
                      <tr>
                        <th>Họ tên</th>
                        <th>Biển số đầu</th>
                        <th>Biển số mooc</th>
                        <th>Số điện thoại</th>
                        <th>Ghi chú</th>
                        <th className="w-28" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((driver) => (
                        <tr key={driver.id}>
                          <td className="font-semibold">{driver.name}</td>
                          <td>{driver.plate || "—"}</td>
                          <td>{driver.mooc || "—"}</td>
                          <td>{driver.phone || "—"}</td>
                          <td className="max-w-xs truncate">{driver.note || "—"}</td>
                          <td>
                            <div className="flex justify-end gap-2">
                              <button type="button" aria-label="Sửa" className={outlineButton} onClick={() => { setEditing(driver); setDialogOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button type="button" aria-label="Xóa" className={dangerButton} disabled={actionId === driver.id} onClick={() => setPendingDelete(driver)}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 text-sm">
                <p className="text-[var(--color-text-inverse)]">{data.total} lái xe</p>
                <div className="flex items-center gap-2">
                  <button type="button" className={outlineButton} disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span>{page}/{data.totalPages}</span>
                  <button type="button" className={outlineButton} disabled={page >= data.totalPages} onClick={() => setPage((current) => current + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      {dialogOpen ? (
        <DriverDialog
          driver={editing}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}
      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-elevated)]">
            <p className="font-semibold">Xóa lái xe?</p>
            <p className="mt-1 text-sm text-[var(--color-text-inverse)]">{pendingDelete.name}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={outlineButton} onClick={() => setPendingDelete(null)}>Hủy</button>
              <button type="button" className={dangerButton} onClick={() => void handleDelete()}>Xóa</button>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0c2810] px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function DriverDialog({
  driver,
  onClose,
  onSubmit,
}: {
  driver: Driver | null;
  onClose: () => void;
  onSubmit: (input: DriverInput) => Promise<void>;
}) {
  const titleId = useId();
  const [form, setForm] = useState<DriverInput>(driver ? { name: driver.name, phone: driver.phone, plate: driver.plate, mooc: driver.mooc || "", note: driver.note } : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        name: form.name.trim(),
        phone: form.phone.trim(),
        plate: form.plate.trim(),
        mooc: form.mooc.trim(),
        note: form.note.trim(),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-md rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-elevated)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 id={titleId} className="text-base font-semibold">{driver ? "Sửa lái xe" : "Thêm lái xe"}</h2>
          <button type="button" aria-label="Đóng" onClick={onClose} className={outlineButton}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Họ tên" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
          <Field label="Số điện thoại" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
          <Field label="Biển số đầu" value={form.plate} onChange={(plate) => setForm({ ...form, plate })} />
          <Field label="Biển số mooc" value={form.mooc} onChange={(mooc) => setForm({ ...form, mooc })} />
          <label className="block text-sm font-medium">
            Ghi chú
            <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className={`${fieldClass} mt-1 h-20 py-2`} />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={outlineButton} onClick={onClose}>Hủy</button>
          <button type="submit" className={primaryButton} disabled={saving}>{saving ? "Đang lưu" : "Lưu"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} mt-1`} />
    </label>
  );
}

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#016502] disabled:opacity-50";

const outlineButton =
  "inline-flex h-8 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-xs font-semibold shadow-sm transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50";

const dangerButton =
  "inline-flex h-8 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-red-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50";

const fieldClass =
  "flex h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-sm font-normal shadow-sm outline-none placeholder:text-[var(--color-text-inverse)] focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";
