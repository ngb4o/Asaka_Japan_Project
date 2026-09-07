"use client";

import { useMemo, useState } from "react";
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

export function calculateMarginFromPrice(costPrice: number, unitPrice: number) {
  const cost = Number(costPrice) || 0;
  const price = Number(unitPrice) || 0;
  if (cost <= 0 || price <= 0) return 0;
  return Math.round(((price - cost) / cost) * 1000) / 10;
}

export function calculateLineTotal(
  costPrice: number,
  marginPercent: number,
  quantity: number,
  overrideUnitPrice?: number | null
) {
  const unitPrice = overrideUnitPrice ?? calculateUnitPrice(costPrice, marginPercent);
  return unitPrice * (quantity || 0);
}

export function QuoteLineTable({
  lines,
  defaultMargin,
  onChange,
  disabled,
  search,
}: QuoteLineTableProps) {
  const keyword = (search || "").trim().toLowerCase();
  const [editingPriceRow, setEditingPriceRow] = useState<number | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");

  const sortedLines = useMemo(() => {
    const indexed = lines.map((line, i) => ({ line, originalIndex: i }));
    indexed.sort((a, b) => {
      const aCat = (a.line.categoryName || "").toLowerCase();
      const bCat = (b.line.categoryName || "").toLowerCase();
      if (aCat !== bCat) return aCat.localeCompare(bCat, "vi");
      return a.originalIndex - b.originalIndex;
    });
    return indexed;
  }, [lines]);

  const filteredIndices = useMemo(() => {
    if (!keyword) return sortedLines.map((s) => s.originalIndex);
    return sortedLines
      .filter(({ line }) => {
        const haystack = [
          line.name || "",
          line.sku || "",
          line.activeIngredient || "",
          line.application || "",
          line.categoryName || "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      })
      .map((s) => s.originalIndex);
  }, [sortedLines, keyword]);

  function updateLine(index: number, patch: Partial<QuoteLine>) {
    onChange(
      lines.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  }

  function removeLine(index: number) {
    onChange(lines.filter((_, i) => i !== index));
  }

  const visibleRows = useMemo(() => {
    const rows: Array<
      | { kind: "group"; categoryName: string; key: string }
      | { kind: "line"; line: QuoteLine; index: number; stt: number; key: string }
    > = [];
    let stt = 0;
    let lastCategory = "";
    for (const index of filteredIndices) {
      const line = lines[index];
      const cat = line.categoryName || "Chưa phân loại";
      if (cat !== lastCategory) {
        rows.push({ kind: "group", categoryName: cat, key: `g-${cat}-${rows.length}` });
        lastCategory = cat;
      }
      stt += 1;
      rows.push({
        kind: "line",
        line,
        index,
        stt,
        key: `${line.productId}-${index}`,
      });
    }
    return rows;
  }, [filteredIndices, lines]);

  const DesktopRow = ({
    line,
    index,
    stt,
  }: {
    line: QuoteLine;
    index: number;
    stt: number;
  }) => {
    const unitPrice = line.overrideUnitPrice ?? calculateUnitPrice(
      line.costPrice,
      line.marginPercent
    );
    return (
      <tr key={`${line.productId}-${index}`}>
        <td className="tabular-nums text-[var(--color-text-inverse)]">{stt}</td>
        <td className="w-[260px] min-w-[260px] align-top">
          <Textarea
            value={line.name || ""}
            onChange={(event) => updateLine(index, { name: event.target.value })}
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
              updateLine(index, { activeIngredient: event.target.value })
            }
            placeholder="Hoạt chất..."
            className="min-h-[88px] w-full resize-y text-sm"
            disabled={disabled}
          />
        </td>
        <td className="min-w-[260px] align-top">
          <Textarea
            value={line.application || ""}
            onChange={(event) => updateLine(index, { application: event.target.value })}
            placeholder="Công dụng..."
            className="min-h-[88px] w-full resize-y text-sm"
            disabled={disabled}
          />
        </td>
        <td className="whitespace-nowrap text-right tabular-nums">
          {formatCurrency(line.costPrice || 0)}
        </td>
        <td className="whitespace-nowrap text-right tabular-nums">
          {line.overrideUnitPrice != null ? (
            <div className="flex items-center justify-end gap-1">
              <span className="italic text-blue-600">
                {calculateMarginFromPrice(line.costPrice, line.overrideUnitPrice).toFixed(1)}
              </span>
              <button
                className="ml-1 cursor-pointer rounded px-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Xóa đơn giá tùy chỉnh, quay về tính từ %"
                onClick={() => updateLine(index, { overrideUnitPrice: null })}
                disabled={disabled}
              >
                ✕
              </button>
            </div>
          ) : (
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
                  overrideUnitPrice: null,
                });
              }}
              disabled={disabled}
            />
          )}
        </td>
        <td className="whitespace-nowrap text-right font-medium tabular-nums">
          {editingPriceRow === index ? (
            <Input
              type="number"
              min={0}
              className="h-8 w-28 px-2 text-right tabular-nums"
              value={editingPriceValue}
              autoFocus
              onChange={(e) => setEditingPriceValue(e.target.value)}
              onBlur={() => {
                const price = Number(editingPriceValue);
                if (!isNaN(price) && price > 0) {
                  updateLine(index, { overrideUnitPrice: price });
                } else {
                  updateLine(index, { overrideUnitPrice: null });
                }
                setEditingPriceRow(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const price = Number(editingPriceValue);
                  if (!isNaN(price) && price > 0) {
                    updateLine(index, { overrideUnitPrice: price });
                  } else {
                    updateLine(index, { overrideUnitPrice: null });
                  }
                  setEditingPriceRow(null);
                }
                if (e.key === "Escape") {
                  setEditingPriceRow(null);
                }
              }}
            />
          ) : (
            <button
              className="cursor-pointer rounded px-1 hover:bg-[var(--color-surface-muted)]"
              onClick={() => {
                setEditingPriceRow(index);
                setEditingPriceValue(String(unitPrice));
              }}
              disabled={disabled}
            >
              {formatCurrency(unitPrice)}
            </button>
          )}
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
            title="Xóa dòng"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
    );
  };

  const MobileRow = ({
    line,
    index,
  }: {
    line: QuoteLine;
    index: number;
  }) => {
    const unitPrice = line.overrideUnitPrice ?? calculateUnitPrice(
      line.costPrice,
      line.marginPercent
    );
    return (
      <div
        key={`${line.productId}-${index}`}
        className="w-full min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3"
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Input
              value={line.name || ""}
              onChange={(event) => updateLine(index, { name: event.target.value })}
              placeholder="Tên sản phẩm..."
              className="h-10 w-full min-w-0 text-sm font-semibold"
              disabled={disabled}
            />
            {line.sku ? (
              <p className="truncate text-xs text-[var(--color-text-inverse)]">
                SKU: {line.sku}
              </p>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-0.5 h-10 w-10 shrink-0 p-0 text-red-500 hover:border-red-300 hover:bg-red-50"
            onClick={() => removeLine(index)}
            disabled={disabled}
            title="Xóa dòng"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="col-span-2 space-y-1">
            <span className="text-xs text-[var(--color-text-inverse)]">Hoạt chất</span>
            <Textarea
              rows={2}
              value={line.activeIngredient || ""}
              onChange={(event) =>
                updateLine(index, { activeIngredient: event.target.value })
              }
              placeholder="Hoạt chất..."
              className="min-h-[56px] w-full resize-y py-2 text-sm"
              disabled={disabled}
            />
          </label>
          <label className="col-span-2 space-y-1">
            <span className="text-xs text-[var(--color-text-inverse)]">Công dụng</span>
            <Textarea
              rows={2}
              value={line.application || ""}
              onChange={(event) =>
                updateLine(index, { application: event.target.value })
              }
              placeholder="Công dụng..."
              className="min-h-[56px] w-full resize-y py-2 text-sm"
              disabled={disabled}
            />
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--color-border-subtle)] pt-3">
          <div>
            <p className="text-xs text-[var(--color-text-inverse)]">Giá vốn</p>
            <p className="mt-0.5 text-sm font-medium tabular-nums">
              {formatCurrency(line.costPrice || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-inverse)]">% Lợi nhuận</p>
            {line.overrideUnitPrice != null ? (
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="text-sm font-medium italic text-blue-600">
                  {calculateMarginFromPrice(
                    line.costPrice,
                    line.overrideUnitPrice
                  ).toFixed(1)}
                  %
                </span>
                <button
                  type="button"
                  className="text-xs text-[var(--color-text-inverse)]"
                  title="Xóa đơn giá tùy chỉnh"
                  onClick={() => updateLine(index, { overrideUnitPrice: null })}
                  disabled={disabled}
                >
                  ✕
                </button>
              </div>
            ) : (
              <Input
                type="number"
                min={0}
                step={0.1}
                className="mt-1 h-9 w-full min-w-0 tabular-nums"
                value={String(line.marginPercent ?? "")}
                onChange={(event) => {
                  const next = event.target.value;
                  updateLine(index, {
                    marginPercent: next === "" ? defaultMargin : Number(next),
                    overrideUnitPrice: null,
                  });
                }}
                disabled={disabled}
              />
            )}
          </div>
          <div className="col-span-2">
            <p className="text-xs text-[var(--color-text-inverse)]">Đơn giá</p>
            {editingPriceRow === index ? (
              <Input
                type="number"
                min={0}
                className="mt-1 h-9 w-full tabular-nums"
                value={editingPriceValue}
                autoFocus
                onChange={(e) => setEditingPriceValue(e.target.value)}
                onBlur={() => {
                  const price = Number(editingPriceValue);
                  if (!isNaN(price) && price > 0) {
                    updateLine(index, { overrideUnitPrice: price });
                  } else {
                    updateLine(index, { overrideUnitPrice: null });
                  }
                  setEditingPriceRow(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const price = Number(editingPriceValue);
                    if (!isNaN(price) && price > 0) {
                      updateLine(index, { overrideUnitPrice: price });
                    } else {
                      updateLine(index, { overrideUnitPrice: null });
                    }
                    setEditingPriceRow(null);
                  }
                  if (e.key === "Escape") {
                    setEditingPriceRow(null);
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="mt-0.5 text-left text-base font-semibold tabular-nums text-[var(--color-text-secondary)]"
                onClick={() => {
                  setEditingPriceRow(index);
                  setEditingPriceValue(String(unitPrice));
                }}
                disabled={disabled}
              >
                {formatCurrency(unitPrice)}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

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
                <th className="text-right font-medium">% Lợi nhuận</th>
                <th className="text-right font-medium">Đơn giá</th>
                <th className="text-right font-medium">SL/thùng</th>
                <th className="text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                if (row.kind === "group") {
                  return (
                    <tr key={row.key} className="bg-[var(--color-surface-muted)]">
                      <td
                        colSpan={9}
                        className="border-y border-[var(--color-border-subtle)] px-3 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-[var(--color-text-primary)]"
                      >
                        {row.categoryName}
                      </td>
                    </tr>
                  );
                }
                return (
                  <DesktopRow
                    key={row.key}
                    line={row.line}
                    index={row.index}
                    stt={row.stt}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-full min-w-0 space-y-2 lg:hidden">
        {visibleRows.map((row) => {
          if (row.kind === "group") {
            return (
              <div
                key={row.key}
                className="rounded-md bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[var(--color-text-primary)]"
              >
                {row.categoryName}
              </div>
            );
          }
          return <MobileRow key={row.key} line={row.line} index={row.index} />;
        })}
      </div>
    </div>
  );
}