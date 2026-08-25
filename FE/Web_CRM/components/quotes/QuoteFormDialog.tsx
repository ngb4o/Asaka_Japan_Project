"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SearchableSelect,
  type SelectOption,
} from "@/components/ui/searchable-select";
import { useToast } from "@/components/providers/ToastProvider";
import { ApiClientError } from "@/lib/api/client";
import { getDealers } from "@/lib/api/dealers";
import { getProducts } from "@/lib/api/products";
import {
  calculateLineTotal,
  QuoteLineTable,
} from "@/components/quotes/QuoteLineTable";
import { formatCurrency } from "@/lib/utils";
import type { Dealer, PaginatedResult, Product } from "@/lib/types";
import type { Quote, QuoteFormPayload, QuoteLine } from "@/types/quote";

export type QuoteFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Quote | null;
  onSubmit: (payload: QuoteFormPayload) => Promise<void>;
};

const EMPTY_FORM = {
  name: "",
  defaultMarginPercent: 30,
  dealerIds: [] as string[],
  lines: [] as QuoteLine[],
};

function productToLine(product: Product): QuoteLine {
  return {
    productId: product.id,
    name: product.name,
    sku: product.sku,
    activeIngredient: product.activeIngredient || "",
    application: product.application || "",
    unitsPerCase: product.unitsPerCase || 1,
    costPrice: Number(product.costPrice) || 0,
    quantity: 1,
    marginPercent: 30,
  };
}

