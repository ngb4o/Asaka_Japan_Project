"use client";

import { ChevronDown, Download, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { PreviewButton } from "@/components/PreviewButton";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createPhucVinhProposal,
  deletePhucVinhProposal,
  getPhucVinhProposal,
  listPhucVinhProposals,
  updatePhucVinhProposal,
  type PhucVinhProposalInput,
} from "@/lib/api";
import { buildFilledPhucVinhSheet } from "@/lib/fillPhucVinhSheet";
import type { PhucVinhProposal } from "@/lib/types";

type Line = {
  id: number;
  name: string;
  unit: string;
  quantity: string;
  price: string;
  stock: string;
  supplier: string;
  receiver: string;
};

const DRAFTS_OPEN_KEY = "kho-phucvinh-drafts-open";
const CLOSING = `Tổng số tiền dự kiến thanh toán:
Thời gian bàn giao vật tư: Dự kiến ngày….tháng…năm
Trong quá trình thực hiện đơn hàng nếu có sự biến động về giá cả (tăng/giảm), nhà cung cấp (thiếu hàng, hết hàng), bộ phận Mua hàng sẽ có báo cáo cụ thể tới Ban giám đốc CTy MLDD hoặc người được Ủy quyền theo quy định. Ngoài những vật tư dự kiến theo tháng có những phát sinh đề xuất bổ sung sau.
Kính mong được sự chỉ đạo của Ông Chủ Tịch.
Bộ phận Mua hàng Xưởng BDSC Đà Nẵng trân trọng cảm ơn!`;

let nextLineId = 1;

