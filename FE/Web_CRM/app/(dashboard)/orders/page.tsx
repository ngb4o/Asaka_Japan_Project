"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  createOrder,
  deleteOrder,
  getOrders,
  updateOrder,
} from "@/lib/api/orders";
import { getProducts } from "@/lib/api/products";
import { getWarehouses } from "@/lib/api/warehouses";
import type { Dealer, Order, Product } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE, shouldReloadPreviousPage } from "@/lib/pagination";
import { formatCurrency } from "@/lib/utils";

type OrderFormValues = {
  dealerId: string;
  warehouseId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  status: Order["status"];
  note: string;
  items: LineItemFormRow[];
};

const EMPTY_FORM: OrderFormValues = {
  dealerId: "",
  warehouseId: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  status: "pending",
  note: "",
  items: [],
};

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  delivering: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Hủy",
};

export default function OrdersPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<Order[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState<OrderFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersResult, dealersResult, productsResult, warehousesResult] =
        await Promise.all([
          getOrders({ search: search || undefined, page, limit: DEFAULT_PAGE_SIZE }),
          getDealers({ limit: 100, page: 1 }),
          getProducts({ limit: 100, page: 1, status: "active" }),
          getWarehouses({ limit: 100, page: 1 }),
        ]);
      setItems(ordersResult.items);
      setDealers(dealersResult.items);
      setProducts(productsResult.items);
      setWarehouses(warehousesResult.items);
      if (shouldReloadPreviousPage(ordersResult, page)) {
        setPage(ordersResult.totalPages);
        return;
      }
      setPage(ordersResult.page);
      setTotal(ordersResult.total);
      setTotalPages(ordersResult.totalPages);
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
      warehouseId: warehouses[0]?.id || "",
      items: products[0]
        ? [{ productId: products[0].id, quantity: 1, unitPrice: products[0].price }]
        : [],
    });
    setDialogOpen(true);
  }

  function openEdit(item: Order) {
    setEditing(item);
    setForm({
      dealerId: item.dealerId || "",
      warehouseId: item.warehouseId || "",
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

    if (form.status === "confirmed" && !form.warehouseId) {
      toast.warning("Vui lòng chọn kho trước khi xác nhận đơn hàng");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        dealerId: form.dealerId || undefined,
        warehouseId: form.warehouseId || undefined,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim(),
        status: form.status,
        note: form.note.trim(),
        ...(editing?.inventoryExported
          ? {}
          : { items: buildLineItemsPayload(form.items) }),
      };

      if (editing) {
        await updateOrder(editing.id, payload);
        toast.success("Đã cập nhật đơn hàng");
      } else {
        await createOrder(payload);
        toast.success("Đã tạo đơn hàng");
      }
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: Order) {
    const confirmed = await confirm({
      title: "Xóa đơn hàng",
      description: `Xóa đơn hàng "${item.code}"?`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteOrder(item.id);
      toast.success("Đã xóa đơn hàng");
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    }
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.warehouses} />;
  }

  const dealerOptions = [
    { value: "", label: "Không chọn đại lý" },
    ...dealers.map((dealer) => ({ value: dealer.id, label: dealer.name })),
  ];
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Đơn hàng</h1>
          <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
            Quản lý đơn hàng và xuất kho khi xác nhận
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tạo đơn hàng
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đơn hàng</CardTitle>
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
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có đơn hàng</p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                      <th className="px-2 py-3 font-medium">Mã</th>
                      <th className="px-2 py-3 font-medium">Khách/Đại lý</th>
                      <th className="px-2 py-3 font-medium">Kho</th>
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
                        </td>
                        <td className="px-2 py-3">{item.warehouseName || "—"}</td>
                        <td className="px-2 py-3">{formatCurrency(item.total)}</td>
                        <td className="px-2 py-3">
                          <Badge variant={item.status === "completed" ? "success" : "muted"}>
                            {STATUS_LABELS[item.status]}
                          </Badge>
                          {item.inventoryExported ? (
                            <p className="text-xs text-[var(--color-text-inverse)]">Đã xuất kho</p>
                          ) : null}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!item.inventoryExported ? (
                              <Button variant="danger" size="sm" onClick={() => handleDelete(item)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
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
            <DialogTitle>{editing ? "Sửa đơn hàng" : "Tạo đơn hàng"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Đại lý</Label>
                <SearchableSelect
                  options={dealerOptions}
                  value={form.dealerId}
                  onChange={(value) => setForm({ ...form, dealerId: value })}
                  searchable
                />
              </div>
              <div className="space-y-2">
                <Label>Kho xuất</Label>
                <SearchableSelect
                  options={warehouseOptions}
                  value={form.warehouseId}
                  onChange={(value) => setForm({ ...form, warehouseId: value })}
                  searchable={false}
                />
              </div>
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
                options={STATUS_OPTIONS.order}
                value={form.status}
                onChange={(value) => setForm({ ...form, status: value as Order["status"] })}
                searchable={false}
              />
            </div>
            {editing?.inventoryExported ? (
              <p className="text-sm text-[var(--color-text-inverse)]">
                Đơn đã xuất kho — không thể sửa sản phẩm/số lượng.
              </p>
            ) : null}
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
    </div>
  );
}