export function QuoteFormDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
}: QuoteFormDialogProps) {
  const toast = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [lineSearch, setLineSearch] = useState("");

  useEffect(() => {
    if (!open) {
      setLineSearch("");
      return;
    }

    if (editing) {
      setForm({
        name: editing.name || "",
        defaultMarginPercent: Number(editing.defaultMarginPercent) || 0,
        dealerIds: [...(editing.dealerIds || [])],
        lines: (editing.lines || []).map((line) => ({ ...line })),
      });
    } else {
      setForm({ ...EMPTY_FORM });
      setLineSearch("");
    }
  }, [open, editing]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingData(true);

    Promise.all([
      getProducts({ limit: 200, page: 1 }).catch(() => null),
      getDealers({ limit: 200, page: 1 }).catch(() => null),
    ])
      .then(([productsResult, dealersResult]) => {
        if (cancelled) return;
        const pResult = productsResult as PaginatedResult<Product> | null;
        const dResult = dealersResult as PaginatedResult<Dealer> | null;
        setProducts(pResult?.items || []);
        setDealers(dResult?.items || []);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          err instanceof ApiClientError ? err.message : "Không tải được dữ liệu"
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  const productOptions: SelectOption[] = useMemo(
    () =>
      products.map((product) => ({
        value: product.id,
        label: product.name,
        description: product.sku || product.activeIngredient || undefined,
      })),
    [products]
  );

  const dealerOptions: SelectOption[] = useMemo(
    () =>
      dealers.map((dealer) => ({
        value: dealer.id,
        label: dealer.name,
        description: dealer.phone || undefined,
      })),
    [dealers]
  );

  const selectedDealers = useMemo(
    () =>
      dealers.filter((dealer) => form.dealerIds.includes(dealer.id)),
    [dealers, form.dealerIds]
  );

  function handleAddProduct(productId: string) {
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setForm((prev) => {
      if (prev.lines.some((line) => line.productId === product.id)) {
        toast.info("Sản phẩm đã có trong báo giá");
        return prev;
      }
      const nextLine = productToLine(product);
      nextLine.marginPercent = prev.defaultMarginPercent;
      return {
        ...prev,
        lines: [...prev.lines, nextLine],
      };
    });
  }

  function handleAddAllProducts() {
    if (products.length === 0) {
      toast.info("Chưa có sản phẩm để thêm");
      return;
    }
    setForm((prev) => {
      const existingIds = new Set(prev.lines.map((line) => line.productId));
      const newLines = products
        .filter((product) => !existingIds.has(product.id))
        .map((product) => {
          const line = productToLine(product);
          line.marginPercent = prev.defaultMarginPercent;
          return line;
        });
      if (newLines.length === 0) {
        toast.info("Tất cả sản phẩm đã có trong báo giá");
        return prev;
      }
      return {
        ...prev,
        lines: [...prev.lines, ...newLines],
      };
    });
  }

  function handleAddDealer(dealerId: string) {
    if (!dealerId) return;
    setForm((prev) =>
      prev.dealerIds.includes(dealerId)
        ? prev
        : { ...prev, dealerIds: [...prev.dealerIds, dealerId] }
    );
  }

  function handleRemoveDealer(dealerId: string) {
    setForm((prev) => ({
      ...prev,
      dealerIds: prev.dealerIds.filter((id) => id !== dealerId),
    }));
  }

  const grandTotal = useMemo(
    () =>
      form.lines.reduce(
        (sum, line) =>
          sum +
          calculateLineTotal(
            line.costPrice,
            line.marginPercent,
            line.quantity
          ),
        0
      ),
    [form.lines]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập tên báo giá");
      return;
    }
    if (form.lines.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }

    setSubmitting(true);
    try {
      const payload: QuoteFormPayload = {
        name: form.name.trim(),
        description: "",
        defaultMarginPercent: Number(form.defaultMarginPercent) || 0,
        dealerIds: form.dealerIds,
        lines: form.lines.map((line) => ({
          productId: line.productId,
          name: line.name,
          sku: line.sku || "",
          activeIngredient: line.activeIngredient || "",
          application: line.application || "",
          unitsPerCase: line.unitsPerCase || 1,
          costPrice: Number(line.costPrice) || 0,
          quantity: Math.max(1, Number(line.quantity) || 1),
          marginPercent: Number(line.marginPercent) || 0,
        })),
      };
      await onSubmit(payload);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Sửa báo giá" : "Tạo báo giá"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quote-name">Tên báo giá *</Label>
              <Input
                id="quote-name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Bảng giá Đại lý Tây Nam Bộ — T8/2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-margin">% Lợi nhuận mặc định *</Label>
              <Input
                id="quote-margin"
                type="number"
                min={0}
                step={0.1}
                value={String(form.defaultMarginPercent ?? 0)}
                onChange={(event) => {
                  const next = event.target.value;
                  const nextMargin = next === "" ? 0 : Number(next);
                  setForm((prev) => ({
                    ...prev,
                    defaultMarginPercent: nextMargin,
                    lines: prev.lines.map((line) => ({
                      ...line,
                      marginPercent: nextMargin,
                    })),
                  }));
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Đại lý áp dụng</Label>
            <SearchableSelect
              options={[
                { value: "", label: "Chọn đại lý để thêm" },
                ...dealerOptions,
              ]}
              value=""
              onChange={handleAddDealer}
              selectedValues={form.dealerIds}
              placeholder="Chọn đại lý để thêm"
              searchPlaceholder="Tìm đại lý..."
              searchable
              clearable={false}
            />
            {selectedDealers.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedDealers.map((dealer) => (
                  <span
                    key={dealer.id}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-xs">
                    {dealer.name}
                    <button
                      type="button"
                      aria-label={`Xóa ${dealer.name}`}
                      className="text-[var(--color-text-inverse)] hover:text-red-600"
                      onClick={() => handleRemoveDealer(dealer.id)}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="m-0">Chọn sản phẩm</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAllProducts}
                disabled={loadingData || products.length === 0}
                title="Thêm toàn bộ sản phẩm đang hiển thị">
                <Plus className="h-3.5 w-3.5" />
                Chọn tất cả
              </Button>
            </div>
            <SearchableSelect
              options={[
                { value: "", label: "Chọn sản phẩm để thêm" },
                ...productOptions,
              ]}
              value=""
              onChange={handleAddProduct}
              selectedValues={form.lines.map((line) => line.productId)}
              placeholder="Chọn sản phẩm để thêm"
              searchPlaceholder="Tìm sản phẩm, SKU, hoạt chất..."
              searchable
              clearable={false}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
            </div>
            {form.lines.length > 0 ? (
              <SearchInput
                placeholder="Tìm sản phẩm trong bảng..."
                value={lineSearch}
                onSearch={setLineSearch}
                className="w-full"
              />
            ) : null}
            <QuoteLineTable
              lines={form.lines}
              defaultMargin={form.defaultMarginPercent}
              onChange={(next) => setForm({ ...form, lines: next })}
              disabled={submitting}
              search={lineSearch}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}>
              Hủy
            </Button>
            <Button type="submit" loading={submitting || loadingData}>
              <Plus className="h-4 w-4" />
              Lưu báo giá
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}