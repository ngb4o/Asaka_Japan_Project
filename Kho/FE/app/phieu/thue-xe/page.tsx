"use client";

import { ChevronDown, Download, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { PreviewButton } from "@/components/PreviewButton";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createRentalProposal,
  deleteRentalProposal,
  getRentalProposal,
  listRentalProposals,
  updateRentalProposal,
  type RentalProposalInput,
} from "@/lib/api";
import { buildFilledRentalSheet } from "@/lib/fillRentalSheet";
import type { RentalProposal } from "@/lib/types";

type Line = {
  id: number;
  date: string;
  name: string;
  unit: string;
  quantity: string;
  price: string;
  note: string;
};

const DEFAULT_SUBJECT = 'V/v : " Thanh toán chi phí thuê xe vận chuyển lốp xe từ Nghệ An vào Đà Nẵng "';
const DEFAULT_CONTENT = "Nội dung đề xuất: Do lốp xe đã bị hư hỏng, không đảm bảo điều kiện vận hành, cần được vận chuyển khẩn cấp vào Xưởng BDSC Đà Nẵng để phục vụ công tác sửa chữa và thay thế, đảm bảo phương tiện sớm được khắc phục, đưa vào hoạt động, tránh ảnh hưởng đến việc vận chuyển và vận hành của Công ty. Vì vậy, Xưởng BDSC Đà Nẵng thuê xe vận chuyển gấp 04 quả lốp từ Nghệ An vào xưởng BDSC Đà Nẵng.";
const DRAFTS_OPEN_KEY = "kho-rental-drafts-open";

let nextLineId = 1;