export default function PhucVinhProposalPage() {
  const today = new Date();
  const [reportDate, setReportDate] = useState(() => isoDate(today));
  const [subject, setSubject] = useState(() => subjectText(today.getMonth() + 1, today.getFullYear()));
  const [content, setContent] = useState(() => contentText(today.getMonth() + 1, today.getFullYear()));
  const [lines, setLines] = useState<Line[]>(() => [emptyLine()]);
  const [drafts, setDrafts] = useState<PhucVinhProposal[]>([]);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [slipId, setSlipId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const parsedDate = parseIsoDate(reportDate);

  useEffect(() => {
    setDraftsOpen(window.localStorage.getItem(DRAFTS_OPEN_KEY) === "1");
  }, []);

  useEffect(() => {
    let active = true;
    listPhucVinhProposals()
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
    getPhucVinhProposal(slipId)
      .then((proposal) => {
        if (!active) return;
        setReportDate(proposal.reportDate);
        setSubject(proposal.subject);
        setContent(proposal.content);
        setLines(proposal.lines.map((line) => ({
          id: nextLineId++,
          name: line.itemName,
          unit: line.unit || "",
          quantity: formatStoredQuantity(line.quantity),
          price: line.price == null ? "" : String(line.price),
          stock: line.stock == null ? "" : String(line.stock),
          supplier: line.supplier || "",
          receiver: line.receiver || "",
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

  function changeReportDate(value: string) {
    const previous = parseIsoDate(reportDate);
    const next = parseIsoDate(value);
    setReportDate(value);
    if (!previous || !next) return;
    setSubject((current) => current === subjectText(previous.month, previous.year) ? subjectText(next.month, next.year) : current);
    setContent((current) => current === contentText(previous.month, previous.year) ? contentText(next.month, next.year) : current);
  }

  function updateLine(id: number, patch: Partial<Line>) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  }

  function readProposal(): PhucVinhProposalInput | null {
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
      if (!line.name.trim()) {
        setError("Nhập tên vật tư");
        return null;
      }
      if (!(parseQuantity(line.quantity) > 0)) {
        setError(`Nhập số lượng ${line.name}`);
        return null;
      }
      if (line.price.trim() !== "" && !/^\d+$/.test(line.price.trim())) {
        setError(`Nhập đơn giá ${line.name}`);
        return null;
      }
      if (line.stock.trim() !== "" && !/^\d+$/.test(line.stock.trim())) {
        setError(`Nhập tồn kho ${line.name}`);
        return null;
      }
    }
    return {
      reportDate,
      subject: subject.trim(),
      content: content.trim(),
      lines: filled.map((line) => ({
        itemName: line.name.trim(),
        unit: line.unit.trim(),
        quantity: parseQuantity(line.quantity),
        price: line.price.trim() === "" ? null : Number(line.price),
        stock: line.stock.trim() === "" ? null : Number(line.stock),
        supplier: line.supplier.trim(),
        receiver: line.receiver.trim(),
      })),
    };
  }

  async function persist(input: PhucVinhProposalInput) {
    const result = slipId ? await updatePhucVinhProposal(slipId, input) : await createPhucVinhProposal(input);
    setSlipId(result.id);
    const params = new URLSearchParams(window.location.search);
    if (params.get("draft") !== result.id) {
      window.history.replaceState(null, "", `/phieu/vat-tu-phuc-vinh?draft=${result.id}`);
    }
    setDrafts(await listPhucVinhProposals());
  }

  function startNew() {
    const now = new Date();
    setSlipId("");
    setReportDate(isoDate(now));
    setSubject(subjectText(now.getMonth() + 1, now.getFullYear()));
    setContent(contentText(now.getMonth() + 1, now.getFullYear()));
    setLines([emptyLine()]);
    setError("");
    setNotice("");
    window.history.replaceState(null, "", "/phieu/vat-tu-phuc-vinh");
  }

  async function removeDraft(id: string) {
    const draft = drafts.find((item) => item.id === id);
    if (!window.confirm(`Xóa bản nháp ${draft ? formatDraftDate(draft.reportDate) : "này"}?`)) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await deletePhucVinhProposal(id);
      if (slipId === id) startNew();
      setDrafts(await listPhucVinhProposals());
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
    window.history.replaceState(null, "", `/phieu/vat-tu-phuc-vinh?draft=${id}`);
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
      const template = await fetch("/forms/de-xuat-phuc-vinh.xlsx").then((response) => {
        if (!response.ok) throw new Error("Không tải được file Excel mẫu");
        return response.arrayBuffer();
      });
      const file = await buildFilledPhucVinhSheet(template, {
        reportDate: input.reportDate,
        subject: input.subject,
        content: input.content,
        lines: input.lines.map((line) => ({
          name: line.itemName,
          unit: line.unit,
          quantity: line.quantity,
          price: line.price,
          stock: line.stock,
          supplier: line.supplier,
          receiver: line.receiver,
        })),
      });
      await persist(input);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `De-xuat-phuc-vinh-${parsedDate.year}-${parsedDate.month}-${parsedDate.day}.xlsx`;
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
                        {draft.lines.length} dòng · {draft.subject}
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
            <h1 className="text-base font-semibold">Đề xuất vật tư Phúc Vinh</h1>
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
            <input type="date" value={reportDate} onChange={(event) => changeReportDate(event.target.value)} className={`${fieldClass} mt-1 max-w-48`} />
          </label>
          <label className="block text-sm font-medium">
            V/v
            <input value={subject} onChange={(event) => setSubject(event.target.value)} className={`${fieldClass} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Nội dung đề xuất
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} className={`${fieldClass} mt-1 h-auto py-2`} />
          </label>
          <div className="overflow-x-auto border-t border-[var(--color-border-subtle)] pt-4">
            <div className={lineGridClass}>
              <p className="text-sm font-medium">Tên vật tư</p>
              <p className="text-sm font-medium">ĐVT</p>
              <p className="text-sm font-medium">Số lượng</p>
              <p className="text-sm font-medium">Đơn giá</p>
              <p className="text-sm font-medium">Tồn kho</p>
              <p className="text-sm font-medium">Nhà cung cấp</p>
              <p className="text-sm font-medium">Đơn vị nhận</p>
              <span />
            </div>
            <div className="mt-2 space-y-2">
              {lines.map((line) => (
                <div key={line.id} className={lineGridClass}>
                  <input value={line.name} onChange={(event) => updateLine(line.id, { name: event.target.value })} className={fieldClass} aria-label="Tên vật tư" placeholder="Lốp 12R22.5 (Gai ngang)" />
                  <input value={line.unit} onChange={(event) => updateLine(line.id, { unit: event.target.value })} className={fieldClass} aria-label="ĐVT" placeholder="Cái" />
                  <input inputMode="decimal" value={line.quantity} onChange={(event) => { const next = event.target.value; if (next !== "" && !/^\d*([.,]\d{0,2})?$/.test(next)) return; updateLine(line.id, { quantity: next }); }} className={fieldClass} aria-label="Số lượng" />
                  <input inputMode="numeric" value={line.price} onChange={(event) => { const next = event.target.value; if (next !== "" && !/^\d*$/.test(next)) return; updateLine(line.id, { price: next }); }} className={fieldClass} aria-label="Đơn giá" />
                  <input inputMode="numeric" value={line.stock} onChange={(event) => { const next = event.target.value; if (next !== "" && !/^\d*$/.test(next)) return; updateLine(line.id, { stock: next }); }} className={fieldClass} aria-label="Tồn kho" />
                  <input value={line.supplier} onChange={(event) => updateLine(line.id, { supplier: event.target.value })} className={fieldClass} aria-label="Nhà cung cấp" placeholder="Phúc Vinh" />
                  <input value={line.receiver} onChange={(event) => updateLine(line.id, { receiver: event.target.value })} className={fieldClass} aria-label="Đơn vị nhận" placeholder="Xưởng BDSC" />
                  <button type="button" className={dangerButton} aria-label="Bỏ dòng" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
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
        <p className="text-center text-xs">Địa chỉ: 47 đường Kim Đồng, P. Hoàng Mai, TP. Hà Nội, Việt Nam</p>
        <h2 className="mt-3 text-center text-base font-bold">BÁO CÁO & ĐỀ XUẤT</h2>
        <p className="text-center text-sm italic">{subject}</p>
        <p className="mt-3 text-sm">Kính gửi : Chủ tịch HĐQT CÔNG TY CP MAI LINH ĐÔNG ĐÔ</p>
        <div className="mt-3 grid min-h-[4.5rem] grid-cols-[8rem_minmax(0,1fr)] border border-black text-sm">
          <p className="flex items-center justify-center border-r border-black px-2 text-center font-semibold">PHÊ DUYỆT</p>
          <p className="flex items-center px-2 font-semibold">Ý KIẾN</p>
        </div>
        <p className="mt-3 text-sm font-semibold">Căn cứ:</p>
        <p className="text-sm">- Nhu cầu sửa chữa của đội xe Đà Nẵng - Công ty CP Mai Linh Đông Đô</p>
        <p className="text-sm">- Qua khảo sát năng lực và chất lượng vật tư của các nhà cung cấp</p>
        <p className="mt-2 text-sm">{content}</p>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr>
              {["TT", "Tên vật tư", "ĐVT", "Số lượng ĐX", "Đơn giá", "Tồn kho", "Tên nhà CC", "Đơn vị nhận hàng"].map((heading) => (
                <th key={heading} className="border border-black px-2 py-1 text-center font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.id} className="h-8">
                <td className="w-10 border border-black px-2 text-center">{index + 1}</td>
                <td className="border border-black px-2">{line.name}</td>
                <td className="w-16 border border-black px-2 text-center">{line.unit}</td>
                <td className="w-20 border border-black px-2 text-center">{formatQuantity(line.quantity)}</td>
                <td className="w-24 border border-black px-2 text-right">{line.price ? formatMoney(Number(line.price)) : ""}</td>
                <td className="w-20 border border-black px-2 text-center">{line.stock}</td>
                <td className="border border-black px-2">{line.supplier}</td>
                <td className="border border-black px-2">{line.receiver}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 whitespace-pre-line text-sm">{CLOSING}</p>
        <p className="mt-3 text-right text-sm">
          Đà Nẵng, ngày {parsedDate ? parsedDate.day : ""} tháng {parsedDate ? parsedDate.month : ""} năm {parsedDate ? parsedDate.year : ""}
        </p>
        <div className="mt-6 grid grid-cols-3 text-center text-sm">
          <p>Bộ phận kho</p>
          <p>Phụ trách BDSC</p>
          <p>Kế toán kho</p>
          <p className="mt-10">Nguyễn Gia Bảo</p>
          <p className="mt-10">Trịnh Văn Hiếu</p>
          <p className="mt-10">Phạm Thị Hải Lý</p>
        </div>
      </article> : null}
    </div>
  );
}

function emptyLine(): Line {
  return { id: nextLineId++, name: "", unit: "", quantity: "", price: "", stock: "", supplier: "", receiver: "" };
}

function subjectText(month: number, year: number) {
  return `(V/v: Kế hoạch vật tư Tháng ${String(month).padStart(2, "0")}/${year})`;
}

function contentText(month: number, year: number) {
  return `Bộ phận Mua hàng Xưởng BDSC Mai Linh Đông Đô kính trình Ban giám đốc kế hoạch mua hàng tháng ${String(month).padStart(2, "0")}/${year} Cụ thể:`;
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
  return !line.name.trim() && !line.unit.trim() && !line.quantity.trim() && !line.price.trim() && !line.stock.trim() && !line.supplier.trim() && !line.receiver.trim();
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

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

const lineGridClass = "grid min-w-[72rem] grid-cols-[minmax(12rem,1.4fr)_5rem_6rem_6.5rem_5.5rem_minmax(8rem,1fr)_minmax(8rem,1fr)_auto] items-center gap-2";

const fieldClass =
  "flex h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";

const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50";

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#016502] disabled:opacity-50";

const dangerButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-button)] bg-red-600 text-white hover:bg-red-700";
