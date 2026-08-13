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
  /** Dòng trước Tổng cộng (vd: phí giao hàng). */
  extraRows?: InfoRow[];
  /** Dòng sau Tổng cộng (vd: Đã thanh toán, Còn phải thanh toán). */
  afterGrandRows?: InfoRow[];
};

const ONES = [
  "",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
];

function readTriple(n: number, full: boolean): string {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const donvi = n % 10;
  const parts: string[] = [];

  if (tram > 0 || full) {
    if (tram > 0) parts.push(`${ONES[tram]} trăm`);
    else if (full && (chuc > 0 || donvi > 0)) parts.push("không trăm");
  }

  if (chuc > 1) {
    parts.push(`${ONES[chuc]} mươi`);
    if (donvi === 1) parts.push("mốt");
    else if (donvi === 5) parts.push("lăm");
    else if (donvi > 0) parts.push(ONES[donvi]);
  } else if (chuc === 1) {
    parts.push("mười");
    if (donvi === 5) parts.push("lăm");
    else if (donvi > 0) parts.push(ONES[donvi]);
  } else if (donvi > 0) {
    if (full || tram > 0) parts.push(`lẻ ${ONES[donvi]}`);
    else parts.push(ONES[donvi]);
  }

  return parts.join(" ");
}

/** Đọc số tiền VND bằng chữ (làm tròn đến đồng). */
function amountInWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return "Không đồng";

  const scales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];
  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const g = groups[i];
    if (g === 0) continue;
    const full = i < groups.length - 1;
    const words = readTriple(g, full);
    if (!words) continue;
    parts.push(i > 0 ? `${words} ${scales[i]}` : words);
  }

  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
  return `${capitalized} đồng`;
}

const PRINT_FRAME_ID = "asaka-sales-print-frame";

