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
  chai: "Chai",
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

function buildPrintHtml(doc: InventorySlipInput) {
  const isImport = doc.type === "import";
  const accent = isImport ? "#017d03" : "#1e3a5f";
  const accentSoft = isImport ? "#eef7ee" : "#eef2f7";
  const typeLabel = isImport ? "NHẬP KHO" : "XUẤT KHO";
  const typeShort = isImport ? "Phiếu nhập" : "Phiếu xuất";
  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/images/brand/logo.png`
      : "";

  const unitLabel =
    (doc.unitType && UNIT_LABELS[doc.unitType]) || doc.unitType || "—";
  const showCost = Boolean(doc.showCost);
  const unitCost = Number(doc.unitCost) || 0;
  const totalCost =
    Number(doc.totalCost) || unitCost * (Number(doc.quantity) || 0);

  const costCols = showCost
    ? `
      <th class="num">Đơn giá vốn</th>
      <th class="num">Thành tiền</th>`
    : "";

  const costCells = showCost
    ? `
      <td class="num">${unitCost > 0 ? formatCurrency(unitCost) : "—"}</td>
      <td class="num strong">${totalCost > 0 ? formatCurrency(totalCost) : "—"}</td>`
    : "";

  const signLeft = isImport ? "Người giao hàng" : "Người nhận hàng";
  const signMid = "Thủ kho";
  const signRight = "Người lập phiếu";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(typeShort)} ${escapeHtml(doc.code)}</title>
  <style>
    :root {
      --accent: ${accent};
      --accent-soft: ${accentSoft};
      --ink: #0f172a;
      --muted: #64748b;
      --line: #d7dee8;
      --paper: #ffffff;
    }

    * { box-sizing: border-box; }

    @page {
      size: A4;
      margin: 12mm 14mm;
    }

    body {
      margin: 0;
      font-family: "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      color: var(--ink);
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .sheet {
      max-width: 820px;
      margin: 0 auto;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      gap: 16px;
      border: 1.5px solid var(--accent);
    }

    .brand {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 14px 16px;
      flex: 1;
    }

    .brand img {
      width: 52px;
      height: 52px;
      object-fit: contain;
    }

    .brand-name {
      font-size: 15px;
      font-weight: 800;
      color: var(--accent);
      letter-spacing: .2px;
    }

    .brand-meta {
      margin-top: 3px;
      font-size: 11px;
      color: var(--muted);
      line-height: 1.55;
    }

    .type-block {
      min-width: 190px;
      background: var(--accent);
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 14px 18px;
    }

    .type-label {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1.5px;
      margin: 0;
    }

    .type-code {
      margin-top: 8px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: .8px;
      padding: 4px 10px;
      border: 1px solid rgba(255,255,255,.55);
      background: rgba(255,255,255,.12);
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr;
      border-left: 1.5px solid var(--line);
      border-right: 1.5px solid var(--line);
      border-bottom: 1.5px solid var(--line);
    }

    .meta-cell {
      padding: 12px 14px;
      border-right: 1px solid var(--line);
      min-height: 64px;
    }

    .meta-cell:last-child { border-right: 0; }

    .meta-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 4px;
    }

    .meta-value {
      font-size: 14px;
      font-weight: 700;
      word-break: break-word;
    }

    .section-title {
      margin: 22px 0 8px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: var(--accent);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid var(--line);
    }

    thead th {
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .6px;
      text-transform: uppercase;
      padding: 10px 12px;
      border-bottom: 1.5px solid var(--line);
      text-align: left;
    }

    tbody td {
      padding: 14px 12px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }

    tbody tr:last-child td { border-bottom: 0; }

    .product { font-weight: 700; font-size: 14px; }
    .sub {
      margin-top: 3px;
      font-size: 12px;
      color: var(--muted);
      white-space: pre-line;
    }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .center { text-align: center; }
    .strong { font-weight: 800; }
    .qty {
      font-size: 18px;
      font-weight: 800;
      color: var(--accent);
    }

    .footer-box {
      display: grid;
      grid-template-columns: ${showCost ? "1.2fr 1fr" : "1fr"};
      gap: 14px;
      margin-top: 14px;
    }

    .note, .total-box {
      border: 1.5px solid var(--line);
      padding: 12px 14px;
      min-height: 72px;
    }

    .note-title, .total-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 6px;
    }

    .note-body { font-size: 13px; white-space: pre-wrap; }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
      padding: 2px 0;
    }

    .total-row.grand {
      margin-top: 6px;
      padding-top: 8px;
      border-top: 1px dashed var(--line);
      font-size: 15px;
      font-weight: 800;
      color: var(--accent);
    }

    .balance {
      margin-top: 12px;
      padding: 10px 14px;
      background: var(--accent-soft);
      border: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .balance-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .8px;
      text-transform: uppercase;
      color: var(--accent);
    }

    .balance-value {
      font-size: 16px;
      font-weight: 800;
      white-space: pre-line;
      text-align: right;
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 18px;
      margin-top: 36px;
      text-align: center;
      break-inside: avoid;
    }

    .sign-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .4px;
    }

    .sign-hint {
      margin-top: 2px;
      font-size: 11px;
      color: var(--muted);
    }

    .sign-space { height: 64px; }

    .sign-line {
      border-top: 1px solid #94a3b8;
      margin: 0 10px;
    }

    .page-foot {
      margin-top: 28px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      text-align: center;
      font-size: 10px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="topbar">
      <div class="brand">
        ${logoUrl ? `<img src="${logoUrl}" alt="" />` : ""}
        <div>
          <div class="brand-name">${COMPANY.name}</div>
          <div class="brand-meta">
            ${escapeHtml(COMPANY.tagline)}<br />
            ${escapeHtml(COMPANY.address)}<br />
            ĐT: ${COMPANY.phone} · ${COMPANY.website}
          </div>
        </div>
      </div>
      <div class="type-block">
        <h1 class="type-label">${typeLabel}</h1>
        <div class="type-code">${escapeHtml(doc.code)}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-cell">
        <div class="meta-label">Kho hàng</div>
        <div class="meta-value">${escapeHtml(doc.warehouseName || "—")}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Thời gian</div>
        <div class="meta-value">${escapeHtml(formatDateTime(doc.createdAt))}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Loại chứng từ</div>
        <div class="meta-value">${escapeHtml(typeShort)}</div>
      </div>
    </div>

    <div class="section-title">Chi tiết hàng hóa</div>
    <table>
      <thead>
        <tr>
          <th style="width:44px" class="center">#</th>
          <th>Sản phẩm</th>
          <th class="center" style="width:72px">ĐVT</th>
          <th class="num" style="width:90px">Số lượng</th>
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
          <td class="center">${escapeHtml(unitLabel)}</td>
          <td class="num qty">${doc.quantity}</td>
          ${costCells}
        </tr>
      </tbody>
    </table>

    <div class="footer-box">
      <div class="note">
        <div class="note-title">Ghi chú</div>
        <div class="note-body">${escapeHtml(doc.note?.trim() || "Không có")}</div>
      </div>
      ${
        showCost
          ? `<div class="total-box">
              <div class="total-title">Giá trị phiếu</div>
              <div class="total-row">
                <span>Đơn giá vốn</span>
                <span>${unitCost > 0 ? formatCurrency(unitCost) : "—"}</span>
              </div>
              <div class="total-row grand">
                <span>Thành tiền</span>
                <span>${totalCost > 0 ? formatCurrency(totalCost) : "—"}</span>
              </div>
            </div>`
          : ""
      }
    </div>

    <div class="balance">
      <span class="balance-label">Tồn kho sau phiếu</span>
      <span class="balance-value">${escapeHtml(doc.balanceAfterLabel)}</span>
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
