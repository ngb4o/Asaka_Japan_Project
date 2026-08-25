import { formatCurrency } from "@/lib/utils";
import type { Quote } from "@/types/quote";

export type PrintQuoteInput = {
  quote: Quote;
  /** Override company info (defaults to ASAKA). */
  company?: {
    name: string;
    tagline: string;
    address: string;
    taxCode: string;
    phone: string;
    website: string;
  };
};

const DEFAULT_COMPANY = {
  name: "CÔNG TY TNHH ASAKA - JAPAN",
  tagline: "Giải pháp bảo vệ thực vật",
  address: "1155/35 tỉnh lộ 43, KP 11, phường Tam Bình, TP.HCM",
  taxCode: "0315330386",
  phone: "0946 866 068",
};

const PRINT_FRAME_ID = "asaka-quote-print-frame";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildPrintHtml(input: PrintQuoteInput) {
  const company = { ...DEFAULT_COMPANY, ...input.company };
  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/images/brand/logo.png`
      : "";

  const rows = input.quote.lines
    .map((line, index) => {
      const margin = line.marginPercent || 0;
      const unitPrice = Math.round((line.costPrice || 0) * (1 + margin / 100));
      return `
      <tr>
        <td class="center">${index + 1}</td>
        <td>
          <div class="product">${escapeHtml(line.name || "—")}</div>
          ${line.sku ? `<div class="muted">SKU: ${escapeHtml(line.sku)}</div>` : ""}
        </td>
        <td>${line.activeIngredient ? `<div class="multiline">${escapeHtml(line.activeIngredient)}</div>` : "—"}</td>
        <td>${line.application ? `<div class="multiline">${escapeHtml(line.application)}</div>` : "—"}</td>
        <td class="num">${line.unitsPerCase || "—"}</td>
        <td class="num strong">${unitPrice.toLocaleString("vi-VN")}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Báo giá — ${escapeHtml(input.quote.name || "ASAKA")}</title>
  <style>
    * { box-sizing: border-box; }

    @page {
      size: A4;
      margin: 8mm 10mm;
    }

    html, body {
      height: 100%;
      margin: 0;
    }

    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      font-size: 13px;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }

    .sheet {
      max-width: 100%;
      margin: 0 auto;
      min-height: calc(100vh - 1px);
      display: flex;
      flex-direction: column;
    }

    .sheet-main {
      flex: 1 0 auto;
    }

    .header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 0;
}

    .logo {
      width: 100px;
      height: 100px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .logo-fallback {
      width: 100px;
      height: 100px;
      flex-shrink: 0;
      border: 1px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .brand-name {
      font-size: 20px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #c00;
    }

    .brand-tagline {
      font-size: 14px;
      font-weight: 700;
      font-style: italic;
      margin-top: 4px;
    }

    .brand-contact {
      margin-top: 6px;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.6;
    }

    .doc-title {
      font-size: 24px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-align: center;
      margin: 28px 0 12px;
      color: #0055b3;
    }

    table {
      width: 99%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 12px;
    }

    thead th {
      border: 1px solid #000;
      background: #f0f4f8;
      color: #000;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 8px 6px;
      text-align: center;
      vertical-align: middle;
    }

    thead th.center,
    tbody td.center { text-align: center; }

    thead th.num,
    tbody td.num {
      text-align: center;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    tbody td {
      padding: 8px 6px;
      border: 1px solid #000;
      vertical-align: middle;
      text-align: center;
      font-weight: 500;
    }

    tbody tr { break-inside: avoid; }

    /* Unified weight inside the table — every cell uses the same font-weight
       set on tbody td. Decorative classes below only adjust style, not weight. */
    .product { text-align: left; }
    .muted { color: #444; font-size: 10px; margin-top: 2px; font-style: italic; text-align: left; }
    .strong { }
    .multiline { white-space: pre-line; text-align: left; }

    @media print {
      body { -webkit-print-color-adjust: economy; print-color-adjust: economy; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="sheet-main">
      <div class="header">
        ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="" />` : `<div class="logo-fallback">LOGO</div>`}
        <div>
          <div class="brand-name">${escapeHtml(company.name)}</div>
          <div class="brand-tagline">${escapeHtml(company.tagline)}</div>
          <div class="brand-contact">
            ĐC: ${escapeHtml(company.address)}<br />
            MST: ${escapeHtml(company.taxCode)} — ĐT: ${escapeHtml(company.phone)}
          </div>
        </div>
      </div>

      <div class="doc-title">Bảng báo giá</div>

      <table>
        <thead>
          <tr>
            <th class="center" style="width:44px">STT</th>
            <th style="width:26%">Sản phẩm</th>
            <th style="width:20%">Hoạt chất</th>
            <th style="width:24%">Công dụng</th>
            <th class="num" style="width:90px">SL/thùng</th>
            <th class="num" style="width:130px">Đơn giá</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
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

export function printQuoteDocument(input: PrintQuoteInput) {
  const frame = getPrintFrame();
  const html = buildPrintHtml(input);
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