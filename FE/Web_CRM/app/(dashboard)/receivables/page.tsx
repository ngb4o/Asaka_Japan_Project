"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { TabSwitcher } from "@/components/ui/tab-switcher";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import {
  MobileMetaChip,
  MobileRecordCard,
  MobileStatTile,
} from "@/components/ui/mobile-record-card";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { VndInput } from "@/components/ui/vnd-input";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  canManagePayables,
  canManagePayments,
  canViewPayables,
  canViewReceivables,
  rolesOf,
} from "@/lib/auth/permissions";
import { getReceivablesSummary } from "@/lib/api/receivables";
import { getPayablesSummary } from "@/lib/api/payables";
import { getOrders, recordOrderPayment } from "@/lib/api/orders";
import { getPurchases, recordPurchasePayment } from "@/lib/api/purchases";
import { ApiClientError } from "@/lib/api/client";
import { useCrmDataRefresh } from "@/lib/hooks/useCrmDataRefresh";
import { statusBadgeVariant } from "@/lib/status-badge";
import type {
  Order,
  PayableSupplierSummary,
  PayablesSummary,
  PurchaseInvoice,
  ReceivableDealerSummary,
  ReceivablesSummary,
} from "@/lib/types";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { STATUS_OPTIONS } from "@/components/ui/searchable-select";
import { cn, formatCurrency, formatDateDisplay } from "@/lib/utils";

type DebtTab = "dealer" | "supplier";

const ORDER_STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.order.map((option) => [option.value, option.label])
) as Record<Order["status"], string>;

const ORDER_PAYMENT_LABELS: Record<Order["paymentStatus"], string> = {
  unpaid: "Chưa thu",
  partial: "Thu một phần",
  paid: "Đã thu",
};

const INVOICE_PAYMENT_LABELS: Record<PurchaseInvoice["paymentStatus"], string> =
  {
    unpaid: "Chưa trả",
    partial: "Trả một phần",
    paid: "Đã trả",
  };

function remainingOrder(order: Order) {
  return (
    order.remainingAmount ??
    Math.max(0, (order.total || 0) - (order.paidAmount || 0))
  );
}

function remainingInvoice(invoice: PurchaseInvoice) {
  return (
    invoice.remainingAmount ??
    Math.max(0, (invoice.total || 0) - (invoice.paidAmount || 0))
  );
}

