import { formatCurrency } from "@/lib/utils";
import type { LineItem } from "@/lib/types";

type PrintDocumentInput = {
  title: string;
  code: string;
  meta?: { label: string; value: string }[];
  customer?: { label: string; value: string }[];
  items: LineItem[];
  subtotal: number;
  discount?: number;
  total: number;
  extraRows?: { label: string; value: string }[];
  note?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function printSalesDocument(doc: PrintDocumentInput) {
  const rows = doc.items
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.productName || "—")}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatCurrency(item.unitPrice)}</td>
        <td class="num">${formatCurrency(item.lineTotal)}</td>
      </tr>`
    )
    .join("");

  const metaHtml = (doc.meta || [])
    .map(
      (item) =>
        `<div><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</div>`
    )
    .join("");

  const customerHtml = (doc.customer || [])
    .map(
      (item) =>
        `<div><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</div>`
    )
    .join("");

  const extraHtml = (doc.extraRows || [])
    .map(
      (item) =>
        `<div class="total-row"><span>${escapeHtml(item.label)}</span><span>${escapeHtml(item.value)}</span></div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(doc.title)} ${escapeHtml(doc.code)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .muted { color: #555; font-size: 13px; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .num { text-align: right; white-space: nowrap; }
    .totals { margin-top: 16px; width: 280px; margin-left: auto; font-size: 13px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .total-row.strong { font-weight: 700; font-size: 15px; border-top: 1px solid #111; margin-top: 6px; padding-top: 8px; }
    .note { margin-top: 24px; font-size: 13px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(doc.title)}</h1>
  <div class="muted">Mã: <strong>${escapeHtml(doc.code)}</strong></div>
  <div class="grid">
    <div>${metaHtml}</div>
    <div>${customerHtml}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Sản phẩm</th>
        <th class="num">SL</th>
        <th class="num">Đơn giá</th>
        <th class="num">Thành tiền</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="total-row"><span>Tạm tính</span><span>${formatCurrency(doc.subtotal)}</span></div>
    ${
      doc.discount
        ? `<div class="total-row"><span>Chiết khấu</span><span>${formatCurrency(doc.discount)}</span></div>`
        : ""
    }
    ${extraHtml}
    <div class="total-row strong"><span>Tổng cộng</span><span>${formatCurrency(doc.total)}</span></div>
  </div>
  ${
    doc.note
      ? `<div class="note"><strong>Ghi chú:</strong> ${escapeHtml(doc.note)}</div>`
      : ""
  }
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!printWindow) {
    throw new Error("Không mở được cửa sổ in. Hãy cho phép popup.");
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
