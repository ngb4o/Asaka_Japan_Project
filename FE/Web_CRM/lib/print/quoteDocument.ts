import { formatCurrency } from "@/lib/utils";
import type { Quote, QuoteLine } from "@/types/quote";

export type PrintQuoteInput = {
  quote: Quote;
  /** When true, adds cost price and profit columns (for internal use). */
  forAdmin?: boolean;
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

/* =========================================================
   GROUP BY VARIANT
   Gộp các sản phẩm cùng tên gốc, chỉ khác dung tích/khối lượng
   (VD: "Regent 800WG 100g" và "Regent 800WG 1kg") thành 1 row
   khi in, mỗi biến thể vẫn giữ giá riêng.
========================================================= */

const VARIANT_PATTERN =
  /[\s\-–(]*(\d+(?:[.,]\d+)?\s?(?:ml|l|lít|lit|kg|g|gr|gam|lon|gói|goi|chai))\)?\s*$/i;

function splitVariant(name: string) {
  const raw = (name || "").trim();
  const match = raw.match(VARIANT_PATTERN);
  if (!match) {
    return { baseName: raw, variantLabel: null as string | null };
  }
  const variantLabel = match[1].trim();
  const baseName = raw.slice(0, match.index).trim().replace(/[-–(]+$/, "").trim();
  return { baseName: baseName || raw, variantLabel };
}

function groupLinesByVariant(lines: QuoteLine[]) {
  const groups = new Map<string, QuoteLine[]>();
  const order: string[] = [];
  for (const line of lines) {
    const { baseName } = splitVariant(line.name || "");
    const key = baseName.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(line);
  }
  return order.map((key) => groups.get(key)!);
}

function buildPrintHtml(input: PrintQuoteInput) {
  const company = { ...DEFAULT_COMPANY, ...input.company };

  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/images/brand/logo.png`
      : "";

  const sortedLines = [...input.quote.lines].sort((a, b) => {
    const aCat = (a.categoryName || "").trim().toLowerCase();
    const bCat = (b.categoryName || "").trim().toLowerCase();
    if (aCat !== bCat) return aCat.localeCompare(bCat, "vi");
    return 0;
  });
  const rows = groupLinesByVariant(sortedLines)
    .map((group, index) => {
      const isMulti = group.length > 1;
      const first = group[0];
      const { baseName } = splitVariant(first.name || "");
      const displayName = isMulti ? baseName : first.name || "—";

      const computed = group.map((line) => {
        const margin = line.marginPercent || 0;
        const unitPrice =
          line.overrideUnitPrice ??
          Math.round((line.costPrice || 0) * (1 + margin / 100));
        const costPrice = line.costPrice || 0;
        const profit = unitPrice - costPrice;
        const profitPercent =
          costPrice > 0 ? ((profit / costPrice) * 100).toFixed(1) : "—";
        const { variantLabel } = splitVariant(line.name || "");
        return { line, unitPrice, costPrice, profit, profitPercent, variantLabel };
      });

      const skuCell = isMulti
        ? group
          .map((l) =>
            l.sku ? `<div class="muted">SKU: ${escapeHtml(l.sku)}</div>` : ""
          )
          .join("")
        : first.sku
          ? `<div class="muted">SKU: ${escapeHtml(first.sku)}</div>`
          : "";

      const qtyCell = isMulti
        ? computed
          .map(
            (c) =>
              `<div class="variant-line">${escapeHtml(
                c.variantLabel || c.line.sku || "—"
              )}: ${c.line.unitsPerCase || "—"}</div>`
          )
          .join("")
        : `${first.unitsPerCase || "—"}`;

      const priceCell = isMulti
        ? computed
          .map(
            (c) =>
              `<div class="variant-line">${escapeHtml(
                c.variantLabel || c.line.sku || "—"
              )}: ${c.unitPrice.toLocaleString("vi-VN")}</div>`
          )
          .join("")
        : `${computed[0].unitPrice.toLocaleString("vi-VN")}`;

      const adminCols = input.forAdmin
        ? `
          <td class="num admin-value">
            ${isMulti
          ? computed
            .map(
              (c) =>
                `<div class="variant-line">${c.costPrice.toLocaleString("vi-VN")}</div>`
            )
            .join("")
          : computed[0].costPrice.toLocaleString("vi-VN")
        }
          </td>

          <td class="num admin-profit">
            ${isMulti
          ? computed
            .map(
              (c) => `
                      <div class="variant-line">
                        <div class="profit-percent">${c.profitPercent}%</div>
                        <div class="profit-amount">${c.profit > 0 ? "+" : ""}${c.profit.toLocaleString(
                "vi-VN"
              )}</div>
                      </div>`
            )
            .join("")
          : `
                  <div class="profit-percent">
                    ${computed[0].profitPercent}%
                  </div>
                  <div class="profit-amount">
                    ${computed[0].profit > 0 ? "+" : ""}${computed[0].profit.toLocaleString("vi-VN")}
                  </div>
                `
        }
          </td>
        `
        : "";

      return `
        <tr>
          ${!input.forAdmin
          ? `
                <td class="center">
                  ${index + 1}
                </td>
              `
          : ""
        }

          <td>
            <div class="product">
              ${escapeHtml(displayName)}
            </div>

            ${skuCell}
          </td>

          ${
            !input.forAdmin
              ? `
                <td>
                  ${
                    first.activeIngredient
                      ? `<div class="multiline">${escapeHtml(first.activeIngredient)}</div>`
                      : "—"
                  }
                </td>

                <td>
                  ${
                    first.application
                      ? `<div class="multiline">${escapeHtml(first.application)}</div>`
                      : "—"
                  }
                </td>
              `
              : ""
          }

          <td class="num">
            ${qtyCell}
          </td>

          ${adminCols}

          <td class="num">
            ${priceCell}
          </td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />

  <title>
    Báo giá — ${escapeHtml(input.quote.name || "ASAKA")}
  </title>

  <style>
    * {
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 8mm 10mm;
    }

    html,
    body {
      height: 100%;
      margin: 0;
    }

    body {
      font-family: "Times New Roman", Times, Georgia, serif;
      font-size: 15px;
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

    /* =========================
       HEADER
    ========================= */

    .header {
      display: grid;
      grid-template-columns: 120px 1fr 120px;
      align-items: center;
      gap: 16px;
      padding-bottom: 0;
    }

    .logo {
      width: 140px;
      height: 140px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .logo-fallback {
      width: 140px;
      height: 140px;
      flex-shrink: 0;
      border: 1px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .brand-info {
      flex: 1;
      text-align: center;
    }

    .brand-name {
      font-size: 24px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #c00;
    }

    .brand-tagline {
      font-size: 16px;
      font-weight: 700;
      font-style: italic;
      margin-top: 4px;
    }

    .brand-contact {
      margin-top: 6px;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.6;
    }

    /* =========================
       TITLE
    ========================= */

    .doc-title {
      font-size: 26px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-align: center;
      margin: 12px 0 8px;
      color: #0055b3;
    }

    .validity-period {
      font-size: 13px;
      text-align: center;
      margin: 0 0 16px;
      font-style: italic;
      color: #333;
    }

    /* =========================
       TABLE
    ========================= */

    table {
      width: 99%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 14px;
      table-layout: fixed;
    }

    thead th {
      border: 1px solid #000;
      background: #f0f4f8;
      color: #000;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 10px 6px;
      text-align: center;
      vertical-align: middle;
    }

    thead th.center,
    tbody td.center {
      text-align: center;
    }

    thead th.num,
    tbody td.num {
      text-align: center;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    tbody td {
      padding: 10px 6px;
      border: 1px solid #000;
      vertical-align: middle;
      text-align: center;
      font-weight: 500;
    }

    tbody tr {
      break-inside: avoid;
    }

    /* =========================
       CONTENT
    ========================= */

    .product {
      text-align: left;
    }

    .muted {
      color: #444;
      font-size: 11px;
      margin-top: 2px;
      font-style: italic;
      text-align: left;
    }

    .strong {
      font-weight: 600;
      font-style: normal;
    }

    .multiline {
      white-space: pre-line;
      text-align: left;
    }

    /* =========================
       BIẾN THỂ (dòng nhỏ gộp trong 1 ô)
    ========================= */

    .variant-line {
      padding: 2px 0;
    }

    .variant-line + .variant-line {
      border-top: 1px dashed #ccc;
      margin-top: 2px;
    }

    /* =========================
       ADMIN - GIÁ VỐN
    ========================= */

    .admin-value {
      font-size: 14px;
      font-weight: 500;
      font-style: normal !important;
      text-align: center;
      color: #000;
      white-space: nowrap;
    }

    /* =========================
       ADMIN - LỢI NHUẬN
    ========================= */

    .admin-profit {
      text-align: center;
      font-style: normal !important;
      color: #000;
      white-space: nowrap;
    }

    .profit-percent {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.2;
      font-style: normal;
    }

    .profit-amount {
      margin-top: 2px;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.2;
      font-style: normal;
    }

    /* =========================
       PRINT
    ========================= */

    @media print {
      body {
        -webkit-print-color-adjust: economy;
        print-color-adjust: economy;
      }
    }
  </style>
</head>

<body>
  <div class="sheet">
    <div class="sheet-main">

      <!-- HEADER -->
      <div class="header">
        ${logoUrl
      ? `<img class="logo" src="${logoUrl}" alt="" />`
      : `<div class="logo-fallback">LOGO</div>`
    }

        <div class="brand-info">
          <div class="brand-name">
            ${escapeHtml(company.name)}
          </div>

          <div class="brand-tagline">
            ${escapeHtml(company.tagline)}
          </div>

          <div class="brand-contact">
            ĐC: ${escapeHtml(company.address)}
            <br />
            MST: ${escapeHtml(company.taxCode)}
            — ĐT: ${escapeHtml(company.phone)}
          </div>
        </div>

        <div aria-hidden="true"></div>
      </div>

      <!-- TITLE -->
      <div class="doc-title">
        Bảng báo giá
      </div>

      ${input.quote.validFrom
      ? `
            <div class="validity-period">
              Thời gian diễn ra chương trình từ ngày ${input.quote.validFrom.split("T")[0].split("-").reverse().join("/")}
              ${input.quote.validUntil
        ? ` đến ngày ${input.quote.validUntil.split("T")[0].split("-").reverse().join("/")}`
        : ` đến khi có thông báo mới`
      }
            </div>
          `
      : ""
    }

      <!-- TABLE -->
      <table>
        <thead>
          <tr>
            ${!input.forAdmin
      ? `
                  <!-- STT: nhỏ -->
                  <th class="center" style="width: 40px">
                    STT
                  </th>
                `
      : ""
    }

            <!-- Sản phẩm -->
            <th style="width: 21%">
              Sản phẩm
            </th>

            ${
              !input.forAdmin
                ? `
                  <!-- Hoạt chất -->
                  <th style="width: 22%">
                    Hoạt chất
                  </th>

                  <!-- Công dụng -->
                  <th style="width: 22%">
                    Công dụng
                  </th>
                `
                : ""
            }

            <!-- GIẢM -->
            ${input.forAdmin
      ? `
                  <th class="num" style="width: 55px">
                    SL
                  </th>
                `
      : `
                  <th class="num" style="width: 60px">
                    SL/thùng
                  </th>
                `
    }

            ${input.forAdmin
      ? `
                  <th class="num" style="width: 80px">
                    Giá vốn
                  </th>

                  <th class="num" style="width: 100px">
                    Lợi nhuận
                  </th>

                  <th class="num" style="width: 75px">
                    Giá
                  </th>
                `
      : `
                  <!-- GIẢM -->
                  <th class="num" style="width: 80px">
                    Đơn giá
                  </th>
                `
    }
          </tr>
        </thead>

        <tbody>
          ${rows}
        </tbody>
      </table>

    </div>
  </div>
</body>
</html>`;
}

function getPrintFrame() {
  let frame = document.getElementById(
    PRINT_FRAME_ID
  ) as HTMLIFrameElement | null;

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

  const frameDocument =
    frame.contentDocument || frameWindow?.document;

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
    frame.onload = () => {
      window.setTimeout(triggerPrint, 250);
    };
  }
}