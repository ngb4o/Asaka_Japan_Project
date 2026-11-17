"use client";

import { ChevronDown, Download, Loader2, Save, Trash2 } from "lucide-react";
import { PreviewButton } from "@/components/PreviewButton";
import { DateInput } from "@/components/ui/date-input";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createPaymentRequest,
  deletePaymentRequest,
  getPaymentRequest,
  listPaymentRequests,
  updatePaymentRequest,
  type PaymentRequestInput,
} from "@/lib/api";
import { buildFilledPaymentSheet } from "@/lib/fillPaymentSheet";
import { moneyWords } from "@/lib/money-words";
import type { PaymentRequest } from "@/lib/types";

const DEFAULT_NAME = "Nguyễn Gia Bảo";
const DEFAULT_DEPARTMENT = "Thủ kho xưởng BDSC Đà Nẵng";
const DRAFTS_OPEN_KEY = "kho-payment-drafts-open";

export default function PaymentRequestPage() {
  const [reportDate, setReportDate] = useState(() => isoDate(new Date()));
  const [fullName, setFullName] = useState(DEFAULT_NAME);
  const [department, setDepartment] = useState(DEFAULT_DEPARTMENT);
  const [content, setContent] = useState("");
  const [amount, setAmount] = useState("");
  const [amountWords, setAmountWords] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [drafts, setDrafts] = useState<PaymentRequest[]>([]);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [slipId, setSlipId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const parsedDate = parseIsoDate(reportDate);
  const amountNumber = amount.trim() === "" ? null : Number(amount);

  useEffect(() => {
    setDraftsOpen(window.localStorage.getItem(DRAFTS_OPEN_KEY) === "1");
  }, []);

  useEffect(() => {
    let active = true;
    listPaymentRequests()
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
    getPaymentRequest(slipId)
      .then((request) => {
        if (!active) return;
        setReportDate(request.reportDate);
        setFullName(request.fullName);
        setDepartment(request.department);
        setContent(request.content);
        setAmount(String(request.amount));
        setAmountWords(request.amountWords);
        setBankAccount(request.bankAccount);
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

  function changeAmount(next: string) {
    const digits = next.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    setAmount((current) => {
      const previous = moneyWords(Number(current || 0));
      const generated = moneyWords(Number(digits || 0));
      setAmountWords((words) => (!words.trim() || words === previous ? generated : words));
      return digits;
    });
  }

  function readRequest(): PaymentRequestInput | null {
    if (!parsedDate) {
      setError("Nhập ngày");
      return null;
    }
    if (!fullName.trim()) {
      setError("Nhập họ và tên");
      return null;
    }
    if (!department.trim()) {
      setError("Nhập bộ phận");
      return null;
    }
    if (!content.trim()) {
      setError("Nhập nội dung thanh toán");
      return null;
    }
    if (amountNumber == null || !Number.isInteger(amountNumber) || amountNumber < 1) {
      setError("Nhập số tiền");
      return null;
    }
    if (amountNumber > 999_999_999_999) {
      setError("Số tiền quá lớn");
      return null;
    }
    if (!amountWords.trim()) {
      setError("Nhập số tiền bằng chữ");
      return null;
    }
    if (!bankAccount.trim()) {
      setError("Nhập số tài khoản");
      return null;
    }
    return {
      reportDate,
      fullName: fullName.trim(),
      department: department.trim(),
      content: content.trim(),
      amount: amountNumber,
      amountWords: amountWords.trim(),
      bankAccount: bankAccount.trim(),
    };
  }

  async function persist(input: PaymentRequestInput) {
    const result = slipId ? await updatePaymentRequest(slipId, input) : await createPaymentRequest(input);
    setSlipId(result.id);
    const params = new URLSearchParams(window.location.search);
    if (params.get("draft") !== result.id) {
      window.history.replaceState(null, "", `/phieu/thanh-toan?draft=${result.id}`);
    }
    setDrafts(await listPaymentRequests());
  }

  function startNew() {
    setSlipId("");
    setReportDate(isoDate(new Date()));
    setFullName(DEFAULT_NAME);
    setDepartment(DEFAULT_DEPARTMENT);
    setContent("");
    setAmount("");
    setAmountWords("");
    setBankAccount("");
    setError("");
    setNotice("");
    window.history.replaceState(null, "", "/phieu/thanh-toan");
  }

  async function removeDraft(id: string) {
    const draft = drafts.find((item) => item.id === id);
    if (!window.confirm(`Xóa bản nháp ${draft ? formatDraftDate(draft.reportDate) : "này"}?`)) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await deletePaymentRequest(id);
      if (slipId === id) startNew();
      setDrafts(await listPaymentRequests());
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
    window.history.replaceState(null, "", `/phieu/thanh-toan?draft=${id}`);
  }

  async function saveDraft() {
    const input = readRequest();
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
    const input = readRequest();
    if (!input || !parsedDate) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const template = await fetch("/forms/giay-de-nghi-thanh-toan.xlsx").then((response) => {
        if (!response.ok) throw new Error("Không tải được file Excel mẫu");
        return response.arrayBuffer();
      });
      const file = await buildFilledPaymentSheet(template, input);
      await persist(input);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Giay-de-nghi-thanh-toan-${parsedDate.year}-${String(parsedDate.month).padStart(2, "0")}-${String(parsedDate.day).padStart(2, "0")}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("Đã lưu nháp và tải sheet.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Lưu phiếu thất bại");
    } finally {
      setSaving(false);
    }
  }

  const dateLine = parsedDate ? `Đà Nẵng, ngày ${parsedDate.day} Tháng ${parsedDate.month} năm ${parsedDate.year}` : "";

  return (
    <div className="flex h-full min-w-0 flex-col gap-3 overflow-y-auto">
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
                        {formatMoney(draft.amount)} · {draft.fullName}
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
        <div className="flex flex-col gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/phieu" className="text-xs font-semibold text-[var(--color-text-secondary)]">Phiếu</Link>
            <h1 className="text-base font-semibold">Giấy đề nghị thanh toán</h1>
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
        {showPreview ? null : (
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <label className="block text-sm font-medium">
              Ngày
              <DateInput value={reportDate} onChange={setReportDate} className="mt-1 max-w-48" />
            </label>
            <label className="block text-sm font-medium">
              Họ và tên
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} className={`${fieldClass} mt-1`} />
            </label>
            <label className="block text-sm font-medium md:col-span-2">
              Bộ phận (Địa chỉ)
              <input value={department} onChange={(event) => setDepartment(event.target.value)} className={`${fieldClass} mt-1`} />
            </label>
            <label className="block text-sm font-medium">
              Số tiền
              <input inputMode="numeric" value={amount ? formatMoney(Number(amount)) : ""} onChange={(event) => changeAmount(event.target.value)} className={`${fieldClass} mt-1`} placeholder="0" aria-label="Số tiền" />
            </label>
            <label className="block text-sm font-medium md:col-span-2">
              Nội dung thanh toán
              <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} placeholder="Thanh toán tiền bình ắc quy GS N150" className={`${fieldClass} mt-1 h-auto py-2`} />
            </label>
            <label className="block text-sm font-medium md:col-span-2">
              Bằng chữ
              <input value={amountWords} onChange={(event) => setAmountWords(event.target.value)} className={`${fieldClass} mt-1`} />
            </label>
            <label className="block text-sm font-medium md:col-span-2">
              Số tài khoản
              <input value={bankAccount} onChange={(event) => setBankAccount(event.target.value)} placeholder="Số TK - tên đơn vị - ngân hàng" className={`${fieldClass} mt-1`} />
            </label>
            {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
            {notice ? <p className="text-sm text-[var(--color-text-secondary)] md:col-span-2">{notice}</p> : null}
          </div>
        )}
      </section>

      {showPreview ? (
        <article className="w-full overflow-x-auto border border-black bg-white p-6 text-black shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-6 text-sm">
            <p className="font-semibold">CÔNG TY CỔ PHẦN MAI LINH ĐÔNG ĐÔ</p>
            <div className="text-right text-xs leading-5">
              <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p>Độc lập – Tự do – Hạnh phúc</p>
            </div>
          </div>
          <h2 className="mt-6 text-center text-base font-bold tracking-wide">GIẤY ĐỀ NGHỊ THANH TOÁN</h2>
          <div className="mt-4 text-sm leading-7">
            <p>Kính gửi: Ban lãnh đạo Công ty CP Mai Linh Đông Đô</p>
            <p>Tên tôi là: {fullName}</p>
            <p>Bộ phận (Địa chỉ): {department}</p>
            <p>Xin thanh toán khoản chi phí: {content}</p>
            <p>Số tiền: {amountNumber ? `${formatMoney(amountNumber)} VNĐ` : ""}</p>
            <p>Bằng chữ: {amountWords}</p>
            <p>STK: {bankAccount}</p>
          </div>
          <p className="mt-6 text-right text-sm">{dateLine}</p>
          <div className="mt-8 grid grid-cols-5 text-center text-sm">
            <p>Người đề nghị</p>
            <p>Kế Toán</p>
            <p>Điều Hành</p>
            <p>Kế Toán Trưởng</p>
            <p>Chủ Tịch HĐQT</p>
            <p className="mt-12">{fullName}</p>
            <p className="mt-12">Phạm Thị Hải Lý</p>
            <p className="mt-12">Nguyễn Thị Hà</p>
            <p className="mt-12">Vũ Tiến Trung</p>
            <p className="mt-12">Hồ Chương</p>
          </div>
        </article>
      ) : null}
    </div>
  );
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

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

const fieldClass =
  "flex h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";

const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] disabled:opacity-50";

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-hover)] disabled:opacity-50";
