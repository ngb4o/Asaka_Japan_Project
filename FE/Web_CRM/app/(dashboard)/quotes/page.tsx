"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LineItemsField,
  buildLineItemsPayload,
  validateLineItems,
  type LineItemFormRow,
} from "@/components/sales/LineItemsField";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { SearchableSelect, STATUS_OPTIONS } from "@/components/ui/searchable-select";
import { getDealers } from "@/lib/api/dealers";
import { getProducts } from "@/lib/api/products";
import {
  convertQuoteToOrder,
  createQuote,
  deleteQuote,
  getQuotes,
  updateQuote,
} from "@/lib/api/quotes";
import { getWarehouses } from "@/lib/api/warehouses";
import type { Dealer, Product, Quote } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE, shouldReloadPreviousPage } from "@/lib/pagination";
import { formatCurrency } from "@/lib/utils";

type QuoteFormValues = {
  dealerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  status: Quote["status"];
  note: string;
  items: LineItemFormRow[];
};

const EMPTY_FORM: QuoteFormValues = {
  dealerId: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  status: "draft",
  note: "",
  items: [],
};

const STATUS_LABELS: Record<Quote["status"], string> = {
  draft: "Nháp",
  sent: "Đã gửi",
  accepted: "Chấp nhận",
  rejected: "Từ chối",
  expired: "Hết hạn",
};

export default function QuotesPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<Quote[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [converting, setConverting] = useState<Quote | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [form, setForm] = useState<QuoteFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [quotesResult, dealersResult, productsResult, warehousesResult] =
        await Promise.all([
          getQuotes({ search: search || undefined, page, limit: DEFAULT_PAGE_SIZE }),
          getDealers({ limit: 100, page: 1 }),
          getProducts({ limit: 100, page: 1, status: "active" }),
          getWarehouses({ limit: 100, page: 1 }),
        ]);
      setItems(quotesResult.items);
      setDealers(dealersResult.items);
      setProducts(productsResult.items);
      setWarehouses(warehousesResult.items);
      if (shouldReloadPreviousPage(quotesResult, page)) {
        setPage(quotesResult.totalPages);
        return;
      }
      setPage(quotesResult.page);
      setTotal(quotesResult.total);
      setTotalPages(quotesResult.totalPages);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  }, [search, page, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      items: products[0]
        ? [{ productId: products[0].id, quantity: 1, unitPrice: products[0].price }]
        : [],
    });
    setDialogOpen(true);
  }

  function openEdit(item: Quote) {
    setEditing(item);
    setForm({
      dealerId: item.dealerId || "",
      customerName: item.customerName,
      customerPhone: item.customerPhone,
      customerEmail: item.customerEmail,
      status: item.status,
      note: item.note,
      items: item.items.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const lineError = validateLineItems(form.items);
    if (lineError) {
      toast.warning(lineError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        dealerId: form.dealerId || undefined,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim(),
        status: form.status,
        note: form.note.trim(),
        items: buildLineItemsPayload(form.items),
      };

      if (editing) {
        await updateQuote(editing.id, payload);
        toast.success("Đã cập nhật báo giá");
      } else {
        await createQuote(payload);
        toast.success("Đã tạo báo giá");
      }
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: Quote) {
    const confirmed = await confirm({
      title: "Xóa báo giá",
      description: `Xóa báo giá "${item.code}"?`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteQuote(item.id);
      toast.success("Đã xóa báo giá");
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    }
  }

  async function handleConvert() {
    if (!converting) return;
    setSubmitting(true);
    try {
      await convertQuoteToOrder(converting.id, {
        warehouseId: warehouseId || undefined,
      });
      toast.success("Đã chuyển báo giá thành đơn hàng");
      setConvertOpen(false);
      setConverting(null);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Chuyển đổi thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.warehouses} />;
  }

  const dealerOptions = [
    { value: "", label: "Không chọn đại lý" },
    ...dealers.map((dealer) => ({ value: dealer.id, label: dealer.name })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Báo giá</h1>
          <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
            Tạo và quản lý báo giá cho khách hàng/đại lý
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tạo báo giá
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách báo giá</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Tìm theo mã, khách hàng..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có báo giá</p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                      <th className="px-2 py-3 font-medium">Mã</th>
                      <th className="px-2 py-3 font-medium">Khách/Đại lý</th>
                      <th className="px-2 py-3 font-medium">Tổng</th>
                      <th className="px-2 py-3 font-medium">Trạng thái</th>
                      <th className="px-2 py-3 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                        <td className="px-2 py-3 font-medium">{item.code}</td>
                        <td className="px-2 py-3">
                          <p>{item.dealerName || item.customerName || "—"}</p>
                          {item.customerPhone ? (
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              {item.customerPhone}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-2 py-3">{formatCurrency(item.total)}</td>
                        <td className="px-2 py-3">
                          <Badge variant={item.status === "accepted" ? "success" : "muted"}>
                            {STATUS_LABELS[item.status]}
                          </Badge>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-2">
                            {!item.orderId ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEdit(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setConverting(item);
                                    setWarehouseId(warehouses[0]?.id || "");
                                    setConvertOpen(true);
                                  }}
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(item)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Badge variant="success">Đã có đơn</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={DEFAULT_PAGE_SIZE}
                onPageChange={setPage}
                disabled={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa báo giá" : "Tạo báo giá"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Đại lý</Label>
              <SearchableSelect
                options={dealerOptions}
                value={form.dealerId}
                onChange={(value) => setForm({ ...form, dealerId: value })}
                searchable
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="customerName">Tên khách</Label>
                <Input
                  id="customerName"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">SĐT</Label>
                <Input
                  id="customerPhone"
                  value={form.customerPhone}
                  onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                />
              </div>
            </div>
            <LineItemsField
              items={form.items}
              products={products}
              onChange={(items) => setForm({ ...form, items })}
            />
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <SearchableSelect
                options={STATUS_OPTIONS.quote}
                value={form.status}
                onChange={(value) => setForm({ ...form, status: value as Quote["status"] })}
                searchable={false}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                id="note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chuyển thành đơn hàng</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-inverse)]">
              Chuyển báo giá {converting?.code} thành đơn hàng mới.
            </p>
            <div className="space-y-2">
              <Label>Kho xuất (tùy chọn)</Label>
              <SearchableSelect
                options={[
                  { value: "", label: "Chưa chọn kho" },
                  ...warehouses.map((w) => ({ value: w.id, label: w.name })),
                ]}
                value={warehouseId}
                onChange={setWarehouseId}
                searchable={false}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConvertOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleConvert} disabled={submitting}>
                {submitting ? "Đang chuyển..." : "Chuyển đổi"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
