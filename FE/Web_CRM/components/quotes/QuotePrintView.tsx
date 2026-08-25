"use client";

import type { ReactElement } from "react";
import { Printer } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Quote } from "@/types/quote";
import { printQuoteDocument } from "@/lib/print/quoteDocument";

export type QuotePrintViewProps = {
  quote: Quote;
  /** When true, show the "In báo giá" button (only used inside dialog preview). */
  withPrintButton?: boolean;
  onPrint?: () => void;
};

function lineUnitPrice(costPrice: number, marginPercent: number) {
  return Math.round((costPrice || 0) * (1 + (marginPercent || 0) / 100));
}

export function QuotePrintView({
  quote,
  withPrintButton = false,
  onPrint,
}: QuotePrintViewProps) {
  const handleClickPrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    printQuoteDocument({ quote });
  };

  return (
    <div className="space-y-4">
      {withPrintButton ? (
        <div className="no-print flex justify-end">
          <Button variant="print" onClick={handleClickPrint}>
            <Printer className="h-4 w-4" />
            In báo giá
          </Button>
        </div>
      ) : null}

      <div className="print-area mx-auto w-full max-w-[820px] rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-6 font-sans text-[15px] leading-relaxed text-slate-900 shadow-sm">
        <header className="flex items-start gap-3 border-b border-slate-900 pb-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
            LOGO
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-bold uppercase tracking-wider">
              Công ty TNHH ASAKA - JAPAN
            </p>
            <p className="text-[13px] italic text-slate-600">
              Giải pháp bảo vệ thực vật
            </p>
            <p className="mt-1 text-[13px] leading-snug text-slate-600">
              1155/35 tỉnh lộ 43, KP 11, phường Tam Bình, TP.HCM
              <br />
              MST: 0315330386 — ĐT: 0946 866 068 — asaka-japan.com
            </p>
          </div>
        </header>

        <h2 className="mt-4 text-center text-[26px] font-extrabold uppercase tracking-widest text-slate-900">
          Bảng báo giá
        </h2>

        <section className="mt-3">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr>
                <th className="border border-slate-900 bg-white px-2 py-2.5 text-center align-middle text-[12px] font-bold uppercase tracking-wider">
                  STT
                </th>
                <th className="border border-slate-900 bg-white px-2 py-2.5 text-center align-middle text-[12px] font-bold uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th className="border border-slate-900 bg-white px-2 py-2.5 text-center align-middle text-[12px] font-bold uppercase tracking-wider">
                  Hoạt chất
                </th>
                <th className="border border-slate-900 bg-white px-2 py-2.5 text-center align-middle text-[12px] font-bold uppercase tracking-wider">
                  Công dụng
                </th>
                <th className="border border-slate-900 bg-white px-2 py-2.5 text-center align-middle text-[12px] font-bold uppercase tracking-wider">
                  SL/thùng
                </th>
                <th className="border border-slate-900 bg-white px-2 py-2.5 text-center align-middle text-[12px] font-bold uppercase tracking-wider">
                  Đơn giá
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let lastCategory = "";
                let stt = 0;
                const sections: ReactElement[] = [];
                quote.lines.forEach((line, index) => {
                  const cat = line.categoryName || "Chưa phân loại";
                  if (cat !== lastCategory) {
                    sections.push(
                      <tr
                        key={`cat-${index}`}
                        className="bg-blue-700 text-white"
                      >
                        <th
                          colSpan={6}
                          className="border border-blue-900 px-3 py-2 text-left text-[13px] font-bold uppercase tracking-wider"
                        >
                          {cat}
                        </th>
                      </tr>
                    );
                    lastCategory = cat;
                  }
                  stt += 1;
                  const unitPrice = lineUnitPrice(
                    line.costPrice,
                    line.marginPercent
                  );
                  sections.push(
                    <tr key={`${line.productId}-${index}`}>
                      <td className="border border-slate-900 px-2 py-2 text-center align-middle">
                        {stt}
                      </td>
                      <td className="border border-slate-900 px-2 py-2 text-center align-middle">
                        <p className="font-bold">{line.name}</p>
                        {line.sku ? (
                          <p className="text-[11px] italic text-slate-500">
                            SKU: {line.sku}
                          </p>
                        ) : null}
                      </td>
                      <td className="border border-slate-900 px-2 py-2 text-center align-middle whitespace-pre-line">
                        {line.activeIngredient || (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="border border-slate-900 px-2 py-2 text-center align-middle whitespace-pre-line">
                        {line.application || (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="border border-slate-900 px-2 py-2 text-center align-middle tabular-nums">
                        {line.unitsPerCase || "—"}
                      </td>
                      <td className="border border-slate-900 px-2 py-2 text-center align-middle font-bold tabular-nums">
                        {formatCurrency(unitPrice)}
                      </td>
                    </tr>
                  );
                });
                return sections;
              })()}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}