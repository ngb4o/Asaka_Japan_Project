"use client";

import { ChevronDown, Download, Loader2, Save, Trash2 } from "lucide-react";
import { PreviewButton } from "@/components/PreviewButton";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createUtilityProposal,
  deleteUtilityProposal,
  getUtilityProposal,
  listUtilityProposals,
  updateUtilityProposal,
  type UtilityProposalInput,
} from "@/lib/api";
import { buildFilledUtilitySheet } from "@/lib/fillUtilitySheet";
import type { UtilityProposal } from "@/lib/types";

const DEFAULT_SUBJECT = "V/v : Chi phí điện, nước, Internet tại đội xe Đà Nẵng tháng 10/2026";
const DEFAULT_CONTENT = "Nội dung đề xuất gồm: Chi phí tiền điện, nước, Internet tháng 09/2026 tại đội xe Đà Nẵng.";
const DEFAULT_PAYMENT = "Thanh toán tiền điện, nước, internet tháng 10/2026 tại Đà Nẵng";
const DEFAULT_WORDS = "Một triệu sáu trăm tám mươi nghìn đồng";
const DEFAULT_PERIOD = "30/08/2026 - 30/09/2026";
const DEFAULT_ELECTRIC_NOTE = "Đơn giá điện dựa vào lượng tiêu thụ tổng hàng tháng . Không có hóa đơn";
const DEFAULT_NOTE = "Không có hóa đơn";
const DRAFTS_OPEN_KEY = "kho-utility-drafts-open";

