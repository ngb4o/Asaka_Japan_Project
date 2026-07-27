"use client";

import { Plus, Trash2 } from "lucide-react";
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
      <div className="flex items-center justify-between">
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
          {items.map((item, index) => (
            <div
              key={index}
              className="grid items-center gap-3 rounded-lg border border-[var(--color-border-subtle)] p-3 md:grid-cols-[minmax(0,1fr)_100px_140px_2.5rem]"
            >
              <SearchableSelect
                options={productOptions}
                value={item.productId}
                onChange={(value) => updateRow(index, { productId: value })}
                placeholder="Chọn sản phẩm"
              />
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) =>
                  updateRow(index, {
                    quantity: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                placeholder="SL"
              />
              <VndInput
                value={item.unitPrice}
                onValueChange={(unitPrice) => updateRow(index, { unitPrice })}
                placeholder="Đơn giá"
              />
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="h-10 w-10 shrink-0 justify-self-end gap-0 p-0"
                onClick={() => removeRow(index)}
                aria-label="Xóa dòng"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
              </Button>
            </div>
          ))}
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
