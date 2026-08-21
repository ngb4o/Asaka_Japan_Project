import { formatCurrency } from "@/lib/utils";
import type { InventoryTransaction, InventoryUnitType } from "@/lib/types";

type InventorySlipInput = {
  type: "import" | "export";
  code: string;
  warehouseName?: string;
  createdAt: string;
  balanceAfterLabel: string;
  productName: string;
  quantity: number;
  unitType?: InventoryUnitType;
  quantityLabel?: string;
  unitCost?: number | null;
  totalCost?: number | null;
  showCost?: boolean;
  note?: string;
};

const UNIT_LABELS: Record<string, string> = {
  sanpham: "Sản phẩm",
  thung: "Thùng",
};

const COMPANY = {
  name: "CÔNG TY TNHH ASAKA - JAPAN",
  tagline: "Giải pháp bảo vệ thực vật",
  address: "1155/35 tỉnh lộ 43, KP 11, phường Tam Bình, TP.HCM",
  phone: "0946 866 068",
  website: "asaka-japan.com",
};

const PRINT_FRAME_ID = "asaka-inventory-print-frame";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderInfoRow(label: string, value: string) {
  return `<div class="info-row"><span class="info-label">${escapeHtml(label)}</span><span class="info-value">${escapeHtml(value)}</span></div>`;
}

function buildPrintHtml(doc: InventorySlipInput) {
  const isImport = doc.type === "import";
  const typeLabel = isImport ? "NHẬP KHO" : "XUẤT KHO";
  const typeShort = isImport ? "Phiếu nhập" : "Phiếu xuất";
  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/images/brand/logo.png`
      : "";

  const unitLabel =
    (doc.unitType && UNIT_LABELS[doc.unitType]) || doc.unitType || "";
  const quantityDisplay = unitLabel
    ? `${doc.quantity} ${unitLabel}`
    : String(doc.quantity);

  const showCost = Boolean(doc.showCost);
  const unitCost = Number(doc.unitCost) || 0;
  const totalCost =
    Number(doc.totalCost) || unitCost * (Number(doc.quantity) || 0);

  const costCols = showCost
    ? `
          <th class="num" style="width:120px">Đơn giá vốn</th>
          <th class="num" style="width:130px">Thành tiền</th>`
    : "";

  const costCells = showCost
    ? `
          <td class="num">${unitCost > 0 ? formatCurrency(unitCost) : "—"}</td>
          <td class="num strong">${totalCost > 0 ? formatCurrency(totalCost) : "—"}</td>`
    : "";

  const signLeft = isImport ? "Người giao hàng" : "Người nhận hàng";
  const signMid = "Thủ kho";
  const signRight = "Người lập phiếu";

  const costSummary = showCost
    ? `<div class="summary">
        <div class="totals">
          <div class="total-row">
            <span>Đơn giá vốn</span>
            <span>${unitCost > 0 ? formatCurrency(unitCost) : "—"}</span>
          </div>
          <div class="total-row grand">
            <span>Thành tiền</span>
            <span>${totalCost > 0 ? formatCurrency(totalCost) : "—"}</span>
          </div>
        </div>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(doc.code)}</title>
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
      min-height: 273mm;
      min-height: calc(100vh - 1px);
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #000;
      flex-shrink: 0;
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

    .sheet-main {
      flex: 1 0 auto;
    }

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
    .sub {
      margin-top: 3px;
      font-size: 11px;
      white-space: pre-line;
    }
    .num { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .strong { font-weight: 700; }

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
    }

    .total-row.grand span:last-child {
      font-size: 15px;
      font-weight: 700;
    }

    .balance {
      margin-top: 14px;
      padding: 8px 12px;
      border: 1px solid #000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      break-inside: avoid;
    }

    .balance-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .balance-value {
      font-size: 13px;
      font-weight: 700;
      white-space: pre-line;
      text-align: right;
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 24px;
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
    <div class="header">
      <div class="brand">
        ${logoUrl ? `<img src="${logoUrl}" alt="" />` : ""}
        <div>
          <div class="brand-name">${COMPANY.name}</div>
          <div class="brand-tagline">${COMPANY.tagline}</div>
          <div class="brand-contact">
            ${escapeHtml(COMPANY.address)}<br />
            ĐT: ${COMPANY.phone} — ${COMPANY.website}
          </div>
        </div>
      </div>
      <div class="doc-head">
        <h1 class="doc-title">${typeLabel}</h1>
        <div class="doc-code">Số: ${escapeHtml(doc.code)}</div>
      </div>
    </div>

    <div class="sheet-main">
        <div class="cards">
          <div class="card">
            <div class="card-title">Thông tin phiếu</div>
            ${renderInfoRow("Kho hàng", doc.warehouseName || "—")}
            ${renderInfoRow("Thời gian", formatDateTime(doc.createdAt))}
          </div>
          <div class="card">
            <div class="card-title">Loại chứng từ</div>
            ${renderInfoRow("Hình thức", typeShort)}
            ${renderInfoRow("Mã phiếu", doc.code)}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="center" style="width:44px">STT</th>
              <th>Sản phẩm</th>
              <th class="num" style="width:100px">Số lượng</th>
              ${costCols}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="center">1</td>
              <td>
                <div class="product">${escapeHtml(doc.productName || "—")}</div>
                ${
                  doc.quantityLabel
                    ? `<div class="sub">${escapeHtml(doc.quantityLabel)}</div>`
                    : ""
                }
              </td>
              <td class="num strong">${escapeHtml(quantityDisplay)}</td>
              ${costCells}
            </tr>
          </tbody>
        </table>

        ${costSummary}

        <div class="balance">
          <span class="balance-label">Tồn kho sau phiếu</span>
          <span class="balance-value">${escapeHtml(doc.balanceAfterLabel)}</span>
        </div>
    </div>

    <div class="signatures">
      <div>
        <div class="sign-title">${signLeft}</div>
        <div class="sign-hint">(Ký, ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-line"></div>
      </div>
      <div>
        <div class="sign-title">${signMid}</div>
        <div class="sign-hint">(Ký, ghi rõ họ tên)</div>
        <div class="sign-space"></div>
        <div class="sign-line"></div>
      </div>
      <div>
        <div class="sign-title">${signRight}</div>
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

export function printInventorySlip(doc: InventorySlipInput) {
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

  if (frameDocument.readyState === "complete") {
    window.setTimeout(triggerPrint, 250);
  } else {
    frame.onload = () => window.setTimeout(triggerPrint, 250);
  }
}

/** Helper: map transaction → phiếu in. */
export function printInventoryTransaction(
  item: InventoryTransaction,
  options?: {
    showCost?: boolean;
    quantityLabel?: string;
    balanceAfterLabel?: string;
  }
) {
  const isImport = item.type === "import";
  printInventorySlip({
    type: item.type,
    code: `${isImport ? "NK" : "XK"}-${item.id.slice(-6).toUpperCase()}`,
    warehouseName: item.warehouseName,
    createdAt: item.createdAt,
    balanceAfterLabel: options?.balanceAfterLabel || String(item.balanceAfter),
    productName: item.productName || "—",
    quantity: item.quantity,
    unitType: item.unitType,
    quantityLabel: options?.quantityLabel,
    unitCost: item.unitCost,
    totalCost: item.totalCost,
    showCost: options?.showCost,
    note: item.note,
  });
}