export default function UtilityProposalPage() {
  const today = isoDate(new Date());
  const [reportDate, setReportDate] = useState(today);
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [paymentTitle, setPaymentTitle] = useState(DEFAULT_PAYMENT);
  const [amountWords, setAmountWords] = useState(DEFAULT_WORDS);
  const [electricStart, setElectricStart] = useState("21922");
  const [electricEnd, setElectricEnd] = useState("22282");
  const [electricPrice, setElectricPrice] = useState("4000");
  const [electricNote, setElectricNote] = useState(DEFAULT_ELECTRIC_NOTE);
  const [waterStart, setWaterStart] = useState("122");
  const [waterEnd, setWaterEnd] = useState("128");
  const [waterPrice, setWaterPrice] = useState("15000");
  const [waterNote, setWaterNote] = useState(DEFAULT_NOTE);
  const [sanitationFee, setSanitationFee] = useState("50000");
  const [sanitationNote, setSanitationNote] = useState(DEFAULT_NOTE);
  const [internetFee, setInternetFee] = useState("100000");
  const [internetNote, setInternetNote] = useState(DEFAULT_NOTE);
  const [drafts, setDrafts] = useState<UtilityProposal[]>([]);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [slipId, setSlipId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const parsedDate = parseIsoDate(reportDate);
  const amounts = computeAmounts({
    electricStart, electricEnd, electricPrice, waterStart, waterEnd, waterPrice, sanitationFee, internetFee,
  });

  useEffect(() => {
    setDraftsOpen(window.localStorage.getItem(DRAFTS_OPEN_KEY) === "1");
  }, []);

  useEffect(() => {
    let active = true;
    listUtilityProposals()
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
    getUtilityProposal(slipId)
      .then((proposal) => {
        if (!active) return;
        applyProposal(proposal);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Không tải được bản nháp");
      });
    return () => {
      active = false;
    };
  }, [slipId]);

  function applyProposal(proposal: UtilityProposal) {
    setReportDate(proposal.reportDate);
    setPeriod(proposal.period);
    setSubject(proposal.subject);
    setContent(proposal.content);
    setPaymentTitle(proposal.paymentTitle);
    setAmountWords(proposal.amountWords);
    setElectricStart(String(proposal.electricStart));
    setElectricEnd(String(proposal.electricEnd));
    setElectricPrice(String(proposal.electricPrice));
    setElectricNote(proposal.electricNote || "");
    setWaterStart(String(proposal.waterStart));
    setWaterEnd(String(proposal.waterEnd));
    setWaterPrice(String(proposal.waterPrice));
    setWaterNote(proposal.waterNote || "");
    setSanitationFee(String(proposal.sanitationFee));
    setSanitationNote(proposal.sanitationNote || "");
    setInternetFee(String(proposal.internetFee));
    setInternetNote(proposal.internetNote || "");
  }

  function toggleDrafts() {
    setDraftsOpen((open) => {
      const next = !open;
      window.localStorage.setItem(DRAFTS_OPEN_KEY, next ? "1" : "0");
      return next;
    });
  }

  function readProposal(): UtilityProposalInput | null {
    if (!parsedDate) {
      setError("Nhập ngày");
      return null;
    }
    if (!period.trim()) {
      setError("Nhập kỳ phiếu báo");
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
    if (!paymentTitle.trim()) {
      setError("Nhập nội dung thanh toán");
      return null;
    }
    if (!amountWords.trim()) {
      setError("Nhập số tiền bằng chữ");
      return null;
    }
    const electric = readMeter("điện", electricStart, electricEnd, electricPrice);
    if (!electric.ok) {
      setError(electric.message);
      return null;
    }
    const water = readMeter("nước", waterStart, waterEnd, waterPrice);
    if (!water.ok) {
      setError(water.message);
      return null;
    }
    const sanitation = readFee("tiền nước vệ sinh", sanitationFee);
    if (sanitation == null) {
      setError("Nhập tiền nước vệ sinh");
      return null;
    }
    const internet = readFee("tiền internet", internetFee);
    if (internet == null) {
      setError("Nhập tiền internet");
      return null;
    }
    return {
      reportDate,
      period: period.trim(),
      subject: subject.trim(),
      content: content.trim(),
      paymentTitle: paymentTitle.trim(),
      amountWords: amountWords.trim(),
      electricStart: electric.start,
      electricEnd: electric.end,
      electricPrice: electric.price,
      electricNote: electricNote.trim(),
      waterStart: water.start,
      waterEnd: water.end,
      waterPrice: water.price,
      waterNote: waterNote.trim(),
      sanitationFee: sanitation,
      sanitationNote: sanitationNote.trim(),
      internetFee: internet,
      internetNote: internetNote.trim(),
    };
  }

  async function persist(input: UtilityProposalInput) {
    const result = slipId ? await updateUtilityProposal(slipId, input) : await createUtilityProposal(input);
    setSlipId(result.id);
    const params = new URLSearchParams(window.location.search);
    if (params.get("draft") !== result.id) {
      window.history.replaceState(null, "", `/phieu/dien-nuoc-vp?draft=${result.id}`);
    }
    setDrafts(await listUtilityProposals());
  }

  function startNew() {
    setSlipId("");
    setReportDate(isoDate(new Date()));
    setPeriod(DEFAULT_PERIOD);
    setSubject(DEFAULT_SUBJECT);
    setContent(DEFAULT_CONTENT);
    setPaymentTitle(DEFAULT_PAYMENT);
    setAmountWords(DEFAULT_WORDS);
    setElectricStart("21922");
    setElectricEnd("22282");
    setElectricPrice("4000");
    setElectricNote(DEFAULT_ELECTRIC_NOTE);
    setWaterStart("122");
    setWaterEnd("128");
    setWaterPrice("15000");
    setWaterNote(DEFAULT_NOTE);
    setSanitationFee("50000");
    setSanitationNote(DEFAULT_NOTE);
    setInternetFee("100000");
    setInternetNote(DEFAULT_NOTE);
    setError("");
    setNotice("");
    window.history.replaceState(null, "", "/phieu/dien-nuoc-vp");
  }

  async function removeDraft(id: string) {
    const draft = drafts.find((item) => item.id === id);
    if (!window.confirm(`Xóa bản nháp ${draft ? formatDraftDate(draft.reportDate) : "này"}?`)) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await deleteUtilityProposal(id);
      if (slipId === id) startNew();
      setDrafts(await listUtilityProposals());
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
    window.history.replaceState(null, "", `/phieu/dien-nuoc-vp?draft=${id}`);
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
      const template = await fetch("/forms/de-xuat-dien-nuoc-vp.xlsx").then((response) => {
        if (!response.ok) throw new Error("Không tải được file Excel mẫu");
        return response.arrayBuffer();
      });
      const file = await buildFilledUtilitySheet(template, input);
      await persist(input);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `De-xuat-dien-nuoc-vp-${parsedDate.year}-${parsedDate.month}-${parsedDate.day}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("Đã lưu nháp và tải 3 sheet.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Lưu báo cáo thất bại");
    } finally {
      setSaving(false);
    }
  }

  const dateText = parsedDate
    ? `Đà Nẵng, ngày ${String(parsedDate.day).padStart(2, "0")} tháng ${String(parsedDate.month).padStart(2, "0")} năm ${parsedDate.year}`
    : "";
  const moneyText = amounts ? `Số tiền: ${formatMoney(amounts.total)} VNĐ` : "Số tiền:";
  const wordsText = amountWords.trim().startsWith("Số tiền bằng chữ:")
    ? amountWords.trim()
    : `Số tiền bằng chữ: ${amountWords.trim()}`;
  const shortWords = amountWords.trim().startsWith("Bằng chữ:")
    ? amountWords.trim()
    : `Bằng chữ: ${amountWords.trim()}`;

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
                        {draft.subject}
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
            <h1 className="text-base font-semibold">Đề xuất và thanh toán điện nước văn phòng</h1>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {slipId ? <button type="button" className={secondaryButton} disabled={saving} onClick={startNew}>Phiếu mới</button> : null}
            <button type="button" className={secondaryButton} disabled={saving} onClick={() => void saveDraft()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu nháp
            </button>
            <button type="button" className={primaryButton} disabled={saving} onClick={() => void saveAndDownload()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Lưu và tải 3 sheet
            </button>
            <PreviewButton showing={showPreview} onToggle={() => setShowPreview((open) => !open)} />
          </div>
        </div>
        {showPreview ? null : <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Ngày
              <input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} className={`${fieldClass} mt-1`} />
            </label>
            <label className="block text-sm font-medium">
              Kỳ phiếu báo
              <input value={period} onChange={(event) => setPeriod(event.target.value)} className={`${fieldClass} mt-1`} />
            </label>
          </div>
          <label className="block text-sm font-medium">
            V/v
            <input value={subject} onChange={(event) => setSubject(event.target.value)} className={`${fieldClass} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Nội dung đề xuất
            <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} className={`${fieldClass} mt-1 h-auto py-2`} />
          </label>
          <label className="block text-sm font-medium">
            Nội dung thanh toán
            <input value={paymentTitle} onChange={(event) => setPaymentTitle(event.target.value)} className={`${fieldClass} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Số tiền bằng chữ
            <input value={amountWords} onChange={(event) => setAmountWords(event.target.value)} className={`${fieldClass} mt-1`} />
          </label>
          <MeterFields
            title="Tiền điện (kw)"
            start={electricStart}
            end={electricEnd}
            price={electricPrice}
            note={electricNote}
            quantity={amounts?.electricQty ?? null}
            amount={amounts?.electricAmount ?? null}
            onStart={setElectricStart}
            onEnd={setElectricEnd}
            onPrice={setElectricPrice}
            onNote={setElectricNote}
          />
          <MeterFields
            title="Tiền nước (m3)"
            start={waterStart}
            end={waterEnd}
            price={waterPrice}
            note={waterNote}
            quantity={amounts?.waterQty ?? null}
            amount={amounts?.waterAmount ?? null}
            onStart={setWaterStart}
            onEnd={setWaterEnd}
            onPrice={setWaterPrice}
            onNote={setWaterNote}
          />
          <FeeFields title="Tiền nước vệ sinh" fee={sanitationFee} note={sanitationNote} onFee={setSanitationFee} onNote={setSanitationNote} />
          <FeeFields title="Tiền Internet" fee={internetFee} note={internetNote} onFee={setInternetFee} onNote={setInternetNote} />
          <p className="text-sm font-semibold">Tổng: {amounts ? formatMoney(amounts.total) : ""}</p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {notice ? <p className="text-sm text-[var(--color-text-secondary)]">{notice}</p> : null}
        </div>}
      </section>

      {showPreview ? <article className="w-full overflow-x-auto border border-black bg-white p-6 text-black shadow-[var(--shadow-soft)]">
        <div className="min-w-[72rem]">
        <p className="text-right text-sm">{dateText}</p>
        <h2 className="mt-2 text-center text-base font-bold">BÁO CÁO ĐỀ XUẤT VÀ THANH TOÁN</h2>
        <p className="mt-1 text-center text-sm">{subject}</p>
        <p className="mt-3 text-sm">Kính gửi : - Ban giám đốc Công ty CP Mai Linh Đông Đô</p>
        <div className="mt-3 grid min-h-[4.5rem] grid-cols-[8rem_minmax(0,1fr)] border border-black text-sm">
          <p className="flex items-center justify-center border-r border-black px-2 text-center font-semibold">DUYỆT</p>
          <p className="flex items-center px-2 font-semibold">Ý KIẾN CHỈ ĐẠO</p>
        </div>
        <p className="mt-4 text-sm">Người đề xuất: Nguyễn Gia Bảo</p>
        <p className="text-sm">Bộ phận đề xuất: Công ty Cổ Phần Mai Linh Đông Đô tại Đà Nẵng</p>
        <p className="mt-2 text-sm">{content}</p>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr>
              {["STT", "DANH MỤC", "ĐVT", "SỐ ĐẦU", "SỐ CUỐI", "SLTT", "ĐƠN GIÁ", "THÀNH TIỀN", "GHI CHÚ"].map((heading) => (
                <th key={heading} className="border border-black px-2 py-1 text-center font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="h-8">
              <td className="border border-black px-2 text-center">1</td>
              <td className="border border-black px-2">Tiền điện</td>
              <td className="border border-black px-2 text-center">kw</td>
              <td className="border border-black px-2 text-right">{electricStart}</td>
              <td className="border border-black px-2 text-right">{electricEnd}</td>
              <td className="border border-black px-2 text-right">{amounts ? formatMoney(amounts.electricQty) : ""}</td>
              <td className="border border-black px-2 text-right">{electricPrice ? formatMoney(Number(electricPrice)) : ""}</td>
              <td className="border border-black px-2 text-right">{amounts ? formatMoney(amounts.electricAmount) : ""}</td>
              <td className="border border-black px-2">{electricNote}</td>
            </tr>
            <tr className="h-8">
              <td className="border border-black px-2 text-center">2</td>
              <td className="border border-black px-2">Tiền nước</td>
              <td className="border border-black px-2 text-center">m3</td>
              <td className="border border-black px-2 text-right">{waterStart}</td>
              <td className="border border-black px-2 text-right">{waterEnd}</td>
              <td className="border border-black px-2 text-right">{amounts ? formatMoney(amounts.waterQty) : ""}</td>
              <td className="border border-black px-2 text-right">{waterPrice ? formatMoney(Number(waterPrice)) : ""}</td>
              <td className="border border-black px-2 text-right">{amounts ? formatMoney(amounts.waterAmount) : ""}</td>
              <td className="border border-black px-2">{waterNote}</td>
            </tr>
            <tr className="h-8">
              <td className="border border-black px-2 text-center">3</td>
              <td className="border border-black px-2">Tiền nước vệ sinh</td>
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2 text-right">{sanitationFee ? formatMoney(Number(sanitationFee)) : ""}</td>
              <td className="border border-black px-2 text-right">{sanitationFee ? formatMoney(Number(sanitationFee)) : ""}</td>
              <td className="border border-black px-2">{sanitationNote}</td>
            </tr>
            <tr className="h-8">
              <td className="border border-black px-2 text-center">4</td>
              <td className="border border-black px-2">Tiền Internet</td>
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2 text-right">{internetFee ? formatMoney(Number(internetFee)) : ""}</td>
              <td className="border border-black px-2">{internetNote}</td>
            </tr>
            <tr className="h-8 font-semibold">
              <td className="border border-black px-2" />
              <td className="border border-black px-2">TỔNG</td>
              <td className="border border-black px-2" colSpan={5} />
              <td className="border border-black px-2 text-right">{amounts ? formatMoney(amounts.total) : ""}</td>
              <td className="border border-black px-2" />
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-sm">{wordsText}</p>
        <p className="mt-2 text-sm">Tài khoản thanh toán: Phạm Thị Ái Thuỳ - STK: 0918020703 - Ngân hàng: MB Đà Nẵng</p>
        <div className="mt-8 text-center text-sm">
          <p>Người đề xuất</p>
          <p className="mt-10">Nguyễn Gia Bảo</p>
        </div>
        </div>
      </article> : null}

      {showPreview ? <article className="w-full overflow-x-auto border border-black bg-white p-6 text-black shadow-[var(--shadow-soft)]">
        <h2 className="text-center text-base font-bold">PHIẾU BÁO ĐIỆN NƯỚC</h2>
        <p className="mt-1 text-center text-sm">{period}</p>
        <p className="text-sm">Đơn vị: Công ty cổ phần Mai Linh Đông Đô</p>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr>
              {["STT", "Nội dung", "Số đầu", "Số cuối", "SLTT", "Đơn giá", "Thành tiền"].map((heading) => (
                <th key={heading} className="border border-black px-2 py-1 text-center font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="h-8">
              <td className="border border-black px-2 text-center">1</td>
              <td className="border border-black px-2">Điện</td>
              <td className="border border-black px-2 text-right">{electricStart}</td>
              <td className="border border-black px-2 text-right">{electricEnd}</td>
              <td className="border border-black px-2 text-right">{amounts ? formatMoney(amounts.electricQty) : ""}</td>
              <td className="border border-black px-2 text-right">{electricPrice ? formatMoney(Number(electricPrice)) : ""}</td>
              <td className="border border-black px-2 text-right">{amounts ? formatMoney(amounts.electricAmount) : ""}</td>
            </tr>
            <tr className="h-8">
              <td className="border border-black px-2 text-center">2</td>
              <td className="border border-black px-2">Nước</td>
              <td className="border border-black px-2 text-right">{waterStart}</td>
              <td className="border border-black px-2 text-right">{waterEnd}</td>
              <td className="border border-black px-2 text-right">{amounts ? formatMoney(amounts.waterQty) : ""}</td>
              <td className="border border-black px-2 text-right">{waterPrice ? formatMoney(Number(waterPrice)) : ""}</td>
              <td className="border border-black px-2 text-right">{amounts ? formatMoney(amounts.waterAmount) : ""}</td>
            </tr>
            <tr className="h-8">
              <td className="border border-black px-2 text-center">3</td>
              <td className="border border-black px-2">Tiền nước vệ sinh</td>
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2 text-right">{sanitationFee ? formatMoney(Number(sanitationFee)) : ""}</td>
              <td className="border border-black px-2 text-right">{sanitationFee ? formatMoney(Number(sanitationFee)) : ""}</td>
            </tr>
            <tr className="h-8">
              <td className="border border-black px-2 text-center">4</td>
              <td className="border border-black px-2">Internet</td>
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2 text-right">{internetFee ? formatMoney(Number(internetFee)) : ""}</td>
            </tr>
            <tr className="h-8 font-semibold">
              <td className="border border-black px-2" colSpan={6}>TỔNG</td>
              <td className="border border-black px-2 text-right">{amounts ? formatMoney(amounts.total) : ""}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-sm">{wordsText}</p>
        <div className="mt-8 text-center text-sm">
          <p>NGƯỜI THÔNG BÁO</p>
          <p className="mt-10">Phạm Thị Ái Thuỳ</p>
        </div>
      </article> : null}

      {showPreview ? <article className="w-full overflow-x-auto border border-black bg-white p-6 text-black shadow-[var(--shadow-soft)]">
        <h2 className="text-center text-base font-bold">GIẤY ĐỀ NGHỊ THANH TOÁN</h2>
        <p className="mt-3 text-sm">Tên tôi là: Nguyễn Gia Bảo</p>
        <p className="text-sm">Bộ phận (Địa chỉ): Phòng điều hành chi nhánh Đà Nẵng</p>
        <p className="mt-3 text-sm">{paymentTitle}</p>
        <p className="text-sm">{moneyText}</p>
        <p className="text-sm">{shortWords}</p>
        <p className="mt-2 text-sm">Chứng từ kèm theo: Phạm Thị Ái Thuỳ - STK: 0918020703 - Ngân hàng: MB Đà Nẵng</p>
        <div className="mt-8 grid grid-cols-4 text-center text-sm">
          <p>Chủ Tịch HĐQT</p>
          <p>Kế toán trưởng</p>
          <p>Kế toán</p>
          <p>Người đề nghị</p>
          <p className="mt-10">Hồ Chương</p>
          <p className="mt-10">Vũ Tiến Trung</p>
          <p className="mt-10">Phạm Thị Hải Lý</p>
          <p className="mt-10">Nguyễn Gia Bảo</p>
        </div>
      </article> : null}
    </div>
  );
}

function MeterFields({
  title, start, end, price, note, quantity, amount, onStart, onEnd, onPrice, onNote,
}: {
  title: string;
  start: string;
  end: string;
  price: string;
  note: string;
  quantity: number | null;
  amount: number | null;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  onPrice: (value: string) => void;
  onNote: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2 border-t border-[var(--color-border-subtle)] pt-4">
      <legend className="text-sm font-semibold">{title}</legend>
      <div className="grid gap-2 sm:grid-cols-4">
        <NumberField label="Số đầu" value={start} onChange={onStart} />
        <NumberField label="Số cuối" value={end} onChange={onEnd} />
        <NumberField label="Đơn giá" value={price} onChange={onPrice} />
        <p className="text-sm">
          <span className="block font-medium">SL / Thành tiền</span>
          <span className="mt-2 block">{quantity == null || amount == null ? "" : `${formatMoney(quantity)} / ${formatMoney(amount)}`}</span>
        </p>
      </div>
      <label className="block text-sm font-medium">
        Ghi chú
        <input value={note} onChange={(event) => onNote(event.target.value)} className={`${fieldClass} mt-1`} />
      </label>
    </fieldset>
  );
}

function FeeFields({
  title, fee, note, onFee, onNote,
}: {
  title: string;
  fee: string;
  note: string;
  onFee: (value: string) => void;
  onNote: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2 border-t border-[var(--color-border-subtle)] pt-4">
      <legend className="text-sm font-semibold">{title}</legend>
      <NumberField label="Thành tiền" value={fee} onChange={onFee} />
      <label className="block text-sm font-medium">
        Ghi chú
        <input value={note} onChange={(event) => onNote(event.target.value)} className={`${fieldClass} mt-1`} />
      </label>
    </fieldset>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        inputMode="numeric"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (next !== "" && !/^\d*$/.test(next)) return;
          onChange(next);
        }}
        className={`${fieldClass} mt-1`}
      />
    </label>
  );
}

function computeAmounts(input: {
  electricStart: string;
  electricEnd: string;
  electricPrice: string;
  waterStart: string;
  waterEnd: string;
  waterPrice: string;
  sanitationFee: string;
  internetFee: string;
}) {
  const electric = readMeter("điện", input.electricStart, input.electricEnd, input.electricPrice);
  const water = readMeter("nước", input.waterStart, input.waterEnd, input.waterPrice);
  const sanitation = readFee("vệ sinh", input.sanitationFee);
  const internet = readFee("internet", input.internetFee);
  if (!electric.ok || !water.ok || sanitation == null || internet == null) return null;
  const electricAmount = electric.quantity * electric.price;
  const waterAmount = water.quantity * water.price;
  return {
    electricQty: electric.quantity,
    waterQty: water.quantity,
    electricAmount,
    waterAmount,
    total: electricAmount + waterAmount + sanitation + internet,
  };
}

function readMeter(label: string, startText: string, endText: string, priceText: string) {
  const start = readFee(`số đầu ${label}`, startText);
  const end = readFee(`số cuối ${label}`, endText);
  const price = readFee(`đơn giá ${label}`, priceText);
  if (start == null) return { ok: false as const, message: `Nhập số đầu ${label}` };
  if (end == null) return { ok: false as const, message: `Nhập số cuối ${label}` };
  if (price == null) return { ok: false as const, message: `Nhập đơn giá ${label}` };
  if (end < start) return { ok: false as const, message: `Số cuối ${label} phải lớn hơn hoặc bằng số đầu` };
  return { ok: true as const, start, end, price, quantity: end - start };
}

function readFee(label: string, value: string) {
  void label;
  if (value.trim() === "" || !/^\d+$/.test(value.trim())) return null;
  return Number(value);
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
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#016502] disabled:opacity-50";
