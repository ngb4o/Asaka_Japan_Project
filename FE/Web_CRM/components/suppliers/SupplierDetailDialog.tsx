"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TabSwitcher } from "@/components/ui/tab-switcher";
import { getPurchases } from "@/lib/api/purchases";
import { ApiClientError } from "@/lib/api/client";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { statusBadgeVariant } from "@/lib/status-badge";
import type { PurchaseInvoice, Supplier } from "@/lib/types";
import { formatCurrency, formatDateDisplay } from "@/lib/utils";
import { useToast } from "@/components/providers/ToastProvider";

type SupplierDetailDialogProps = {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MOBILE_TABS = ["Thông tin", "Phiếu nhập", "Công nợ"] as const;

const PAYMENT_LABELS: Record<PurchaseInvoice["paymentStatus"], string> = {
  unpaid: "Chưa trả",
  partial: "Trả một phần",
  paid: "Đã trả",
};

function formatDate(value?: string | null) {
  return formatDateDisplay(value) || "—";
}

function remainingOf(invoice: PurchaseInvoice) {
  return (
    invoice.remainingAmount ??
    Math.max(0, (invoice.total || 0) - (invoice.paidAmount || 0))
  );
}

function isDebtInvoice(invoice: PurchaseInvoice) {
  return (
    invoice.status !== "cancelled" &&
    (invoice.paymentStatus === "unpaid" ||
      invoice.paymentStatus === "partial") &&
    remainingOf(invoice) > 0
  );
}

function InvoiceCard({ invoice }: { invoice: PurchaseInvoice }) {
  const remaining = remainingOf(invoice);
  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border-subtle)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[var(--color-text-primary)]">
            {invoice.code}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-inverse)]">
            {formatDate(invoice.invoiceDate || invoice.createdAt)}
            {invoice.dueDate ? ` · Hạn ${formatDate(invoice.dueDate)}` : ""}
          </p>
        </div>
        <Badge variant={statusBadgeVariant(invoice.paymentStatus)}>
          {PAYMENT_LABELS[invoice.paymentStatus] || invoice.paymentStatus}
        </Badge>
      </div>

      {(invoice.items || []).length > 0 ? (
        <div className="space-y-1.5">
          {invoice.items.map((item, index) => (
            <div
              key={`${item.productId}-${index}`}
              className="flex items-start justify-between gap-3 text-sm">
              <p className="min-w-0 truncate text-[var(--color-text-primary)]">
                {item.productName || "Sản phẩm"}
                <span className="text-[var(--color-text-inverse)]">
                  {" "}
                  · {item.quantity}
                  {item.unitType === "thung" ? " thùng" : " chai"}
                </span>
              </p>
              <p className="shrink-0 font-medium tabular-nums">
                {formatCurrency(item.totalCost || 0)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 border-t border-[var(--color-border-subtle)] pt-3 text-sm">
        <div className="text-right">
          <p className="text-xs text-[var(--color-text-inverse)]">Tổng nhập</p>
          <p className="font-semibold tabular-nums text-[var(--color-text-secondary)]">
            {formatCurrency(invoice.total || 0)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--color-text-inverse)]">Đã trả</p>
          <p className="font-semibold tabular-nums text-[var(--color-text-secondary)]">
            {formatCurrency(invoice.paidAmount || 0)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--color-text-inverse)]">Còn nợ</p>
          <p className="font-semibold tabular-nums text-red-600">
            {formatCurrency(remaining)}
          </p>
        </div>
      </div>
    </div>
  );
}

function SupplierInfoCard({
  supplier,
  showContent,
  invoiceCount,
  purchaseTotal,
  debtAmount,
  debtInvoiceCount,
}: {
  supplier: Supplier;
  showContent: boolean;
  invoiceCount: number;
  purchaseTotal: number;
  debtAmount: number;
  debtInvoiceCount: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {supplier.name}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
            {[supplier.contactName, supplier.phone].filter(Boolean).join(" - ") ||
              "Chưa có liên hệ"}
          </p>
          {supplier.address ? (
            <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
              {supplier.address}
            </p>
          ) : null}
          {supplier.taxCode ? (
            <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
              MST: {supplier.taxCode}
            </p>
          ) : null}
          {supplier.email ? (
            <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
              {supplier.email}
            </p>
          ) : null}
        </div>
        <Badge variant={supplier.status === "active" ? "success" : "muted"}>
          {supplier.status === "active" ? "Hoạt động" : "Ngưng"}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2">
          <p className="text-xs text-[var(--color-text-inverse)]">Phiếu nhập</p>
          {showContent ? (
            <p className="mt-1 font-semibold">{invoiceCount}</p>
          ) : (
            <Skeleton className="mt-2 h-5 w-12" />
          )}
        </div>
        <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2">
          <p className="text-xs text-[var(--color-text-inverse)]">
            Tổng tiền nhập
          </p>
          {showContent ? (
            <p className="mt-1 font-semibold tabular-nums">
              {formatCurrency(purchaseTotal)}
            </p>
          ) : (
            <Skeleton className="mt-2 h-5 w-32" />
          )}
        </div>
        <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2">
          <p className="text-xs text-[var(--color-text-inverse)]">Còn nợ NCC</p>
          {showContent ? (
            <p className="mt-1 font-semibold tabular-nums text-red-600">
              {formatCurrency(debtAmount)}
            </p>
          ) : (
            <Skeleton className="mt-2 h-5 w-28" />
          )}
        </div>
        <div className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-2">
          <p className="text-xs text-[var(--color-text-inverse)]">Phiếu còn nợ</p>
          {showContent ? (
            <p className="mt-1 font-semibold">{debtInvoiceCount}</p>
          ) : (
            <Skeleton className="mt-2 h-5 w-12" />
          )}
        </div>
      </div>

      {supplier.note ? (
        <p className="mt-3 text-sm text-[var(--color-text-inverse)]">
          {supplier.note}
        </p>
      ) : null}
    </div>
  );
}

function InvoicesSection({
  showContent,
  invoices,
  title,
  emptyText,
}: {
  showContent: boolean;
  invoices: PurchaseInvoice[];
  title: string;
  emptyText: string;
}) {
  if (!showContent) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Đang tải phiếu nhập">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
        {title} ({invoices.length})
      </h4>
      {invoices.length === 0 ? (
        <EmptyState title={emptyText} size="sm" />
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      )}
    </section>
  );
}

export function SupplierDetailDialog({
  supplier,
  open,
  onOpenChange,
}: SupplierDetailDialogProps) {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loadedSupplierId, setLoadedSupplierId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMobileTab(0);
      return;
    }
    setMobileTab(0);
  }, [open, supplier?.id]);

  useEffect(() => {
    if (!open || !supplier) {
      setInvoices([]);
      setLoadedSupplierId(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supplierId = supplier.id;

    setInvoices([]);
    setLoadedSupplierId(null);
    setLoading(true);

    async function loadHistory() {
      try {
        const result = await getPurchases({
          supplierId,
          page: 1,
          limit: 50,
        });
        if (cancelled) return;
        setInvoices(result.items);
        setLoadedSupplierId(supplierId);
      } catch (err) {
        if (cancelled) return;
        toast.error(
          err instanceof ApiClientError
            ? err.message
            : "Không tải được lịch sử nhập mua"
        );
        setInvoices([]);
        setLoadedSupplierId(supplierId);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [open, supplier, toast]);

  const showContent =
    Boolean(supplier) && !loading && loadedSupplierId === supplier?.id;
  const purchaseTotal = invoices.reduce(
    (sum, item) => sum + (item.total || 0),
    0
  );
  const debtInvoices = useMemo(
    () => invoices.filter(isDebtInvoice),
    [invoices]
  );
  const debtAmount = debtInvoices.reduce(
    (sum, item) => sum + remainingOf(item),
    0
  );

  const showInfoPanel = !isMobile || mobileTab === 0;
  const showInvoicesPanel = !isMobile || mobileTab === 1;
  const showDebtPanel = isMobile && mobileTab === 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết nhà cung cấp</DialogTitle>
        </DialogHeader>

        {supplier ? (
          <div className="space-y-4">
            {isMobile ? (
              <TabSwitcher
                tabs={[...MOBILE_TABS]}
                selectedIndex={mobileTab}
                onTabSelected={setMobileTab}
              />
            ) : null}

            {showInfoPanel ? (
              <SupplierInfoCard
                supplier={supplier}
                showContent={showContent}
                invoiceCount={invoices.length}
                purchaseTotal={purchaseTotal}
                debtAmount={debtAmount}
                debtInvoiceCount={debtInvoices.length}
              />
            ) : null}

            {showInvoicesPanel ? (
              <InvoicesSection
                showContent={showContent}
                invoices={invoices}
                title="Phiếu nhập mua"
                emptyText="Chưa có phiếu nhập gắn với NCC này"
              />
            ) : null}

            {showDebtPanel ? (
              <InvoicesSection
                showContent={showContent}
                invoices={debtInvoices}
                title="Công nợ"
                emptyText="Không còn công nợ với NCC"
              />
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
