"use client";

import { useMemo } from "react";
import { Trash2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import type { QuoteLine } from "@/types/quote";

export type QuoteLineTableProps = {
  lines: QuoteLine[];
  defaultMargin: number;
  onChange: (lines: QuoteLine[]) => void;
  disabled?: boolean;
  /** When provided, only rows matching the query are rendered (case-insensitive
   *  match against name, sku, activeIngredient, application). onChange still
   *  receives the full array. */
  search?: string;
};

export function calculateUnitPrice(costPrice: number, marginPercent: number) {
  const cost = Number(costPrice) || 0;
  const margin = Number(marginPercent) || 0;
  return Math.round(cost * (1 + margin / 100));
}

export function calculateLineTotal(
  costPrice: number,
  marginPercent: number,
  quantity: number
) {
  return calculateUnitPrice(costPrice, marginPercent) * (quantity || 0);
}

export function QuoteLineTable({
  lines,
  defaultMargin,
  onChange,
  disabled,
  search,
}: QuoteLineTableProps) {
  const keyword = (search || "").trim().toLowerCase();
  const filteredIndices = useMemo(() => {
    if (!keyword) return lines.map((_, i) => i);
    return lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => {
        const haystack = [
          line.name || "",
          line.sku || "",
          line.activeIngredient || "",
          line.application || "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      })
      .map(({ i }) => i);
  }, [lines, keyword]);

  function updateLine(index: number, patch: Partial<QuoteLine>) {
    onChange(
      lines.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }

  if (lines.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-4 py-6 text-center text-sm text-[var(--color-text-inverse)]">
        Chưa có sản phẩm nào. Chọn sản phẩm phía trên để thêm vào báo giá.
      </p>
    );
  }

  if (filteredIndices.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-4 py-6 text-center text-sm text-[var(--color-text-inverse)]">
        Không có sản phẩm nào khớp với “{search}”.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="hidden lg:block">
        <div className="crm-table-scroll rounded-[var(--radius-card)] border border-[var(--color-border-subtle)]">
          <table className="crm-data-table min-w-[1080px]">
            <thead>
              <tr>
                <th className="font-medium">STT</th>
                <th className="font-medium">Sản phẩm</th>
                <th className="font-medium">Hoạt chất</th>
                <th className="font-medium">Công dụng</th>
                <th className="text-right font-medium">Giá vốn</th>
                <th className="text-right font-medium">% LN</th>
                <th className="text-right font-medium">Đơn giá</th>
                <th className="text-right font-medium">SL/thùng</th>
                <th className="text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredIndices.map((index) => {
                const line = lines[index];
                const unitPrice = calculateUnitPrice(
                  line.costPrice,
                  line.marginPercent
                );
                return (
                  <tr key={`${line.productId}-${index}`}>
                    <td className="tabular-nums text-[var(--color-text-inverse)]">
                      {index + 1}
                    </td>
                    <td className="w-[260px] min-w-[260px] align-top">
                      <Textarea
                        value={line.name || ""}
                        onChange={(event) =>
                          updateLine(index, { name: event.target.value })
                        }
                        placeholder="Tên sản phẩm..."
                        className="min-h-[88px] w-full resize-y text-sm font-medium"
                        disabled={disabled}
                      />
                      {line.sku ? (
                        <p className="mt-1 whitespace-pre-line break-words text-xs text-[var(--color-text-inverse)]">
                          SKU: {line.sku}
                        </p>
                      ) : null}
                    </td>
                    <td className="min-w-[220px] align-top">
                      <Textarea
                        value={line.activeIngredient || ""}
                        onChange={(event) =>
                          updateLine(index, {
                            activeIngredient: event.target.value,
                          })
                        }
                        placeholder="Hoạt chất..."
                        className="min-h-[88px] w-full resize-y text-sm"
                        disabled={disabled}
                      />
                    </td>
                    <td className="min-w-[260px] align-top">
                      <Textarea
                        value={line.application || ""}
                        onChange={(event) =>
                          updateLine(index, { application: event.target.value })
                        }
                        placeholder="Công dụng..."
                        className="min-h-[88px] w-full resize-y text-sm"
                        disabled={disabled}
                      />
                    </td>
                    <td className="whitespace-nowrap text-right tabular-nums">
                      {formatCurrency(line.costPrice || 0)}
                    </td>
                    <td className="text-right">
                      <Input
                        type="number"
                        min={0}
                        step={0.1}
                        className="ml-auto h-8 w-20 px-2 text-right tabular-nums"
                        value={String(line.marginPercent ?? "")}
                        onChange={(event) => {
                          const next = event.target.value;
                          updateLine(index, {
                            marginPercent: next === "" ? defaultMargin : Number(next),
                          });
                        }}
                        disabled={disabled}
                      />
                    </td>
                    <td className="whitespace-nowrap text-right font-medium tabular-nums">
                      {formatCurrency(unitPrice)}
                    </td>
                    <td className="whitespace-nowrap text-center tabular-nums text-sm text-[var(--color-text-inverse)]">
                      {line.unitsPerCase ?? "—"}
                    </td>
                    <td className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:border-red-300"
                        onClick={() => removeLine(index)}
                        disabled={disabled}
                        title="Xóa dòng">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        {filteredIndices.map((index) => {
          const line = lines[index];
          const unitPrice = calculateUnitPrice(
            line.costPrice,
            line.marginPercent
          );
          return (
            <div
              key={`${line.productId}-${index}`}
              className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="whitespace-pre-line break-words text-sm font-semibold">
                    {index + 1}. {line.name}
                  </p>
                  {line.sku ? (
                    <p className="mt-1 whitespace-pre-line break-words text-xs text-[var(--color-text-inverse)]">
                      SKU: {line.sku}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:border-red-300"
                  onClick={() => removeLine(index)}
                  disabled={disabled}
                  title="Xóa dòng">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-2 space-y-1">
                <label className="text-xs text-[var(--color-text-inverse)]">
                  Hoạt chất
                </label>
                <Textarea
                  value={line.activeIngredient || ""}
                  onChange={(event) =>
                    updateLine(index, { activeIngredient: event.target.value })
                  }
                  placeholder="Hoạt chất..."
                  className="min-h-[96px] w-full resize-y text-sm"
                  disabled={disabled}
                />
              </div>

              <div className="mt-2 space-y-1">
                <label className="text-xs text-[var(--color-text-inverse)]">
                  % LN
                </label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  className="h-9 tabular-nums"
                  value={String(line.marginPercent ?? "")}
                  onChange={(event) => {
                    const next = event.target.value;
                    updateLine(index, {
                      marginPercent: next === "" ? defaultMargin : Number(next),
                    });
                  }}
                  disabled={disabled}
                />
              </div>

              <div className="mt-2 space-y-1">
                <label className="text-xs text-[var(--color-text-inverse)]">
                  Công dụng
                </label>
                <Textarea
                  value={line.application || ""}
                  onChange={(event) =>
                    updateLine(index, { application: event.target.value })
                  }
                  placeholder="Công dụng..."
                  className="min-h-[96px] w-full resize-y text-sm"
                  disabled={disabled}
                />
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-inverse)]">
                  Giá vốn {formatCurrency(line.costPrice || 0)}
                </span>
                <span className="text-base font-semibold">Đơn giá {formatCurrency(unitPrice)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}