export default function RentalProposalPage() {
  const today = isoDate(new Date());
  const [reportDate, setReportDate] = useState(today);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [lines, setLines] = useState<Line[]>(() => [emptyLine()]);
  const [drafts, setDrafts] = useState<RentalProposal[]>([]);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [slipId, setSlipId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const parsedDate = parseIsoDate(reportDate);
  const total = lines.reduce((sum, line) => sum + (lineAmount(line) || 0), 0);

  useEffect(() => {
    setDraftsOpen(window.localStorage.getItem(DRAFTS_OPEN_KEY) === "1");
  }, []);

  useEffect(() => {
    let active = true;
    listRentalProposals()
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
    getRentalProposal(slipId)
      .then((proposal) => {
        if (!active) return;
        setReportDate(proposal.reportDate);
        setSubject(proposal.subject);
        setContent(proposal.content);
        setLines(proposal.lines.map((line) => ({
          id: nextLineId++,
          date: line.date,
          name: line.itemName,
          unit: line.unit || "",
          quantity: formatStoredQuantity(line.quantity),
          price: String(line.price),
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

  function toggleDrafts() {
    setDraftsOpen((open) => {
      const next = !open;
      window.localStorage.setItem(DRAFTS_OPEN_KEY, next ? "1" : "0");
      return next;
    });
  }

  function updateLine(id: number, patch: Partial<Line>) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  }

  function readProposal(): RentalProposalInput | null {
    if (!parsedDate) {
      setError("Nhập ngày");
      return null;
    }
    if (!subject.trim()) {
      setError("Nhập nội dung V/v");
      return null;
    }
    if (!content.trim()) {
      setError("Nhập nội dung đề xuất");
      return null;
    }
    const filled = lines.filter((line) => !isBlank(line));
    if (!filled.length) {
      setError("Nhập ít nhất một dòng");
      return null;
    }
    if (filled.length > 30) {
      setError("Một báo cáo tối đa 30 dòng");
      return null;
    }
    for (const line of filled) {
      if (!parseIsoDate(line.date)) {
        setError("Nhập ngày tháng");
        return null;
      }
      if (!line.name.trim()) {
        setError("Nhập tên vật tư");
        return null;
      }
      if (!(parseQuantity(line.quantity) > 0)) {
        setError(`Nhập số lượng ${line.name}`);
        return null;
      }
      if (line.price.trim() === "" || !/^\d+$/.test(line.price.trim())) {
        setError(`Nhập đơn giá ${line.name}`);
        return null;
      }
    }
    return {
      reportDate,
      subject: subject.trim(),
      content: content.trim(),
      lines: filled.map((line) => ({
        date: line.date,
        itemName: line.name.trim(),
        unit: line.unit.trim(),
        quantity: parseQuantity(line.quantity),
        price: Number(line.price),
        note: line.note.trim(),
      })),
    };
  }

  async function persist(input: RentalProposalInput) {
    const result = slipId ? await updateRentalProposal(slipId, input) : await createRentalProposal(input);
    setSlipId(result.id);
    const params = new URLSearchParams(window.location.search);
    if (params.get("draft") !== result.id) {
      window.history.replaceState(null, "", `/phieu/thue-xe?draft=${result.id}`);
    }
    setDrafts(await listRentalProposals());
  }

  function startNew() {
    setSlipId("");
    setReportDate(isoDate(new Date()));
    setSubject(DEFAULT_SUBJECT);
    setContent(DEFAULT_CONTENT);
    setLines([emptyLine()]);
    setError("");
    setNotice("");
    window.history.replaceState(null, "", "/phieu/thue-xe");
  }

  async function removeDraft(id: string) {
    const draft = drafts.find((item) => item.id === id);
    if (!window.confirm(`Xóa bản nháp ${draft ? formatDraftDate(draft.reportDate) : "này"}?`)) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await deleteRentalProposal(id);
      if (slipId === id) startNew();
      setDrafts(await listRentalProposals());
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
    window.history.replaceState(null, "", `/phieu/thue-xe?draft=${id}`);
  }

  async function saveDraft() {
    const input = readProposal();
    if (!input) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await persist(input);
      setNotice("Đã lưu nháp.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Lưu nháp thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function saveAndDownload() {
    const input = readProposal();
    if (!input || !parsedDate) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const template = await fetch("/forms/de-xuat-thue-xe.xlsx").then((response) => {
        if (!response.ok) throw new Error("Không tải được file Excel mẫu");
        return response.arrayBuffer();
      });
      const file = await buildFilledRentalSheet(template, {
        reportDate: input.reportDate,
        subject: input.subject,
        content: input.content,
        lines: input.lines.map((line) => ({
          date: line.date,
          name: line.itemName,
          unit: line.unit,
          quantity: line.quantity,
          price: line.price,
          note: line.note,
        })),
      });
      await persist(input);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `De-xuat-thue-xe-${parsedDate.year}-${parsedDate.month}-${parsedDate.day}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("Đã lưu nháp và tải sheet.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Lưu báo cáo thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      {!showPreview && drafts.length > 0 ? (
        <section className="shrink-0 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white shadow-[var(--shadow-soft)]">
          <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={toggleDrafts} aria-expanded={draftsOpen}>
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
                  <div key={draft.id} className={`flex shrink-0 items-stretch overflow-hidden rounded-[var(--radius-button)] border ${selected ? "border-transparent bg-[var(--color-text-secondary)] text-white" : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-primary)]"}`}>
                    <button type="button" className="px-3 py-2 text-left text-sm font-semibold" onClick={() => openDraft(draft.id)}>
                      <span className="block whitespace-nowrap">{formatDraftDate(draft.reportDate)}</span>
                      <span className={`block max-w-56 truncate text-xs font-normal ${selected ? "text-white/80" : "text-[var(--color-text-inverse)]"}`}>
                        {draft.lines.length} vật tư · {draft.subject}
                      </span>
                    </button>
                    <button type="button" className={`px-2 ${selected ? "text-white hover:bg-white/10" : "text-red-600 hover:bg-[var(--color-surface-muted)]"}`} aria-label={`Xóa bản nháp ${formatDraftDate(draft.reportDate)}`} disabled={saving} onClick={() => void removeDraft(draft.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3">
          <div>
            <Link href="/phieu" className="text-xs font-semibold text-[var(--color-text-secondary)]">Phiếu</Link>
            <h1 className="text-base font-semibold">Đề xuất và thanh toán thuê xe</h1>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {slipId ? <button type="button" className={secondaryButton} disabled={saving} onClick={startNew}>Phiếu mới</button> : null}
            <button type="button" className={secondaryButton} disabled={saving} onClick={() => void saveDraft()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu nháp
            </button>
            <button type="button" className={primaryButton} disabled={saving} onClick={() => void saveAndDownload()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Lưu và tải sheet
            </button>
            <PreviewButton showing={showPreview} onToggle={() => setShowPreview((open) => !open)} />
          </div>
        </div>
        {showPreview ? null : <div className="space-y-4 p-4">
          <label className="block text-sm font-medium">
            Ngày
            <input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} className={`${fieldClass} mt-1 max-w-48`} />
          </label>
          <label className="block text-sm font-medium">
            V/v
            <input value={subject} onChange={(event) => setSubject(event.target.value)} className={`${fieldClass} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Nội dung đề xuất
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={2} className={`${fieldClass} mt-1 h-auto py-2`} />
          </label>
          <div className="overflow-x-auto border-t border-[var(--color-border-subtle)] pt-4">
            <div className={lineGridClass}>
              <p className="text-sm font-medium">Ngày tháng</p>
              <p className="text-sm font-medium">Tên vật tư</p>
              <p className="text-sm font-medium">ĐVT</p>
              <p className="text-sm font-medium">SL</p>
              <p className="text-sm font-medium">Đơn giá</p>
              <p className="text-sm font-medium">Thành tiền</p>
              <p className="text-sm font-medium">Ghi chú</p>
              <span />
            </div>
            <div className="mt-2 space-y-2">
              {lines.map((line) => {
                const amount = lineAmount(line);
                return (
                  <div key={line.id} className={lineGridClass}>
                    <input type="date" value={line.date} onChange={(event) => updateLine(line.id, { date: event.target.value })} className={fieldClass} aria-label="Ngày tháng" />
                    <input value={line.name} onChange={(event) => updateLine(line.id, { name: event.target.value })} className={fieldClass} aria-label="Tên vật tư" placeholder="Cước gửi xe khách" />
                    <input value={line.unit} onChange={(event) => updateLine(line.id, { unit: event.target.value })} className={fieldClass} aria-label="ĐVT" placeholder="Lần" />
                    <input inputMode="decimal" value={line.quantity} onChange={(event) => { const next = event.target.value; if (next !== "" && !/^\d*([.,]\d{0,2})?$/.test(next)) return; updateLine(line.id, { quantity: next }); }} className={fieldClass} aria-label="SL" />
                    <input inputMode="numeric" value={line.price} onChange={(event) => { const next = event.target.value; if (next !== "" && !/^\d*$/.test(next)) return; updateLine(line.id, { price: next }); }} className={fieldClass} aria-label="Đơn giá" />
                    <input value={amount == null ? "" : formatMoney(amount)} readOnly tabIndex={-1} className={`${fieldClass} bg-[var(--color-surface-muted)]`} aria-label="Thành tiền" />
                    <input value={line.note} onChange={(event) => updateLine(line.id, { note: event.target.value })} className={fieldClass} aria-label="Ghi chú" />
                    <button type="button" className={dangerButton} aria-label="Bỏ dòng" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button type="button" className={`${secondaryButton} mt-3`} onClick={() => setLines((current) => [...current, emptyLine()])}>
              <Plus className="h-4 w-4" />
              Thêm dòng
            </button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {notice ? <p className="text-sm text-[var(--color-text-secondary)]">{notice}</p> : null}
        </div>}
      </section>

      {showPreview ? <article className="w-full overflow-x-auto border border-black bg-white p-6 text-black shadow-[var(--shadow-soft)]">
        <p className="text-center text-sm font-semibold">CÔNG TY CỔ PHẦN MAI LINH ĐÔNG ĐÔ</p>
        <p className="text-center text-xs">Số 499 Lương Thế Vinh - Phường Mễ Trì, Quận Nam Từ Liêm - TP Hà Nội</p>
        <p className="mt-2 text-right text-sm">
          Đà Nẵng, ngày {parsedDate ? String(parsedDate.day).padStart(2, "0") : ""} tháng {parsedDate ? String(parsedDate.month).padStart(2, "0") : ""} năm {parsedDate ? parsedDate.year : ""}
        </p>
        <h2 className="mt-2 text-center text-base font-bold">BÁO CÁO ĐỀ XUẤT VÀ THANH TOÁN</h2>
        <p className="mt-1 text-center text-sm">{subject}</p>
        <p className="mt-3 text-sm">Kính gửi : - Ban giám đốc Công ty CP Mai Linh Đông Đô</p>
        <div className="mt-3 grid min-h-[4.5rem] grid-cols-[8rem_minmax(0,1fr)] border border-black text-sm">
          <p className="flex items-center justify-center border-r border-black px-2 text-center font-semibold">DUYỆT</p>
          <p className="flex items-center px-2 font-semibold">Ý KIẾN</p>
        </div>
        <p className="mt-4 text-sm">Tôi tên là : Nguyễn Gia Bảo</p>
        <p className="text-sm">Chức vụ: Thủ kho</p>
        <p className="mt-2 text-sm">{content}</p>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr>
              {["TT", "Ngày tháng", "Tên vật tư", "ĐVT", "SL", "Đơn giá", "Thành tiền", "Ghi chú"].map((heading) => (
                <th key={heading} className="border border-black px-2 py-1 text-center font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const amount = lineAmount(line);
              const lineDate = parseIsoDate(line.date);
              return (
                <tr key={line.id} className="h-8">
                  <td className="w-10 border border-black px-2 text-center">{index + 1}</td>
                  <td className="w-28 border border-black px-2 text-center">{lineDate ? `${String(lineDate.day).padStart(2, "0")}/${String(lineDate.month).padStart(2, "0")}/${lineDate.year}` : ""}</td>
                  <td className="border border-black px-2">{line.name}</td>
                  <td className="w-16 border border-black px-2 text-center">{line.unit}</td>
                  <td className="w-16 border border-black px-2 text-center">{formatQuantity(line.quantity)}</td>
                  <td className="w-24 border border-black px-2 text-right">{line.price ? formatMoney(Number(line.price)) : ""}</td>
                  <td className="w-28 border border-black px-2 text-right">{amount == null ? "" : formatMoney(amount)}</td>
                  <td className="border border-black px-2">{line.note}</td>
                </tr>
              );
            })}
            <tr className="h-8 font-semibold">
              <td className="border border-black px-2" />
              <td className="border border-black px-2">Tổng</td>
              <td className="border border-black px-2" colSpan={4} />
              <td className="border border-black px-2 text-right">{formatMoney(total)}</td>
              <td className="border border-black px-2" />
            </tr>
          </tbody>
        </table>
        <div className="mt-8 grid grid-cols-4 text-center text-sm">
          <p>Người đề xuất</p>
          <p>Điều Hành</p>
          <p>Kế Toán</p>
          <p>Kế Toán Trưởng</p>
          <p className="mt-10">Nguyễn Gia Bảo</p>
          <p className="mt-10">Nguyễn Thị Hà</p>
          <p className="mt-10">Phạm Thị Hải Lý</p>
          <p className="mt-10">Vũ Tiến Trung</p>
        </div>
      </article> : null}
    </div>
  );
}

function emptyLine(): Line {
  return { id: nextLineId++, date: "", name: "", unit: "", quantity: "", price: "", note: "" };
}

function isoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { year, month, day };
}

function formatDraftDate(value: string) {
  const date = parseIsoDate(value);
  return date ? `${date.day}/${date.month}/${date.year}` : value;
}

function isBlank(line: Line) {
  return !line.date && !line.name.trim() && !line.unit.trim() && !line.quantity.trim() && !line.price.trim() && !line.note.trim();
}

function parseQuantity(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) return Number.NaN;
  return Math.round(parsed * 100) / 100;
}

function formatQuantity(value: string) {
  const parsed = parseQuantity(value);
  if (!(parsed > 0)) return "";
  return String(parsed);
}

function formatStoredQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function lineAmount(line: Line) {
  const quantity = parseQuantity(line.quantity);
  if (line.price.trim() === "") return null;
  const price = Number(line.price);
  if (!(quantity > 0) || !Number.isInteger(price) || price < 0) return null;
  return Math.round(quantity * price);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

const lineGridClass = "grid min-w-[68rem] grid-cols-[9.5rem_minmax(12rem,1.4fr)_5rem_4.5rem_6.5rem_7rem_minmax(8rem,1fr)_auto] items-center gap-2";

const fieldClass =
  "flex h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";

const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50";

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#016502] disabled:opacity-50";

const dangerButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-button)] bg-red-600 text-white hover:bg-red-700";