const COMPANY = {
  name: "CÔNG TY TNHH ASAKA - JAPAN",
  tagline: "Giải pháp bảo vệ thực vật",
  address: "1155/35 tỉnh lộ 43, KP 11, phường Tam Bình, TP.HCM",
  taxCode: "0315330386",
  phone: "0946 866 068",
  email: "asakajapan.company@gmail.com",
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

  const renderTotalRows = (rowsList: InfoRow[] = [], rowClass = "total-row") =>
    rowsList
      .map(
        (row) => `
        <div class="${rowClass}">
          <span>${escapeHtml(row.label)}</span>
          <span>${escapeHtml(row.value)}</span>
        </div>`
      )
      .join("");

  const extraHtml = renderTotalRows(doc.extraRows);
  const afterGrandHtml = renderTotalRows(doc.afterGrandRows, "total-row after");
  const words = amountInWords(doc.total);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(doc.code)} — ${escapeHtml(doc.title)}</title>
  <style>
    * { box-sizing: border-box; }

    @page {
      size: A4;
      margin: 12mm 14mm;
    }

    html, body {
      height: 100%;
      margin: 0;
    }

    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      font-size: 13px;
      line-height: 1.45;
      color: #000;
      background: #fff;
    }

    .sheet {
      max-width: 100%;
      margin: 0 auto;
      /* Chiều cao vùng in A4 (297mm − margin trên/dưới 12mm×2) */
      min-height: 273mm;
      min-height: calc(100vh - 1px);
      display: flex;
      flex-direction: column;
    }

    .sheet-main {
      flex: 1 0 auto;
    }

    /* Header — viền đen, không nền màu */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #000;
    }

    .brand {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      flex: 1;
      min-width: 0;
    }

    .brand img {
      width: 56px;
      height: 56px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .brand-name {
      font-size: 15px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .brand-tagline {
      font-size: 11px;
      font-style: italic;
      margin-top: 2px;
    }

    .brand-contact {
      margin-top: 6px;
      font-size: 11px;
      line-height: 1.55;
    }

    .doc-head {
      text-align: center;
      flex-shrink: 0;
      min-width: 200px;
      border: 1px solid #000;
      padding: 10px 16px;
    }

    .doc-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 2px;
      margin: 0;
      text-transform: uppercase;
    }

    .doc-code {
      margin-top: 6px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding-top: 6px;
      border-top: 1px solid #000;
    }

    .doc-date {
      margin-top: 4px;
      font-size: 11px;
    }

    /* Info blocks */
    .cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      margin-top: 14px;
      border: 1px solid #000;
    }

    .card {
      padding: 10px 12px;
      break-inside: avoid;
    }

    .card + .card {
      border-left: 1px solid #000;
    }

    .card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #000;
    }

    .info-row {
      display: flex;
      gap: 8px;
      padding: 2px 0;
      font-size: 12px;
    }

    .info-label {
      min-width: 95px;
      flex-shrink: 0;
    }

    .info-value {
      flex: 1;
      font-weight: 600;
      word-break: break-word;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 12px;
    }

    thead th {
      border: 1px solid #000;
      background: #fff;
      color: #000;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 8px 6px;
      text-align: left;
    }

    thead th.center,
    tbody td.center {
      text-align: center;
    }

    thead th.num,
    tbody td.num {
      text-align: right;
    }

    tbody td {
      padding: 7px 6px;
      border: 1px solid #000;
      vertical-align: top;
    }

    tbody tr { break-inside: avoid; }

    .product { font-weight: 600; }
    .num { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .strong { font-weight: 700; }

    /* Totals */
    .summary {
      display: flex;
      justify-content: flex-end;
      margin-top: 14px;
      break-inside: avoid;
    }

    .totals {
      width: 300px;
      border: 1px solid #000;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 10px;
      font-size: 12px;
      border-bottom: 1px solid #000;
    }

    .total-row:last-child { border-bottom: none; }

    .total-row span:last-child {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .total-row.grand {
      border-top: 1px solid #000;
      border-bottom: none;
      font-size: 14px;
      font-weight: 700;
      padding: 8px 10px;
      background: #fff;
      color: #000;
    }

    .total-row.grand span:last-child {
      font-size: 15px;
      font-weight: 700;
    }

    .total-row.after {
      background: #fff;
      font-weight: 600;
    }

    .amount-words {
      margin-top: 10px;
      font-size: 12px;
      text-align: right;
      font-style: italic;
    }

    .amount-words strong {
      font-weight: 700;
      font-style: normal;
    }

    /* Signatures — luôn sát đáy trang (hoặc đáy trang cuối nếu nhiều trang) */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: auto;
      padding-top: 16px;
      text-align: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .sign-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .sign-hint {
      font-size: 10px;
      font-style: italic;
      margin-top: 2px;
    }

    .sign-space { height: 64px; }

    .sign-line {
      border-top: 1px solid #000;
      margin: 0 8px;
    }

    @media print {
      body { -webkit-print-color-adjust: economy; print-color-adjust: economy; }
      .sheet {
        min-height: 273mm;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="sheet-main">
    <div class="header">
      <div class="brand">
        ${logoUrl ? `<img src="${logoUrl}" alt="" />` : ""}
        <div>
          <div class="brand-name">${COMPANY.name}</div>
          <div class="brand-tagline">${COMPANY.tagline}</div>
          <div class="brand-contact">
            ${escapeHtml(COMPANY.address)}<br />
            MST: ${COMPANY.taxCode}<br />
            ĐT: ${COMPANY.phone} — ${COMPANY.website}
          </div>
        </div>
      </div>
      <div class="doc-head">
        <h1 class="doc-title">${escapeHtml(doc.title)}</h1>
        <div class="doc-code">Số: ${escapeHtml(doc.code)}</div>
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
          <th class="center" style="width:44px">STT</th>
          <th>Sản phẩm</th>
          <th class="num" style="width:70px">SL</th>
          <th class="num" style="width:120px">Đơn giá</th>
          <th class="num" style="width:130px">Thành tiền</th>
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
          <span>Tổng cộng</span>
          <span>${formatCurrency(doc.total)}</span>
        </div>
        ${afterGrandHtml}
      </div>
    </div>
    <div class="amount-words">Bằng chữ: <strong>${escapeHtml(words)}</strong></div>
    </div>

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