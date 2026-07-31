"use client";

import { Plus, Trash2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VndInput } from "@/components/ui/vnd-input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export type LineItemFormRow = {
  productId: string;
  quantity: number | "";
  unitPrice: number | "";
};

type LineItemsFieldProps = {
  items: LineItemFormRow[];
  products: Product[];
  onChange: (items: LineItemFormRow[]) => void;
};

export function LineItemsField({ items, products, onChange }: LineItemsFieldProps) {
  const productOptions = products.map((product) => ({
    value: product.id,
    label: product.name,
    description: formatCurrency(product.price),
  }));

  function updateRow(index: number, patch: Partial<LineItemFormRow>) {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));

    if (patch.productId) {
      const product = products.find((entry) => entry.id === patch.productId);
      if (product && !next[index].unitPrice) {
        next[index].unitPrice = product.price;
      }
    }

    onChange(next);
  }

  function addRow() {
    onChange([
      ...items,
      {
        productId: products[0]?.id || "",
        quantity: 1,
        unitPrice: products[0]?.price || "",
      },
    ]);
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Sản phẩm *</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Thêm dòng
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-inverse)]">Chưa có sản phẩm</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const lineTotal =
              (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);

            return (
              <div
                key={index}
                className="space-y-3 rounded-lg border border-[var(--color-border-subtle)] p-3 md:grid md:grid-cols-[minmax(0,1fr)_5.5rem_8.5rem_2.5rem] md:items-end md:gap-3 md:space-y-0"
              >
                <div className="min-w-0 space-y-1.5">
                  <Label className="text-xs text-[var(--color-text-inverse)] md:sr-only">
                    Sản phẩm
                  </Label>
                  <SearchableSelect
                    options={productOptions}
                    value={item.productId}
                    onChange={(value) => updateRow(index, { productId: value })}
                    placeholder="Chọn sản phẩm"
                  />
                </div>

                <div className="grid grid-cols-[1fr_1.4fr_auto] items-end gap-2 md:contents">
                  <div className="min-w-0 space-y-1.5">
                    <Label className="text-xs text-[var(--color-text-inverse)] md:sr-only">
                      SL
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(e) =>
                        updateRow(index, {
                          quantity: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="SL"
                    />
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <Label className="text-xs text-[var(--color-text-inverse)] md:sr-only">
                      Đơn giá
                    </Label>
                    <VndInput
                      value={item.unitPrice}
                      onValueChange={(unitPrice) => updateRow(index, { unitPrice })}
                      placeholder="Đơn giá"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="h-10 w-10 shrink-0 gap-0 p-0"
                    onClick={() => removeRow(index)}
                    aria-label="Xóa dòng"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                  </Button>
                </div>

                <p className="text-right text-xs text-[var(--color-text-inverse)] md:hidden">
                  Thành tiền:{" "}
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {formatCurrency(lineTotal)}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-right text-sm font-medium">
        Tạm tính: {formatCurrency(subtotal)}
      </p>
    </div>
  );
}

export function validateLineItems(items: LineItemFormRow[]): string | null {
  if (!items.length) return "Vui lòng thêm ít nhất một sản phẩm";
  for (const item of items) {
    if (!item.productId) return "Vui lòng chọn sản phẩm";
    if (item.quantity === "" || Number(item.quantity) <= 0) {
      return "Số lượng phải lớn hơn 0";
    }
    if (item.unitPrice === "" || Number(item.unitPrice) < 0) {
      return "Đơn giá không hợp lệ";
    }
  }
  return null;
}

export function buildLineItemsPayload(items: LineItemFormRow[]) {
  return items.map((item) => ({
    productId: item.productId,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
  }));
}
