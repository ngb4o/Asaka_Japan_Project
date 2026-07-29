"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AlertTriangle, PackageCheck, Pencil, Plus, Printer, Trash2 } from "lucide-react";
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
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VndInput } from "@/components/ui/vnd-input";
import {
  LineItemsField,
  buildLineItemsPayload,
  validateLineItems,
  type LineItemFormRow,
} from "@/components/sales/LineItemsField";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import {
  MobileMetaChip,
  MobileRecordCard,
} from "@/components/ui/mobile-record-card";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { SearchableSelect, STATUS_OPTIONS } from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  canEditOrderItems,
  canManageOrders,
  canManagePayments,
  canManageShipping,
} from "@/lib/auth/permissions";
import { getDealers } from "@/lib/api/dealers";
import {
  createOrder,
  deleteOrder,
  getOrders,
  recordOrderPayment,
  updateOrder,
} from "@/lib/api/orders";
import { getProducts } from "@/lib/api/products";
import { getWarehouseStocks } from "@/lib/api/inventory";
import { getWarehouses } from "@/lib/api/warehouses";
import { getImageUrl } from "@/lib/api/uploads";
import { printSalesDocument } from "@/lib/print/salesDocument";
import type { Dealer, Order, Product } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { formatCurrency, toDateValue } from "@/lib/utils";
import { statusBadgeVariant } from "@/lib/status-badge";

type OrderFormValues = {
  dealerId: string;
  warehouseId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  status: Order["status"];
  note: string;
  paymentStatus: Order["paymentStatus"];
  paidAmount: number | "";
  paymentNote: string;
  shippingAddress: string;
  shippingContactName: string;
  shippingPhone: string;
  carrier: string;
  trackingCode: string;
  shippingDate: string;
  deliveredAt: string;
  shippingFee: number | "";
  shippingNote: string;
  items: LineItemFormRow[];
};

type ConfirmationStockRow = {
  productId: string;
  productName: string;
  productImage: string;
  required: number;
  available: number;
};

const EMPTY_FORM: OrderFormValues = {
  dealerId: "",
  warehouseId: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  status: "pending",
  note: "",
  paymentStatus: "unpaid",
  paidAmount: 0,
  paymentNote: "",
  shippingAddress: "",
  shippingContactName: "",
  shippingPhone: "",
  carrier: "",
  trackingCode: "",
  shippingDate: "",
  deliveredAt: "",
  shippingFee: 0,
  shippingNote: "",
  items: [],
};

const STATUS_LABELS: Record<Order["status"], string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  delivering: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Hủy",
};

const PAYMENT_LABELS: Record<Order["paymentStatus"], string> = {
  unpaid: "Chưa thanh toán",
  partial: "Một phần",
  paid: "Đã thanh toán",
};

const PAYMENT_LABELS_SHORT: Record<Order["paymentStatus"], string> = {
  unpaid: "Chưa TT",
  partial: "Một phần",
  paid: "Đã TT",
};

function getAllowedStatusOptions(order: Order) {
  const allowed: Record<Order["status"], Order["status"][]> = {
    pending: ["pending", "confirmed", "cancelled"],
    confirmed: ["confirmed", "delivering", "completed", "cancelled"],
    delivering: ["delivering", "completed", "cancelled"],
    completed: ["completed"],
    cancelled: ["cancelled"],
  };

  return STATUS_OPTIONS.order.filter((option) =>
    allowed[order.status].includes(option.value as Order["status"])
  );
}

function toDateInput(value?: string | null) {
  return toDateValue(value);
}

