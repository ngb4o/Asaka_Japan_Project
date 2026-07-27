import { formatCurrency } from "@/lib/utils";
import type { LineItem } from "@/lib/types";

type InfoRow = { label: string; value: string };

type PrintDocumentInput = {
  title: string;
  code: string;
  meta?: InfoRow[];
  customer?: InfoRow[];
  items: LineItem[];
  subtotal: number;
  discount?: number;
  total: number;
  /** Nhãn dòng tổng cuối (mặc định: Tổng cộng). Dùng "Còn lại" khi còn nợ. */
  grandLabel?: string;
  /** Số tiền dòng tổng cuối (mặc định: total). */
  grandAmount?: number;
  extraRows?: InfoRow[];
  note?: string;
};

const PRINT_FRAME_ID = "asaka-sales-print-frame";

const COMPANY = {
  name: "CÔNG TY TNHH ASAKA - JAPAN",
  tagline: "Giải pháp bảo vệ thực vật",
  address: "1155/35 tỉnh lộ 43, KP 11, phường Tam Bình, TP.HCM",
  phone: "0946 866 068",
  email: "info@asaka-japan.com",
  website: "asaka-japan.com",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderInfoList(rows: InfoRow[] = []) {
  if (!rows.length) return "";

  return rows
    .map(
      (row) => `
        <div class="info-row">
          <span class="info-label">${escapeHtml(row.label)}</span>
          <span class="info-value">${escapeHtml(row.value)}</span>
        </div>`
    )
    .join("");
}

function buildPrintHtml(doc: PrintDocumentInput) {
  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/images/brand/logo.png`
      : "";

  const rows = doc.items
    .map(
      (item, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td class="product">${escapeHtml(item.productName || "—")}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatCurrency(item.unitPrice)}</td>
        <td class="num strong">${formatCurrency(item.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const extraHtml = (doc.extraRows || [])
    .map(
      (row) => `
        <div class="total-row">
          <span>${escapeHtml(row.label)}</span>
          <span>${escapeHtml(row.value)}</span>
        </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>&nbsp;</title>
  <style>
    :root {
      --brand: #017d03;
      --brand-dark: #015a02;
      --ink: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --soft: #f6f8f6;
    }

    * { box-sizing: border-box; }

    @page {
      size: A4;
      margin: 14mm 18mm;
    }

    body {
      margin: 0;
      font-family: "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: var(--ink);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .sheet {
      max-width: 860px;
      margin: 0 auto;
      padding: 8px 12px 24px;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 32px;
      padding-bottom: 20px;
      border-bottom: 3px solid var(--brand);
    }

    .brand { display: flex; gap: 14px; align-items: flex-start; }
    .brand img { width: 60px; height: 60px; object-fit: contain; }
    .brand-name { font-size: 17px; font-weight: 800; letter-spacing: .2px; color: var(--brand-dark); }
    .brand-tagline { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .brand-contact { margin-top: 8px; font-size: 12px; color: var(--muted); line-height: 1.7; }

    .doc-head { text-align: right; flex-shrink: 0; }
    .doc-title { font-size: 30px; font-weight: 800; letter-spacing: 1px; color: var(--brand); margin: 0; }
    .doc-code {
      display: inline-block;
      margin-top: 8px;
      padding: 6px 14px;
      border-radius: 999px;
      background: var(--brand);
      color: #fff;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: .5px;
    }

    /* Info cards */
    .cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 22px;
    }

    .card {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px 16px;
      background: #fff;
      break-inside: avoid;
    }

    .card-title {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: var(--brand);
      margin-bottom: 10px;
    }

    .info-row { display: flex; gap: 10px; padding: 3px 0; font-size: 13px; }
    .info-label { min-width: 110px; color: var(--muted); }
    .info-value { flex: 1; font-weight: 600; word-break: break-word; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 14px; }
    thead th {
      background: var(--brand);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .6px;
      text-transform: uppercase;
      padding: 12px 12px;
      text-align: left;
    }
    thead th:first-child { border-top-left-radius: 10px; }
    thead th:last-child { border-top-right-radius: 10px; }

    tbody td { padding: 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
    tbody tr:nth-child(even) td { background: #fafcfa; }
    tbody tr { break-inside: avoid; }

    .product { font-weight: 600; }
    .num { text-align: right; white-space: nowrap; }
    .center { text-align: center; color: var(--muted); }
    .strong { font-weight: 700; }

    /* Totals */
    .summary {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
      break-inside: avoid;
    }

    .totals {
      width: 320px;
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 16px;
      font-size: 13px;
      color: var(--muted);
    }
    .total-row span:last-child { color: var(--ink); font-weight: 600; }

    .total-row.grand {
      background: var(--brand);
      color: #fff;
      font-size: 16px;
      font-weight: 800;
      padding: 14px 16px;
    }
    .total-row.grand span:last-child { color: #fff; font-size: 18px; }

    /* Note */
    .note {
      margin-top: 22px;
      padding: 14px 16px;
      border-left: 4px solid var(--brand);
      background: var(--soft);
      border-radius: 0 10px 10px 0;
      font-size: 13px;
      break-inside: avoid;
    }
    .note-title { font-weight: 700; margin-bottom: 4px; }

    /* Signatures */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 48px;
      text-align: center;
      break-inside: avoid;
    }
    .sign-title { font-size: 13px; font-weight: 700; }
    .sign-hint { font-size: 11px; color: var(--muted); margin-top: 2px; }
    .sign-space { height: 70px; }
    .sign-line { border-top: 1px dashed #94a3b8; }

    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      text-align: center;
      font-size: 11px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        ${logoUrl ? `<img src="${logoUrl}" alt="" />` : ""}
        <div>
          <div class="brand-name">${COMPANY.name}</div>
          <div class="brand-tagline">${COMPANY.tagline}</div>
          <div class="brand-contact">
            ${escapeHtml(COMPANY.address)}<br />
            ĐT: ${COMPANY.phone}  -  ${COMPANY.website}
          </div>
        </div>
      </div>
      <div class="doc-head">
        <h1 class="doc-title">${escapeHtml(doc.title)}</h1>
        <div class="doc-code">${escapeHtml(doc.code)}</div>
      </div>
    </div>

    <div class="cards">
      <div class="card">
        <div class="card-title">Thông tin chứng từ</div>
        ${renderInfoList(doc.meta)}
      </div>
      <div class="card">
        <div class="card-title">Khách hàng / Đại lý</div>
        ${renderInfoList(doc.customer)}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:44px">#</th>
          <th>Sản phẩm</th>
          <th class="num" style="width:70px">SL</th>
          <th class="num" style="width:130px">Đơn giá</th>
          <th class="num" style="width:140px">Thành tiền</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="summary">
      <div class="totals">
        <div class="total-row">
          <span>Tạm tính</span>
          <span>${formatCurrency(doc.subtotal)}</span>
        </div>
        ${
          doc.discount
            ? `<div class="total-row"><span>Chiết khấu</span><span>- ${formatCurrency(doc.discount)}</span></div>`
            : ""
        }
        ${extraHtml}
        <div class="total-row grand">
          <span>${escapeHtml(doc.grandLabel || "Tổng cộng")}</span>
          <span>${formatCurrency(doc.grandAmount ?? doc.total)}</span>
        </div>
      </div>
    </div>

    ${
      doc.note
        ? `<div class="note"><div class="note-title">Ghi chú</div>${escapeHtml(doc.note)}</div>`
        : ""
    }

    <div class="signatures">
      <div>
        <div class="sign-title">KHÁCH HÀNG / ĐẠI LÝ</div>
        <div class="sign-hint">(Ký, ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-line"></div>
      </div>
      <div>
        <div class="sign-title">ĐẠI DIỆN CÔNG TY</div>
        <div class="sign-hint">(Ký, ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-line"></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function getPrintFrame() {
  let frame = document.getElementById(PRINT_FRAME_ID) as HTMLIFrameElement | null;

  if (!frame) {
    frame = document.createElement("iframe");
    frame.id = PRINT_FRAME_ID;
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    frame.style.opacity = "0";
    frame.style.pointerEvents = "none";
    document.body.appendChild(frame);
  }

  return frame;
}

/** Print via hidden iframe — no popup permission required. */
export function printSalesDocument(doc: PrintDocumentInput) {
  const frame = getPrintFrame();
  const html = buildPrintHtml(doc);
  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument || frameWindow?.document;

  if (!frameWindow || !frameDocument) {
    throw new Error("Không khởi tạo được khung in.");
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const triggerPrint = () => {
    frameWindow.focus();
    frameWindow.print();
  };

  // Give images and layout a moment before opening the print dialog
  if (frameDocument.readyState === "complete") {
    window.setTimeout(triggerPrint, 250);
  } else {
    frame.onload = () => window.setTimeout(triggerPrint, 250);
  }
}