export default function ReceivablesPage() {
  const toast = useToast();
  const { user } = useAuth();
  const roles = rolesOf(user);

  const canAr = canViewReceivables(roles);
  const canAp = canViewPayables(roles);
  const canPayAr = canManagePayments(roles);
  const canPayAp = canManagePayables(roles);

  const tabOptions = useMemo(() => {
    const tabs: Array<{ id: DebtTab; label: string }> = [];
    if (canAr) tabs.push({ id: "dealer", label: "Đại lý" });
    if (canAp) tabs.push({ id: "supplier", label: "Nhà cung cấp" });
    return tabs;
  }, [canAr, canAp]);

  const [activeTab, setActiveTab] = useState<DebtTab>(() =>
    canAr ? "dealer" : "supplier"
  );
  const selectedIndex = Math.max(
    0,
    tabOptions.findIndex((tab) => tab.id === activeTab)
  );

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("tab");
    if ((q === "ncc" || q === "supplier") && canAp) {
      setActiveTab("supplier");
      return;
    }
    if (canAr) {
      setActiveTab("dealer");
      return;
    }
    if (canAp) setActiveTab("supplier");
  }, [canAr, canAp]);

  useEffect(() => {
    if (!tabOptions.length) return;
    if (!tabOptions.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabOptions[0].id);
    }
  }, [tabOptions, activeTab]);

  const [search, setSearch] = useState("");

  // ── Dealer AR ──
  const [arSummary, setArSummary] = useState<ReceivablesSummary | null>(null);
  const [arLoading, setArLoading] = useState(true);
  const [dealerDetailOpen, setDealerDetailOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] =
    useState<ReceivableDealerSummary | null>(null);
  const [debtOrders, setDebtOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderPayOpen, setOrderPayOpen] = useState(false);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const [orderPayAmount, setOrderPayAmount] = useState<number | "">("");
  const [orderPayNote, setOrderPayNote] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // ── Supplier AP ──
  const [apSummary, setApSummary] = useState<PayablesSummary | null>(null);
  const [apLoading, setApLoading] = useState(true);
  const [supplierDetailOpen, setSupplierDetailOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] =
    useState<PayableSupplierSummary | null>(null);
  const [debtInvoices, setDebtInvoices] = useState<PurchaseInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicePayOpen, setInvoicePayOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<PurchaseInvoice | null>(
    null
  );
  const [invoicePayAmount, setInvoicePayAmount] = useState<number | "">("");
  const [invoicePayNote, setInvoicePayNote] = useState("");
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);

  const loadArSummary = useCallback(async () => {
    if (!canAr) {
      setArLoading(false);
      return;
    }
    setArLoading(true);
    try {
      const data = await getReceivablesSummary({
        q: search.trim() || undefined,
      });
      setArSummary(data);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : "Không tải được công nợ đại lý"
      );
      setArSummary(null);
    } finally {
      setArLoading(false);
    }
  }, [canAr, search, toast]);

  const loadApSummary = useCallback(async () => {
    if (!canAp) {
      setApLoading(false);
      return;
    }
    setApLoading(true);
    try {
      const data = await getPayablesSummary({
        q: search.trim() || undefined,
      });
      setApSummary(data);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : "Không tải được công nợ NCC"
      );
      setApSummary(null);
    } finally {
      setApLoading(false);
    }
  }, [canAp, search, toast]);

  useEffect(() => {
    if (activeTab === "dealer") void loadArSummary();
    else void loadApSummary();
  }, [activeTab, loadArSummary, loadApSummary]);

  const loadDebtOrders = useCallback(
    async (dealerId: string) => {
      setOrdersLoading(true);
      try {
        const result = await getOrders({
          dealerId,
          hasDebt: true,
          page: 1,
          limit: 100,
        });
        setDebtOrders(result.items);
      } catch (err) {
        toast.error(
          err instanceof ApiClientError
            ? err.message
            : "Không tải được đơn còn nợ"
        );
        setDebtOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    },
    [toast]
  );

  const loadDebtInvoices = useCallback(
    async (supplierId: string) => {
      setInvoicesLoading(true);
      try {
        const result = await getPurchases({
          supplierId,
          hasDebt: true,
          page: 1,
          limit: 100,
        });
        setDebtInvoices(result.items);
      } catch (err) {
        toast.error(
          err instanceof ApiClientError
            ? err.message
            : "Không tải được phiếu còn nợ"
        );
        setDebtInvoices([]);
      } finally {
        setInvoicesLoading(false);
      }
    },
    [toast]
  );

  useCrmDataRefresh(["receivables", "orders"], async () => {
    if (activeTab === "dealer" && canAr) {
      await loadArSummary();
      if (selectedDealer) await loadDebtOrders(selectedDealer.dealerId);
    }
  });

  function openDealer(item: ReceivableDealerSummary) {
    setSelectedDealer(item);
    setDealerDetailOpen(true);
    void loadDebtOrders(item.dealerId);
  }

  function openSupplier(item: PayableSupplierSummary) {
    setSelectedSupplier(item);
    setSupplierDetailOpen(true);
    void loadDebtInvoices(item.supplierId);
  }

  async function handleOrderPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!payingOrder) return;
    const amount = Number(orderPayAmount) || 0;
    if (amount <= 0) {
      toast.error("Số tiền phải lớn hơn 0");
      return;
    }
    setOrderSubmitting(true);
    try {
      await recordOrderPayment(payingOrder.id, {
        amount,
        note: orderPayNote.trim() || undefined,
      });
      toast.success("Đã ghi nhận thanh toán");
      setOrderPayOpen(false);
      setPayingOrder(null);
      if (selectedDealer) await loadDebtOrders(selectedDealer.dealerId);
      await loadArSummary();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Ghi nhận thất bại"
      );
    } finally {
      setOrderSubmitting(false);
    }
  }

  async function handleInvoicePayment(event: React.FormEvent) {
    event.preventDefault();
    if (!payingInvoice) return;
    const amount = Number(invoicePayAmount) || 0;
    if (amount <= 0) {
      toast.error("Số tiền phải lớn hơn 0");
      return;
    }
    setInvoiceSubmitting(true);
    try {
      await recordPurchasePayment(payingInvoice.id, {
        amount,
        note: invoicePayNote.trim() || undefined,
      });
      toast.success("Đã ghi nhận thanh toán NCC");
      setInvoicePayOpen(false);
      setPayingInvoice(null);
      if (selectedSupplier) await loadDebtInvoices(selectedSupplier.supplierId);
      await loadApSummary();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Ghi nhận thất bại"
      );
    } finally {
      setInvoiceSubmitting(false);
    }
  }

  const refreshing =
    activeTab === "dealer" ? arLoading : apLoading;

  if (!canAr && !canAp) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Công nợ"
          description="Bạn không có quyền xem sổ công nợ."
        />
      </div>
    );
  }

  if (
    (activeTab === "dealer" && arLoading && !arSummary) ||
    (activeTab === "supplier" && apLoading && !apSummary)
  ) {
    return <PageSkeleton {...PAGE_SKELETONS.receivables} />;
  }

  const arTotals = arSummary?.totals;
  const arItems = arSummary?.items || [];
  const apTotals = apSummary?.totals;
  const apItems = apSummary?.items || [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Công nợ"
        description="Theo dõi phải thu đại lý và phải trả nhà cung cấp"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void (activeTab === "dealer" ? loadArSummary() : loadApSummary())
            }
            loading={refreshing}>
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
        }
      />

      {tabOptions.length > 1 ? (
        <TabSwitcher
          tabs={tabOptions.map((tab) => tab.label)}
          selectedIndex={selectedIndex}
          onTabSelected={(index) => {
            const next = tabOptions[index];
            if (!next) return;
            setActiveTab(next.id);
            setSearch("");
            const url = new URL(window.location.href);
            if (next.id === "supplier") url.searchParams.set("tab", "ncc");
            else url.searchParams.delete("tab");
            window.history.replaceState(
              {},
              "",
              `${url.pathname}${url.search}`
            );
          }}
          className="w-full max-w-md"
        />
      ) : null}

      {activeTab === "dealer" && canAr ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MobileStatTile label="Phải thu" valueClassName="text-red-600">
              {formatCurrency(arTotals?.debtAmount || 0)}
            </MobileStatTile>
            <MobileStatTile label="Đại lý còn nợ">
              {arTotals?.dealerCount || 0}
            </MobileStatTile>
            <MobileStatTile label="Đơn còn nợ">
              {arTotals?.debtOrderCount || 0}
            </MobileStatTile>
            <MobileStatTile label="Đã thu (đơn nợ)">
              {formatCurrency(arTotals?.paidAmount || 0)}
            </MobileStatTile>
          </div>

          <Card className="border-0 bg-transparent shadow-none md:border md:bg-[var(--color-surface-elevated)] md:shadow-[var(--shadow-soft)]">
            <CardHeader
              showOnMobile
              className="gap-3 space-y-0 border-b-0 px-0 max-md:flex max-md:pb-0 sm:flex-row sm:items-center sm:justify-between md:border-b md:px-5">
              <CardTitle className="max-md:hidden">
                Đại lý còn nợ ({arItems.length})
              </CardTitle>
              <SearchInput
                value={search}
                onSearch={setSearch}
                placeholder="Tìm tên, SĐT, khu vực…"
                className="w-full sm:max-w-xs"
              />
            </CardHeader>
            <CardContent className="max-md:px-0 max-md:pb-0 max-md:pt-3">
              {arItems.length === 0 ? (
                <EmptyState title="Không có đại lý còn công nợ" />
              ) : (
                <>
                  <MobileInfiniteList
                    onRefresh={loadArSummary}
                    onLoadMore={() => {}}
                    hasMore={false}
                    disabled={arLoading}>
                    <div className="flex flex-col gap-3">
                      {arItems.map((item) => (
                        <MobileRecordCard key={item.dealerId} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                                {item.dealerName}
                              </p>
                              {(item.contactName || item.phone) ? (
                                <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--color-text-primary)]">
                                  {[item.contactName, item.phone]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              ) : null}
                              {item.region ? (
                                <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                                  {item.region}
                                </p>
                              ) : null}
                            </div>
                            <Badge variant="danger" className="shrink-0">
                              {item.debtOrderCount} đơn
                            </Badge>
                          </div>

                          <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
                            <div>
                              <p className="text-xs text-[var(--color-text-inverse)]">
                                Đã thu
                              </p>
                              <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                                {formatCurrency(item.paidAmount)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-[var(--color-text-inverse)]">
                                Còn nợ
                              </p>
                              <p className="mt-0.5 text-base font-bold tabular-nums text-red-600 dark:text-red-400">
                                {formatCurrency(item.debtAmount)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3.5 flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 min-w-9"
                              title="Xem đơn nợ"
                              onClick={() => openDealer(item)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </MobileRecordCard>
                      ))}
                    </div>
                  </MobileInfiniteList>

                  <div className="crm-table-scroll hidden md:block">
                    <div className="crm-table-frame">
                      <table className="crm-data-table min-w-[720px]">
                        <thead>
                          <tr>
                            <th className="font-medium">Đại lý</th>
                            <th className="font-medium">Liên hệ</th>
                            <th className="font-medium">Khu vực</th>
                            <th className="text-right font-medium">Đơn nợ</th>
                            <th className="text-right font-medium">Đã thu</th>
                            <th className="text-right font-medium">Còn nợ</th>
                            <th className="text-right font-medium">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {arItems.map((item) => (
                            <tr key={item.dealerId}>
                              <td className="font-medium">{item.dealerName}</td>
                              <td className="text-[var(--color-text-inverse)]">
                                {[item.contactName, item.phone]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </td>
                              <td>{item.region || "—"}</td>
                              <td className="text-right tabular-nums">
                                {item.debtOrderCount}
                              </td>
                              <td className="text-right tabular-nums">
                                {formatCurrency(item.paidAmount)}
                              </td>
                              <td className="text-right font-semibold tabular-nums text-red-600">
                                {formatCurrency(item.debtAmount)}
                              </td>
                              <td>
                                <div className="flex justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 min-w-9"
                                    title="Xem đơn nợ"
                                    onClick={() => openDealer(item)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {activeTab === "supplier" && canAp ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MobileStatTile label="Phải trả" valueClassName="text-red-600">
              {formatCurrency(apTotals?.debtAmount || 0)}
            </MobileStatTile>
            <MobileStatTile label="NCC còn nợ">
              {apTotals?.supplierCount || 0}
            </MobileStatTile>
            <MobileStatTile label="Phiếu còn nợ">
              {apTotals?.debtInvoiceCount || 0}
            </MobileStatTile>
            <MobileStatTile label="Đã trả (phiếu nợ)">
              {formatCurrency(apTotals?.paidAmount || 0)}
            </MobileStatTile>
          </div>

          <Card className="border-0 bg-transparent shadow-none md:border md:bg-[var(--color-surface-elevated)] md:shadow-[var(--shadow-soft)]">
            <CardHeader
              showOnMobile
              className="gap-3 space-y-0 border-b-0 px-0 max-md:flex max-md:pb-0 sm:flex-row sm:items-center sm:justify-between md:border-b md:px-5">
              <CardTitle className="max-md:hidden">
                NCC còn nợ ({apItems.length})
              </CardTitle>
              <SearchInput
                value={search}
                onSearch={setSearch}
                placeholder="Tìm tên, SĐT, MST…"
                className="w-full sm:max-w-xs"
              />
            </CardHeader>
            <CardContent className="max-md:px-0 max-md:pb-0 max-md:pt-3">
              {apItems.length === 0 ? (
                <EmptyState title="Không có NCC còn công nợ" />
              ) : (
                <>
                  <MobileInfiniteList
                    onRefresh={loadApSummary}
                    onLoadMore={() => {}}
                    hasMore={false}
                    disabled={apLoading}>
                    <div className="flex flex-col gap-3 md:hidden">
                      {apItems.map((item) => (
                        <MobileRecordCard key={item.supplierId} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                                {item.supplierName}
                              </p>
                              {(item.contactName || item.phone) ? (
                                <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--color-text-primary)]">
                                  {[item.contactName, item.phone]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              ) : null}
                              {item.taxCode ? (
                                <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                                  MST: {item.taxCode}
                                </p>
                              ) : null}
                            </div>
                            <Badge variant="danger" className="shrink-0">
                              {item.debtInvoiceCount} phiếu
                            </Badge>
                          </div>

                          <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
                            <div>
                              <p className="text-xs text-[var(--color-text-inverse)]">
                                Đã trả
                              </p>
                              <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                                {formatCurrency(item.paidAmount)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-[var(--color-text-inverse)]">
                                Còn nợ
                              </p>
                              <p className="mt-0.5 text-base font-bold tabular-nums text-red-600 dark:text-red-400">
                                {formatCurrency(item.debtAmount)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3.5 flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 min-w-9"
                              title="Xem phiếu nợ"
                              onClick={() => openSupplier(item)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </MobileRecordCard>
                      ))}
                    </div>
                  </MobileInfiniteList>

                  <div className="crm-table-scroll hidden md:block">
                    <div className="crm-table-frame">
                      <table className="crm-data-table min-w-[820px]">
                        <thead>
                          <tr>
                            <th>Nhà cung cấp</th>
                            <th>Liên hệ</th>
                            <th>Phiếu nợ</th>
                            <th>Còn nợ</th>
                            <th>Đã trả</th>
                            <th className="text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apItems.map((item) => (
                            <tr key={item.supplierId}>
                              <td className="font-medium">
                                {item.supplierName}
                              </td>
                              <td className="text-[var(--color-text-inverse)]">
                                {[item.contactName, item.phone]
                                  .filter(Boolean)
                                  .join(" · ") || "—"}
                              </td>
                              <td>{item.debtInvoiceCount}</td>
                              <td className="font-semibold text-red-600">
                                {formatCurrency(item.debtAmount)}
                              </td>
                              <td>{formatCurrency(item.paidAmount)}</td>
                              <td className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 min-w-9"
                                  title="Xem phiếu nợ"
                                  onClick={() => openSupplier(item)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Dealer detail / payment */}
      <Dialog open={dealerDetailOpen} onOpenChange={setDealerDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Công nợ · {selectedDealer?.dealerName || "Đại lý"}
            </DialogTitle>
          </DialogHeader>
          {selectedDealer ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
                <div>
                  <p className="text-xs text-[var(--color-text-inverse)]">Đơn nợ</p>
                  <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                    {selectedDealer.debtOrderCount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--color-text-inverse)]">Còn nợ</p>
                  <p className="mt-0.5 text-base font-bold tabular-nums text-red-600 dark:text-red-400">
                    {formatCurrency(selectedDealer.debtAmount)}
                  </p>
                </div>
              </div>
              {ordersLoading ? (
                <div className="space-y-3" aria-busy="true">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                </div>
              ) : debtOrders.length === 0 ? (
                <EmptyState title="Không còn đơn nợ" size="sm" />
              ) : (
                <div className="flex flex-col gap-3">
                  {debtOrders.map((order) => {
                    const remaining = remainingOrder(order);
                    return (
                      <MobileRecordCard key={order.id} className="p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                              {order.code}
                            </p>
                            <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                              {[
                                formatDateDisplay(order.createdAt) || null,
                                order.warehouseName
                                  ? `Kho ${order.warehouseName}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <Badge variant={statusBadgeVariant(order.status)}>
                              {ORDER_STATUS_LABELS[order.status] || order.status}
                            </Badge>
                            <Badge variant={statusBadgeVariant(order.paymentStatus)}>
                              {ORDER_PAYMENT_LABELS[order.paymentStatus]}
                            </Badge>
                          </div>
                        </div>

                        <OrderLineItemsList
                          items={order.items || []}
                          showImages={false}
                        />

                        <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
                          <div>
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              Tổng đơn
                            </p>
                            <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-secondary)]">
                              {formatCurrency(order.total)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              Còn nợ
                            </p>
                            <p
                              className={cn(
                                "mt-0.5 text-base font-bold tabular-nums",
                                remaining > 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-[var(--color-text-inverse)]"
                              )}>
                              {formatCurrency(remaining)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <MobileMetaChip>
                            Đã thu: {formatCurrency(order.paidAmount || 0)}
                          </MobileMetaChip>
                        </div>

                        {canPayAr && remaining > 0 ? (
                          <div className="mt-3.5 border-t border-[var(--color-border-subtle)] pt-3.5">
                            <Button
                              size="sm"
                              className="h-9 w-full"
                              onClick={() => {
                                setPayingOrder(order);
                                setOrderPayAmount(remaining || "");
                                setOrderPayNote("");
                                setOrderPayOpen(true);
                              }}>
                              Thu
                            </Button>
                          </div>
                        ) : null}
                      </MobileRecordCard>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={orderPayOpen} onOpenChange={setOrderPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ghi nhận thanh toán {payingOrder?.code}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOrderPayment} className="space-y-4">
            <p className="text-sm text-[var(--color-text-inverse)]">
              Tổng đơn: {formatCurrency(payingOrder?.total || 0)} — Đã thu:{" "}
              {formatCurrency(payingOrder?.paidAmount || 0)}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Số tiền thu thêm</Label>
                <VndInput
                  value={orderPayAmount}
                  onValueChange={setOrderPayAmount}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Input
                  value={orderPayNote}
                  onChange={(e) => setOrderPayNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOrderPayOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={orderSubmitting}>
                Ghi nhận
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier detail / payment */}
      <Dialog open={supplierDetailOpen} onOpenChange={setSupplierDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Công nợ · {selectedSupplier?.supplierName || "NCC"}
            </DialogTitle>
          </DialogHeader>
          {selectedSupplier ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
                <div>
                  <p className="text-xs text-[var(--color-text-inverse)]">Phiếu nợ</p>
                  <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                    {selectedSupplier.debtInvoiceCount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--color-text-inverse)]">Còn nợ</p>
                  <p className="mt-0.5 text-base font-bold tabular-nums text-red-600 dark:text-red-400">
                    {formatCurrency(selectedSupplier.debtAmount)}
                  </p>
                </div>
              </div>
              {invoicesLoading ? (
                <div className="space-y-3" aria-busy="true">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                </div>
              ) : debtInvoices.length === 0 ? (
                <EmptyState title="Không còn phiếu nợ" size="sm" />
              ) : (
                <div className="flex flex-col gap-3">
                  {debtInvoices.map((invoice) => {
                    const remaining = remainingInvoice(invoice);
                    const lineItems = (invoice.items || []).map((item) => ({
                      productId: item.productId,
                      productName: item.productName,
                      quantity: item.quantity,
                      unitType: item.unitType,
                      quantityBase: item.quantityBase,
                      unitPrice: item.unitCost || 0,
                      lineTotal: item.totalCost || 0,
                    }));
                    return (
                      <MobileRecordCard key={invoice.id} className="p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                              {invoice.code}
                            </p>
                            <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                              {[
                                formatDateDisplay(invoice.invoiceDate) || null,
                                invoice.dueDate
                                  ? `Hạn ${formatDateDisplay(invoice.dueDate)}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                          </div>
                          <Badge
                            variant={statusBadgeVariant(invoice.paymentStatus)}
                            className="shrink-0">
                            {INVOICE_PAYMENT_LABELS[invoice.paymentStatus]}
                          </Badge>
                        </div>

                        <OrderLineItemsList
                          items={lineItems}
                          showImages={false}
                        />

                        <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
                          <div>
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              Tổng phiếu
                            </p>
                            <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-secondary)]">
                              {formatCurrency(invoice.total)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              Còn nợ
                            </p>
                            <p
                              className={cn(
                                "mt-0.5 text-base font-bold tabular-nums",
                                remaining > 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-[var(--color-text-inverse)]"
                              )}>
                              {formatCurrency(remaining)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <MobileMetaChip>
                            Đã trả: {formatCurrency(invoice.paidAmount || 0)}
                          </MobileMetaChip>
                        </div>

                        {canPayAp && remaining > 0 ? (
                          <div className="mt-3.5 border-t border-[var(--color-border-subtle)] pt-3.5">
                            <Button
                              size="sm"
                              className="h-9 w-full"
                              onClick={() => {
                                setPayingInvoice(invoice);
                                setInvoicePayAmount(remaining || "");
                                setInvoicePayNote("");
                                setInvoicePayOpen(true);
                              }}>
                              Trả
                            </Button>
                          </div>
                        ) : null}
                      </MobileRecordCard>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={invoicePayOpen} onOpenChange={setInvoicePayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Thanh toán — {payingInvoice?.code || ""}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvoicePayment} className="space-y-4">
            <p className="text-sm text-[var(--color-text-inverse)]">
              Còn nợ:{" "}
              {formatCurrency(
                payingInvoice ? remainingInvoice(payingInvoice) : 0
              )}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Số tiền *</Label>
                <VndInput
                  value={invoicePayAmount}
                  onValueChange={setInvoicePayAmount}
                />
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Input
                  value={invoicePayNote}
                  onChange={(e) => setInvoicePayNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInvoicePayOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={invoiceSubmitting}>
                Xác nhận
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
