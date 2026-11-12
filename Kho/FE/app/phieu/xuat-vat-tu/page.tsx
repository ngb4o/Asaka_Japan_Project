"use client";

import { ChevronDown, Download, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { PreviewButton } from "@/components/PreviewButton";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { createExportSlip, deleteExportSlip, getExportSlip, listDrivers, listExportSlips, listMovements, updateExportSlip, type ExportSlipInput } from "@/lib/api";
import { buildFilledExportDoc } from "@/lib/fillExportDoc";
import type { Driver, ExportSlip, StockMovement } from "@/lib/types";

type Line = {
  movementId: string;
  name: string;
  unit: string;
  quantity: string;
  maxQuantity: number;
  note: string;
};

const ROW_COUNT = 10;
const DRAFTS_OPEN_KEY = "kho-drafts-open";

export default function ExportSlipPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [requester, setRequester] = useState("");
  const [driverId, setDriverId] = useState("");
  const [plate, setPlate] = useState("");
  const [mooc, setMooc] = useState("");
  const [km, setKm] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockMovement[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [slipId, setSlipId] = useState("");
  const [drafts, setDrafts] = useState<ExportSlip[]>([]);
  const [draftsOpen, setDraftsOpen] = useState(false);

  const driver = drivers.find((item) => item.id === driverId) || null;
  const today = new Date();

  useEffect(() => {
    setDraftsOpen(window.localStorage.getItem(DRAFTS_OPEN_KEY) === "1");
  }, []);

  function toggleDrafts() {
    setDraftsOpen((open) => {
      const next = !open;
      window.localStorage.setItem(DRAFTS_OPEN_KEY, next ? "1" : "0");
      return next;
    });
  }

  function chooseDriver(id: string) {
    setDriverId(id);
    const next = drivers.find((item) => item.id === id);
    setPlate(next?.plate || "");
    setMooc(next?.mooc || "");
  }

  useEffect(() => {
    let active = true;
    listDrivers({ limit: 100 })
      .then((driverList) => {
        if (!active) return;
        setDrivers(driverList.items);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Không tải được dữ liệu");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listExportSlips()
      .then((items) => {
        if (active) setDrafts(items);
      })
      .catch(() => {
        if (active) setDrafts([]);
      });
    const id = new URLSearchParams(window.location.search).get("draft") || "";
    if (id) setSlipId(id);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!slipId) return;
    let active = true;
    getExportSlip(slipId)
      .then((slip) => {
        if (!active) return;
        setRequester(slip.requester);
        setDriverId(slip.driverId);
        setPlate(slip.plate);
        setMooc(slip.mooc);
        setKm(String(slip.km));
        setLines(slip.lines.map((line) => ({
          movementId: line.movementId,
          name: line.itemName,
          unit: line.unit || "",
          quantity: formatQuantity(line.quantity),
          maxQuantity: line.available ?? line.quantity,
          note: line.note || "",
        })));
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Không tải được bản nháp");
      });
    return () => {
      active = false;
    };
  }, [slipId]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-material-picker]")) setPickerOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    let active = true;
    setSearching(true);
    const timer = window.setTimeout(() => {
      listMovements({ type: "out", unassigned: true, includeSlip: slipId || undefined, q: query.trim() || undefined, limit: 20 })
        .then((data) => {
          if (!active) return;
          const chosen = new Set(lines.map((line) => line.movementId));
          setResults(data.items.filter((item) => !chosen.has(item.id)));
        })
        .catch(() => {
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [lines, pickerOpen, query, slipId]);

  function addMovement(movement: StockMovement) {
    if (lines.some((line) => line.movementId === movement.id)) {
      setError("Vật tư này đã có trong phiếu");
      return;
    }
    if (lines.length >= ROW_COUNT) {
      setError("Một phiếu tối đa 10 vật tư");
      return;
    }
    setError("");
    const available = movement.available ?? movement.quantity;
    setLines((current) => [...current, {
      movementId: movement.id,
      name: movement.itemName,
      unit: "",
      quantity: formatQuantity(available),
      maxQuantity: available,
      note: movement.note,
    }]);
    setQuery("");
    setPickerOpen(false);
  }

  function readSlip(): { parsedKm: number; input: ExportSlipInput } | null {
    const parsedKm = Number(km.trim());
    if (!requester.trim()) {
      setError("Nhập người đề nghị");
      return null;
    }
    if (!km.trim() || !Number.isFinite(parsedKm) || parsedKm < 0) {
      setError("Nhập số km hiện tại");
      return null;
    }
    if (!driver) {
      setError("Chọn lái xe");
      return null;
    }
    if (lines.length === 0) {
      setError("Chọn ít nhất một vật tư");
      return null;
    }
    if (lines.some((line) => !line.name.trim())) {
      setError("Nhập tên vật tư");
      return null;
    }
    const quantities = lines.map((line) => parseQuantity(line.quantity));
    const invalid = lines.find((line, index) => !(quantities[index] > 0));
    if (invalid) {
      setError(`Nhập số lượng ${invalid.name}`);
      return null;
    }
    const over = lines.find((line, index) => quantities[index] - line.maxQuantity > 0.001);
    if (over) {
      setError(`Số lượng ${over.name} chỉ còn ${formatQuantity(over.maxQuantity)}`);
      return null;
    }
    return {
      parsedKm,
      input: {
        requester: requester.trim(),
        driverId,
        driverName: driver.name,
        plate: plate.trim(),
        mooc: mooc.trim(),
        km: parsedKm,
        lines: lines.map((line, index) => ({
          movementId: line.movementId,
          itemName: line.name.trim(),
          unit: line.unit.trim(),
          quantity: quantities[index],
          note: line.note.trim(),
        })),
      },
    };
  }

  async function persist(form: { input: ExportSlipInput }) {
    const result = slipId ? await updateExportSlip(slipId, form.input) : await createExportSlip(form.input);
    setSlipId(result.id);
    const params = new URLSearchParams(window.location.search);
    if (params.get("draft") !== result.id) {
      window.history.replaceState(null, "", `/phieu/xuat-vat-tu?draft=${result.id}`);
    }
    setDrafts(await listExportSlips());
    return result.id;
  }

  async function removeDraft(id: string) {
    const draft = drafts.find((item) => item.id === id);
    if (!window.confirm(`Xóa bản nháp ${draft?.driverName || "này"}?`)) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await deleteExportSlip(id);
      if (slipId === id) startNew();
      setDrafts(await listExportSlips());
      setNotice("Đã xóa bản nháp.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Xóa bản nháp thất bại");
    } finally {
      setSaving(false);
    }
  }

  function openDraft(id: string) {
    setError("");
    setNotice("");
    setSlipId(id);
    window.history.replaceState(null, "", `/phieu/xuat-vat-tu?draft=${id}`);
  }

  function startNew() {
    setSlipId("");
    setRequester("");
    setLines([]);
    setDriverId("");
    setPlate("");
    setMooc("");
    setKm("");
    setQuery("");
    setError("");
    setNotice("");
    window.history.replaceState(null, "", "/phieu/xuat-vat-tu");
  }

  async function saveDraft() {
    const form = readSlip();
    if (!form) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await persist(form);
      setNotice("Đã lưu nháp. Khi xuất thêm cho xe này, mở lại phiếu và thêm vật tư.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Lưu nháp thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function exportAndPrint() {
    const form = readSlip();
    if (!form || !driver) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const template = await fetch("/forms/giay-xuat-vat-tu.docx").then((response) => {
        if (!response.ok) throw new Error("Không tải được file Word mẫu");
        return response.arrayBuffer();
      });
      const file = await buildFilledExportDoc(template, {
        day: today.getDate(),
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        requester,
        driverName: driver.name,
        plate,
        mooc,
        km: formatQuantity(form.parsedKm),
        lines: lines.map((line) => ({
          name: line.name,
          unit: line.unit.trim(),
          quantity: formatQuantity(parseQuantity(line.quantity)),
          note: line.note.trim(),
        })),
      });
      await persist(form);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Phieu-xuat-vat-tu-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("Đã lưu nháp và tải Word. Có thể mở lại để thêm vật tư.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Lưu phiếu thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      {!showPreview && drafts.length > 0 ? (
        <section className="shrink-0 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white shadow-[var(--shadow-soft)] print:hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            onClick={toggleDrafts}
            aria-expanded={draftsOpen}
          >
            <span className="text-sm font-medium">Bản nháp</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-text-secondary)]">
              {draftsOpen ? "Ẩn" : "Hiện"}
              <ChevronDown className={`h-4 w-4 transition-transform ${draftsOpen ? "rotate-180" : ""}`} />
            </span>
          </button>
          {draftsOpen ? (
            <div className="flex gap-2 overflow-x-auto px-4 pb-3">
              {drafts.map((draft) => {
                const selected = draft.id === slipId;
                return (
                  <div
                    key={draft.id}
                    className={`flex shrink-0 items-stretch overflow-hidden rounded-[var(--radius-button)] border ${selected ? "border-transparent bg-[var(--color-text-secondary)] text-white" : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-primary)]"}`}
                  >
                    <button type="button" className="px-3 py-2 text-left text-sm font-semibold" onClick={() => openDraft(draft.id)}>
                      <span className="block whitespace-nowrap">{draft.driverName}</span>
                      <span className={`block whitespace-nowrap text-xs font-normal ${selected ? "text-white/80" : "text-[var(--color-text-inverse)]"}`}>
                        {draft.lines.length} vật tư · {formatWhen(draft.updatedAt || draft.createdAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`px-2 ${selected ? "text-white hover:bg-white/10" : "text-red-600 hover:bg-[var(--color-surface-muted)]"}`}
                      aria-label={`Xóa bản nháp ${draft.driverName}`}
                      disabled={saving}
                      onClick={() => void removeDraft(draft.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white shadow-[var(--shadow-soft)] print:hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3">
          <div>
            <Link href="/phieu" className="text-xs font-semibold text-[var(--color-text-secondary)]">Phiếu</Link>
            <h1 className="text-base font-semibold">Xuất vật tư sửa chữa</h1>
            {slipId ? <p className="text-xs text-[var(--color-text-inverse)]">Đang sửa bản nháp. Có thể thêm vật tư xuất sau cho xe này.</p> : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {slipId ? (
              <button type="button" className={secondaryButton} disabled={saving} onClick={startNew}>
                Phiếu mới
              </button>
            ) : null}
            <button type="button" className={secondaryButton} disabled={!ready || saving} onClick={() => void saveDraft()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu nháp
            </button>
            <button type="button" className={primaryButton} disabled={!ready || saving} onClick={() => void exportAndPrint()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Lưu và tải Word
            </button>
            <PreviewButton showing={showPreview} onToggle={() => setShowPreview((open) => !open)} />
          </div>
        </div>
        {showPreview ? null : <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Lái xe
              <div className="mt-1">
                <SearchableSelect
                  options={drivers.map((item) => ({
                    value: item.id,
                    label: item.name,
                    description: item.plate || undefined,
                  }))}
                  value={driverId}
                  onChange={chooseDriver}
                  placeholder="Chọn lái xe"
                  searchPlaceholder="Tìm lái xe"
                  emptyText="Không có lái xe"
                />
              </div>
            </label>
            <div className="relative" data-material-picker>
              <label className="block text-sm font-medium">
                Thêm vật tư
                <input
                  value={query}
                  onFocus={() => setPickerOpen(true)}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPickerOpen(true);
                  }}
                  className={`${fieldClass} mt-1`}
                  placeholder="Chọn vật tư đã xuất"
                />
              </label>
              {pickerOpen ? (
                <div className="absolute top-full z-[80] mt-1.5 w-full overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-elevated)]">
                  {searching && results.length === 0 ? <p className="px-3 py-6 text-center text-sm text-[var(--color-text-inverse)]">Đang tìm...</p> : null}
                  {!searching && results.length === 0 ? <p className="px-3 py-6 text-center text-sm text-[var(--color-text-inverse)]">Không có vật tư đã xuất chưa gắn phiếu</p> : null}
                  <div className="max-h-60 overflow-y-auto p-1">
                    {results.map((movement) => (
                      <button
                        key={movement.id}
                        type="button"
                        className="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => addMovement(movement)}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{movement.itemName}</span>
                          <span className="mt-0.5 block truncate text-xs text-[var(--color-text-inverse)]">
                            Còn {formatQuantity(movement.available ?? movement.quantity)} · {formatWhen(movement.createdAt)}
                          </span>
                        </span>
                        <Plus className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-inverse)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <label className="block text-sm font-medium">
              Người đề nghị
              <input value={requester} onChange={(event) => setRequester(event.target.value)} required placeholder="Nhập người đề nghị" className={`${fieldClass} mt-1`} />
            </label>
            <label className="block text-sm font-medium">
              Biển số đầu
              <input value={plate} onChange={(event) => setPlate(event.target.value)} placeholder="Nhập biển số đầu" className={`${fieldClass} mt-1`} />
            </label>
            <label className="block text-sm font-medium">
              Biển số mooc
              <input value={mooc} onChange={(event) => setMooc(event.target.value)} placeholder="Nhập biển số mooc" className={`${fieldClass} mt-1`} />
            </label>
            <label className="block text-sm font-medium">
              Số km hiện tại
              <input inputMode="decimal" value={km} onChange={(event) => setKm(event.target.value)} required placeholder="Nhập số km hiện tại" className={`${fieldClass} mt-1`} />
            </label>
          </div>
          {lines.length > 0 ? (
            <div className="border-t border-[var(--color-border-subtle)] pt-4">
              <div className={lineGridClass}>
                <p className="text-sm font-medium">Tên vật tư</p>
                <p className="text-sm font-medium">Đơn vị</p>
                <p className="text-sm font-medium">Số lượng</p>
                <p className="text-sm font-medium">Ghi chú</p>
                <span aria-hidden="true" className="w-10" />
              </div>
              <div className="mt-1 space-y-2">
                {lines.map((line) => (
                  <div key={line.movementId} className={lineGridClass}>
                    <input
                      value={line.name}
                      onChange={(event) => setLines((current) => current.map((item) => item.movementId === line.movementId ? { ...item, name: event.target.value } : item))}
                      className={fieldClass}
                      aria-label="Tên vật tư"
                    />
                    <input
                      value={line.unit}
                      onChange={(event) => setLines((current) => current.map((item) => item.movementId === line.movementId ? { ...item, unit: event.target.value } : item))}
                      className={fieldClass}
                      aria-label="Đơn vị"
                    />
                    <input
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(event) => {
                        const next = event.target.value;
                        if (next !== "" && !/^\d*([.,]\d{0,2})?$/.test(next)) return;
                        setLines((current) => current.map((item) => item.movementId === line.movementId ? { ...item, quantity: next } : item));
                      }}
                      className={fieldClass}
                      aria-label="Số lượng"
                    />
                    <input
                      value={line.note}
                      onChange={(event) => setLines((current) => current.map((item) => item.movementId === line.movementId ? { ...item, note: event.target.value } : item))}
                      className={fieldClass}
                      aria-label="Ghi chú"
                    />
                    <button type="button" className={dangerButton} aria-label="Bỏ vật tư" onClick={() => setLines((current) => current.filter((item) => item.movementId !== line.movementId))}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {notice ? <p className="text-sm text-[var(--color-text-secondary)]">{notice}</p> : null}
        </div>}
      </section>

      {showPreview ? <article className="mx-auto mt-4 w-full max-w-[190mm] overflow-x-auto border border-black bg-white p-6 text-black shadow-[var(--shadow-soft)]">
        <p className="text-center text-sm font-semibold">CÔNG TY CP MAI LINH ĐỒNG ĐÔ</p>
        <h2 className="mt-1 text-center text-base font-bold">PHIẾU ĐỀ NGHỊ XUẤT VẬT TƯ SỬA CHỮA</h2>
        <p className="mt-1 text-center text-sm">Ngày {today.getDate()} tháng {today.getMonth() + 1} năm {today.getFullYear()}</p>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <p>Người đề nghị: {requester}</p>
          <p>Cấp BDSC:</p>
          <p>Tên lái xe: {driver?.name || ""}</p>
          <p>Đơn vị:</p>
        </div>
        <p className="mt-2 flex items-center gap-24 text-sm">
          <span>BKS Đầu: {plate}</span>
          <span>Rơ Móc: {mooc}</span>
          <span>Số km hiện tại: {km}</span>
        </p>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr>
              {["STT", "Tên vật tư", "Đơn vị", "Số lượng", "Ghi chú"].map((heading) => (
                <th
                  key={heading}
                  className="border border-black px-2 py-1 text-center font-semibold"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROW_COUNT }, (_, index) => {
              const line = lines[index];
              return (
                <tr key={index} className="h-8">
                  <td className="w-10 border border-black px-2 text-center">{index + 1}</td>
                  <td className="border border-black px-2">{line?.name || ""}</td>
                  <td className="w-16 border border-black px-2 text-center">{line?.unit.trim() || ""}</td>
                  <td className="w-20 border border-black px-2 text-center">{line && parseQuantity(line.quantity) > 0 ? formatQuantity(parseQuantity(line.quantity)) : ""}</td>
                  <td className="border border-black px-2">{line?.note || ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-8 grid grid-cols-5 text-center text-sm">
          {["Người đề nghị", "Lái xe", "Thủ kho", "QL Bộ phận", "Ban giám đốc"].map((label) => (
            <p key={label}>{label}</p>
          ))}
        </div>
      </article> : null}
    </div>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function parseQuantity(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) return Number.NaN;
  return Math.round(parsed * 100) / 100;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50";

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#016502] disabled:opacity-50";

const dangerButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-button)] bg-red-600 text-white hover:bg-red-700";

const lineGridClass = "grid grid-cols-[minmax(0,1.4fr)_8rem_7.5rem_minmax(0,1fr)_auto] items-center gap-2";

const fieldClass =
  "flex h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";