export default function OrdersPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const role = user?.role;
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentNote, setPaymentNote] = useState("");
  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState<OrderFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState<Order | null>(null);
  const [confirmationStocks, setConfirmationStocks] = useState<ConfirmationStockRow[]>([]);
  const [loadingConfirmation, setLoadingConfirmation] = useState(false);

  const fetchPage = useCallback(
    (pageNum: number) =>
      getOrders({
        search: search || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [search]
  );

  const onError = useCallback(
    (err: unknown) => {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được dữ liệu"
      );
    },
    [toast]
  );

  const {
    items,
    page,
    total,
    totalPages,
    loading,
    loadingMore,
    hasMore,
    reload,
    refresh,
    loadMore,
    goToPage,
  } = useMobilePagedList<Order>({ fetchPage, onError });

  const loadAuxData = useCallback(async () => {
    try {
      const [dealersResult, productsResult, warehousesResult] = await Promise.all([
        getDealers({ limit: 100, page: 1 }),
        getProducts({ limit: 100, page: 1, status: "active" }),
        getWarehouses({ limit: 100, page: 1 }),
      ]);
      setDealers(dealersResult.items);
      setProducts(productsResult.items);
      setWarehouses(warehousesResult.items);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được dữ liệu"
      );
    }
  }, [toast]);

  useEffect(() => {
    void reload();
    // Reload when filter query changes (fetchPage identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  useEffect(() => {
    void loadAuxData();
  }, [loadAuxData]);

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
      paymentStatus: item.paymentStatus || "unpaid",
      paidAmount: item.paidAmount || 0,
      paymentNote: item.paymentNote || "",
      shippingAddress: item.shippingAddress || "",
      shippingContactName: item.shippingContactName || "",
      shippingPhone: item.shippingPhone || "",
      carrier: item.carrier || "",
      trackingCode: item.trackingCode || "",
      shippingDate: toDateInput(item.shippingDate),
      deliveredAt: toDateInput(item.deliveredAt),
      shippingFee: item.shippingFee || 0,
      shippingNote: item.shippingNote || "",
      items: item.items.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    });
    setDialogOpen(true);
  }

  async function handlePrint(item: Order) {
    try {
      const paid = item.paidAmount || 0;
      const remaining =
        item.remainingAmount ?? Math.max(0, (item.total || 0) - paid);
      const paymentStatus = item.paymentStatus || "unpaid";

      const paymentMeta = [
        {
          label: "Thanh toán",
          value: PAYMENT_LABELS[paymentStatus],
        },
        {
          label: "Đã thu",
          value: formatCurrency(paid),
        },
      ];

      if (paymentStatus === "partial") {
        paymentMeta.push({
          label: "Còn lại",
          value: formatCurrency(remaining),
        });
      }

      const hasDebt = remaining > 0;

      const extraRows = [
        ...(item.shippingFee
          ? [{ label: "Phí giao hàng", value: formatCurrency(item.shippingFee) }]
          : []),
        ...(hasDebt && paid > 0
          ? [{ label: "Tổng đơn", value: formatCurrency(item.total) }]
          : []),
        ...(paid > 0
          ? [{ label: "Đã thu", value: formatCurrency(paid) }]
          : []),
      ];

      await printSalesDocument({
        title: "ĐƠN HÀNG",
        code: item.code,
        meta: [
          { label: "Trạng thái", value: STATUS_LABELS[item.status] },
          ...paymentMeta,
          { label: "Kho", value: item.warehouseName || "—" },
          {
            label: "Ngày tạo",
            value: new Date(item.createdAt).toLocaleDateString("vi-VN"),
          },
        ],
        customer: [
          {
            label: "Đại lý/Khách",
            value: item.dealerName || item.customerName || "—",
          },
          {
            label: "SĐT",
            value: item.customerPhone || item.shippingPhone || "—",
          },
          { label: "Địa chỉ giao", value: item.shippingAddress || "—" },
          { label: "ĐVVC", value: item.carrier || "—" },
          { label: "Mã vận đơn", value: item.trackingCode || "—" },
        ],
        items: item.items,
        subtotal: item.subtotal,
        discount: item.discount,
        total: item.total,
        grandLabel: hasDebt ? "Còn lại" : "Tổng cộng",
        grandAmount: hasDebt ? remaining : item.total,
        extraRows,
        note: item.note,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không in được đơn");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (canEditOrderItems(role)) {
      const lineError = validateLineItems(form.items);
      if (lineError) {
        toast.warning(lineError);
        return;
      }
    }

    if (form.status === "confirmed" && !form.warehouseId) {
      toast.warning("Vui lòng chọn kho trước khi xác nhận đơn hàng");
      return;
    }

    setSubmitting(true);
    try {
      const basePayload = {
        dealerId: form.dealerId || undefined,
        warehouseId: form.warehouseId || undefined,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim(),
        status: form.status,
        note: form.note.trim(),
        ...(canManagePayments(role)
          ? {
              paymentStatus: form.paymentStatus,
              paidAmount: Number(form.paidAmount) || 0,
              paymentNote: form.paymentNote.trim(),
            }
          : {}),
        ...(canManageShipping(role)
          ? {
              shippingAddress: form.shippingAddress.trim(),
              shippingContactName: form.shippingContactName.trim(),
              shippingPhone: form.shippingPhone.trim(),
              carrier: form.carrier.trim(),
              trackingCode: form.trackingCode.trim(),
              shippingDate: form.shippingDate || null,
              deliveredAt: form.deliveredAt || null,
              shippingFee: Number(form.shippingFee) || 0,
              shippingNote: form.shippingNote.trim(),
            }
          : {}),
      };

      if (editing) {
        await updateOrder(editing.id, {
          ...basePayload,
          ...(editing.inventoryExported || !canEditOrderItems(role)
            ? {}
            : { items: buildLineItemsPayload(form.items) }),
        });
        toast.success("Đã cập nhật đơn hàng");
      } else {
        await createOrder({
          ...basePayload,
          items: buildLineItemsPayload(form.items),
        });
        toast.success("Đã tạo đơn hàng");
      }
      setDialogOpen(false);
      await reload();
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
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    }
  }

  async function handleStatusChange(item: Order, nextStatus: Order["status"]) {
    if (nextStatus === item.status) return;

    if (nextStatus === "confirmed" && !item.inventoryExported) {
      if (!item.warehouseId) {
        toast.warning("Vui lòng chọn kho trước khi xác nhận đơn hàng");
        openEdit(item);
        return;
      }

      setConfirmingOrder(item);
      setConfirmationStocks([]);
      setLoadingConfirmation(true);
      try {
        const rows = await Promise.all(
          item.items.map(async (line) => {
            const result = await getWarehouseStocks({
              warehouseId: item.warehouseId || undefined,
              productId: line.productId,
              page: 1,
              limit: 1,
            });
            const product = products.find((entry) => entry.id === line.productId);
            return {
              productId: line.productId,
              productName: line.productName || product?.name || "Sản phẩm",
              productImage: product?.image || product?.images?.[0] || "",
              required: line.quantity,
              available: result.items[0]?.quantity || 0,
            };
          })
        );
        setConfirmationStocks(rows);
      } catch (err) {
        setConfirmingOrder(null);
        toast.error(
          err instanceof ApiClientError ? err.message : "Không kiểm tra được tồn kho"
        );
      } finally {
        setLoadingConfirmation(false);
      }
      return;
    }

    setUpdatingStatusId(item.id);
    try {
      await updateOrder(item.id, { status: nextStatus });
      toast.success(
        nextStatus === "confirmed" && !item.inventoryExported
          ? "Đã xác nhận đơn và xuất kho"
          : "Đã cập nhật trạng thái"
      );
      await reload();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không cập nhật được trạng thái"
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function confirmOrderAndExport() {
    if (!confirmingOrder) return;
    if (confirmationStocks.some((row) => row.available < row.required)) {
      toast.warning("Sản phẩm trong kho không đủ");
      return;
    }

    setUpdatingStatusId(confirmingOrder.id);
    try {
      await updateOrder(confirmingOrder.id, { status: "confirmed" });
      toast.success("Đã xác nhận đơn và xuất kho");
      setConfirmingOrder(null);
      setConfirmationStocks([]);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không xác nhận được đơn hàng"
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleRecordPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!payingOrder) return;
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.warning("Nhập số tiền thanh toán");
      return;
    }

    setSubmitting(true);
    try {
      await recordOrderPayment(payingOrder.id, {
        amount: Number(paymentAmount),
        note: paymentNote.trim() || undefined,
      });
      toast.success("Đã ghi nhận thanh toán");
      setPaymentOpen(false);
      setPayingOrder(null);
      setPaymentAmount("");
      setPaymentNote("");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Ghi nhận thất bại");
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
  const warehouseOptions = warehouses.map((w) => ({ value: w.id, label: w.name }));
  const confirmationHasInsufficient = confirmationStocks.some(
    (row) => row.available < row.required
  );
  const confirmationSubmitting =
    confirmingOrder !== null && updatingStatusId === confirmingOrder.id;

  function handleDealerChange(dealerId: string) {
    if (!dealerId) {
      setForm((prev) => ({ ...prev, dealerId: "" }));
      return;
    }

    const dealer = dealers.find((item) => item.id === dealerId);
    if (!dealer) {
      setForm((prev) => ({ ...prev, dealerId }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      dealerId,
      customerName: dealer.contactName || dealer.name || "",
      customerPhone: dealer.phone || "",
      customerEmail: dealer.email || "",
      shippingAddress: prev.shippingAddress || dealer.address || "",
      shippingContactName:
        prev.shippingContactName || dealer.contactName || dealer.name || "",
      shippingPhone: prev.shippingPhone || dealer.phone || "",
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đơn hàng"
        description="Công nợ, giao hàng và xuất kho khi xác nhận"
        actions={
          canManageOrders(role) && canEditOrderItems(role) ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Tạo đơn hàng
            </Button>
          ) : null
        }
        fab={
          canManageOrders(role) && canEditOrderItems(role)
            ? { onClick: openCreate, label: "Tạo đơn hàng" }
            : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đơn hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Tìm theo mã, khách hàng, mã vận đơn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có đơn hàng</p>
          ) : (
            <div className="space-y-4">
              <MobileInfiniteList
                onRefresh={refresh}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
                disabled={loading}
              >
                <div className="flex flex-col gap-3">
                {items.map((item) => {
                  const remaining =
                    item.remainingAmount ??
                    Math.max(0, (item.total || 0) - (item.paidAmount || 0));
                  const customer = item.dealerName || item.customerName || "—";
                  const statusLabel =
                    STATUS_OPTIONS.order.find((o) => o.value === item.status)?.label ||
                    item.status;
                  const paymentKey = item.paymentStatus || "unpaid";
                  const shipping =
                    item.trackingCode || item.shippingPhone || item.carrier || "";

                  return (
                    <MobileRecordCard key={item.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold tracking-tight text-[var(--color-text-primary)]">
                            {item.code}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-[var(--color-text-inverse)]">
                            {customer}
                          </p>
                        </div>
                        <Badge
                          variant={statusBadgeVariant(item.status)}
                          className="shrink-0"
                        >
                          {statusLabel}
                        </Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-[var(--color-surface-muted)] px-3 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-inverse)]">
                            Tổng đơn
                          </p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
                            {formatCurrency(item.total)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[var(--color-surface-muted)] px-3 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-text-inverse)]">
                            Còn nợ
                          </p>
                          <p
                            className={`mt-0.5 text-sm font-semibold tabular-nums ${
                              remaining > 0
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-[var(--color-text-primary)]"
                            }`}
                          >
                            {formatCurrency(remaining)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant={statusBadgeVariant(paymentKey)}
                          className="px-2 py-0.5 text-[10px]"
                        >
                          {PAYMENT_LABELS_SHORT[paymentKey]}
                        </Badge>
                        {item.warehouseName ? (
                          <MobileMetaChip>Kho: {item.warehouseName}</MobileMetaChip>
                        ) : null}
                        {item.tripCode ? (
                          <MobileMetaChip>Chuyến: {item.tripCode}</MobileMetaChip>
                        ) : null}
                        {item.carrier ? (
                          <MobileMetaChip>{item.carrier}</MobileMetaChip>
                        ) : null}
                      </div>

                      {shipping ? (
                        <p className="mt-2 truncate text-xs text-[var(--color-text-inverse)]">
                          VC: {shipping}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrint(item)}
                          title="In / PDF"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {canManagePayments(role) && item.paymentStatus !== "paid" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPayingOrder(item);
                              setPaymentAmount(
                                Math.max(0, (item.total || 0) - (item.paidAmount || 0)) ||
                                  ""
                              );
                              setPaymentNote("");
                              setPaymentOpen(true);
                            }}
                          >
                            Thu
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!item.inventoryExported && canEditOrderItems(role) ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </MobileRecordCard>
                  );
                })}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden md:block">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                      <th className="px-2 py-3 font-medium">Mã</th>
                      <th className="px-2 py-3 font-medium">Khách/Đại lý</th>
                      <th className="px-2 py-3 font-medium">Tổng / Còn nợ</th>
                      <th className="px-2 py-3 font-medium">Thanh toán</th>
                      <th className="px-2 py-3 font-medium">Giao hàng</th>
                      <th className="px-2 py-3 font-medium">Trạng thái</th>
                      <th className="px-2 py-3 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const remaining =
                        item.remainingAmount ??
                        Math.max(0, (item.total || 0) - (item.paidAmount || 0));
                      return (
                        <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                          <td className="px-2 py-3 font-medium">{item.code}</td>
                          <td className="px-2 py-3">
                            <p>{item.dealerName || item.customerName || "—"}</p>
                            {item.warehouseName ? (
                              <p className="text-xs text-[var(--color-text-inverse)]">
                                Kho: {item.warehouseName}
                              </p>
                            ) : null}
                            {item.tripCode ? (
                              <p className="text-xs text-[var(--color-text-secondary)]">
                                Chuyến: {item.tripCode}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-2 py-3">
                            <p>{formatCurrency(item.total)}</p>
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              Còn: {formatCurrency(remaining)}
                            </p>
                          </td>
                          <td className="px-2 py-3">
                            <Badge
                              variant={
                                item.paymentStatus === "paid"
                                  ? "success"
                                  : item.paymentStatus === "partial"
                                    ? "muted"
                                    : "muted"
                              }
                            >
                              {PAYMENT_LABELS[item.paymentStatus || "unpaid"]}
                            </Badge>
                          </td>
                          <td className="px-2 py-3">
                            <p>{item.carrier || "—"}</p>
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              {item.trackingCode || item.shippingPhone || "Chưa có VC"}
                            </p>
                          </td>
                          <td className="px-2 py-3">
                            <div className="w-[150px]">
                              <SearchableSelect
                                options={getAllowedStatusOptions(item)}
                                value={item.status}
                                onChange={(value) =>
                                  handleStatusChange(item, value as Order["status"])
                                }
                                searchable={false}
                                disabled={
                                  item.status === "cancelled" ||
                                  updatingStatusId === item.id
                                }
                                triggerClassName="h-8 text-xs"
                              />
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrint(item)}
                                title="In / PDF"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              {canManagePayments(role) && item.paymentStatus !== "paid" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setPayingOrder(item);
                                    setPaymentAmount(
                                      Math.max(
                                        0,
                                        (item.total || 0) - (item.paidAmount || 0)
                                      ) || ""
                                    );
                                    setPaymentNote("");
                                    setPaymentOpen(true);
                                  }}
                                >
                                  Thu
                                </Button>
                              ) : null}
                              <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {!item.inventoryExported && canEditOrderItems(role) ? (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleDelete(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={DEFAULT_PAGE_SIZE}
                onPageChange={goToPage}
                disabled={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl">
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
                  onChange={handleDealerChange}
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

            {canEditOrderItems(role) ? (
              <LineItemsField
                items={form.items}
                products={products}
                onChange={(items) => setForm({ ...form, items })}
              />
            ) : editing ? (
              <div className="rounded-lg border border-[var(--color-border-subtle)] p-3 text-sm">
                <p className="mb-2 font-medium">Sản phẩm</p>
                {editing.items.map((line, index) => (
                  <p key={`${line.productId}-${index}`} className="text-[var(--color-text-inverse)]">
                    {line.productName} × {line.quantity} — {formatCurrency(line.lineTotal)}
                  </p>
                ))}
              </div>
            ) : null}

            {canManagePayments(role) ? (
              <div className="space-y-3 rounded-xl border border-[var(--color-border-subtle)] p-4">
                <p className="text-sm font-semibold">Công nợ / Thanh toán</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Trạng thái TT</Label>
                    <SearchableSelect
                      options={STATUS_OPTIONS.payment}
                      value={form.paymentStatus}
                      onChange={(value) =>
                        setForm({
                          ...form,
                          paymentStatus: value as Order["paymentStatus"],
                        })
                      }
                      searchable={false}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paidAmount">Đã thu</Label>
                    <VndInput
                      id="paidAmount"
                      value={form.paidAmount}
                      onValueChange={(paidAmount) => setForm({ ...form, paidAmount })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentNote">Ghi chú TT</Label>
                    <Input
                      id="paymentNote"
                      value={form.paymentNote}
                      onChange={(e) => setForm({ ...form, paymentNote: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {canManageShipping(role) ? (
              <div className="space-y-3 rounded-xl border border-[var(--color-border-subtle)] p-4">
                <p className="text-sm font-semibold">Giao hàng</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="shippingAddress">Địa chỉ giao</Label>
                    <Input
                      id="shippingAddress"
                      value={form.shippingAddress}
                      onChange={(e) =>
                        setForm({ ...form, shippingAddress: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingContactName">Người nhận</Label>
                    <Input
                      id="shippingContactName"
                      value={form.shippingContactName}
                      onChange={(e) =>
                        setForm({ ...form, shippingContactName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingPhone">SĐT nhận</Label>
                    <Input
                      id="shippingPhone"
                      value={form.shippingPhone}
                      onChange={(e) =>
                        setForm({ ...form, shippingPhone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carrier">Đơn vị vận chuyển</Label>
                    <Input
                      id="carrier"
                      value={form.carrier}
                      onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trackingCode">Mã vận đơn</Label>
                    <Input
                      id="trackingCode"
                      value={form.trackingCode}
                      onChange={(e) =>
                        setForm({ ...form, trackingCode: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingDate">Ngày giao</Label>
                    <DateInput
                      id="shippingDate"
                      value={form.shippingDate}
                      onChange={(shippingDate) =>
                        setForm({ ...form, shippingDate })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveredAt">Ngày nhận</Label>
                    <DateInput
                      id="deliveredAt"
                      value={form.deliveredAt}
                      onChange={(deliveredAt) =>
                        setForm({ ...form, deliveredAt })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shippingFee">Phí giao hàng</Label>
                    <VndInput
                      id="shippingFee"
                      value={form.shippingFee}
                      onValueChange={(shippingFee) => setForm({ ...form, shippingFee })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="shippingNote">Ghi chú giao hàng</Label>
                    <Textarea
                      id="shippingNote"
                      value={form.shippingNote}
                      onChange={(e) =>
                        setForm({ ...form, shippingNote: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {editing?.inventoryExported ? (
              <p className="text-sm text-[var(--color-text-inverse)]">
                Không thể sửa sản phẩm/số lượng sau khi xác nhận đơn.
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
              <Button type="submit" loading={submitting}>
                Lưu
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(confirmingOrder)}
        onOpenChange={(open) => {
          if (!open && !confirmationSubmitting) {
            setConfirmingOrder(null);
            setConfirmationStocks([]);
          }
        }}
      >
        <DialogContent bodyScroll={false} className="max-h-[90vh] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Xác nhận đơn hàng và xuất kho</DialogTitle>
          </DialogHeader>

          <div className="shrink-0 border-b border-[var(--color-border-subtle)] px-4 pb-4 sm:px-6">
            <div className="grid gap-3 rounded-xl border border-[var(--color-border-subtle)] p-3 text-sm sm:grid-cols-3 sm:p-4">
              <div>
                <p className="text-xs text-[var(--color-text-inverse)]">Mã đơn</p>
                <p className="mt-1 font-semibold">{confirmingOrder?.code}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-inverse)]">Khách hàng</p>
                <p className="mt-1 font-semibold">
                  {confirmingOrder?.dealerName || confirmingOrder?.customerName || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-inverse)]">Kho xuất</p>
                <p className="mt-1 font-semibold">{confirmingOrder?.warehouseName || "—"}</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Sản phẩm xuất kho</p>
              <p className="text-xs text-[var(--color-text-inverse)]">
                {confirmingOrder?.items.length || 0} sản phẩm
              </p>
            </div>

            {loadingConfirmation ? (
              <div className="space-y-3">
                {confirmingOrder?.items.map((line) => (
                  <div
                    key={line.productId}
                    className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-muted)]"
                  />
                ))}
              </div>
            ) : (
              confirmationStocks.map((row) => {
                const enough = row.available >= row.required;
                return (
                  <div
                    key={row.productId}
                    className={`flex gap-3 rounded-xl border p-3 sm:gap-4 sm:p-4 ${
                      enough
                        ? "border-[var(--color-border-subtle)]"
                        : "border-red-300 bg-red-50/50"
                    }`}
                  >
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-white sm:h-16 sm:w-16">
                      {row.productImage ? (
                        <Image
                          src={getImageUrl(row.productImage)}
                          alt={row.productName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <PackageCheck className="h-7 w-7 text-[var(--color-text-inverse)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-snug">{row.productName}</p>
                        {!enough ? (
                          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                        ) : null}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="text-[10px] text-[var(--color-text-inverse)] sm:text-xs">
                            Cần xuất
                          </p>
                          <p className="truncate font-semibold">{row.required}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-[var(--color-text-inverse)] sm:text-xs">
                            Tồn hiện tại
                          </p>
                          <p
                            className={`truncate font-semibold ${enough ? "" : "text-red-600"}`}
                          >
                            {row.available}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-[var(--color-text-inverse)] sm:text-xs">
                            Còn lại
                          </p>
                          <p
                            className={`truncate font-semibold ${
                              enough ? "text-emerald-700" : "text-red-600"
                            }`}
                          >
                            {Math.max(0, row.available - row.required)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {confirmationHasInsufficient ? (
              <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Sản phẩm trong kho không đủ</p>
                  <p className="mt-1">Vui lòng nhập thêm hàng trước khi xác nhận đơn.</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--color-border-subtle)] px-4 py-4 sm:px-6">
            <div className="ml-auto flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                disabled={confirmationSubmitting}
                onClick={() => {
                  setConfirmingOrder(null);
                  setConfirmationStocks([]);
                }}
              >
                Hủy
              </Button>
              <Button
                type="button"
                className="flex-1 sm:flex-none"
                loading={confirmationSubmitting}
                disabled={loadingConfirmation || confirmationHasInsufficient}
                onClick={confirmOrderAndExport}
              >
                {!confirmationSubmitting ? <PackageCheck className="h-4 w-4" /> : null}
                Xác nhận & xuất kho
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ghi nhận thanh toán {payingOrder?.code}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <p className="text-sm text-[var(--color-text-inverse)]">
              Tổng đơn: {formatCurrency(payingOrder?.total || 0)} - Đã thu:{" "}
              {formatCurrency(payingOrder?.paidAmount || 0)}
            </p>
            <div className="space-y-2">
              <Label htmlFor="payAmount">Số tiền thu thêm</Label>
              <VndInput
                id="payAmount"
                value={paymentAmount}
                onValueChange={setPaymentAmount}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payNote">Ghi chú</Label>
              <Input
                id="payNote"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                Ghi nhận
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
