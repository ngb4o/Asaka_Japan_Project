"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import {
  MobileMetaChip,
  MobileRecordActions,
  MobileRecordCard,
} from "@/components/ui/mobile-record-card";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { rolesOf } from "@/lib/auth/permissions";
import {
  createQuote,
  deleteQuote,
  getQuote,
  getQuotes,
  updateQuote,
} from "@/lib/api/quotes";
import { getDealers } from "@/lib/api/dealers";
import {
  calculateLineTotal,
  QuoteLineTable,
} from "@/components/quotes/QuoteLineTable";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";
import { QuotePrintView } from "@/components/quotes/QuotePrintView";
import { printQuoteDocument } from "@/lib/print/quoteDocument";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { formatCurrency, formatDateDisplay } from "@/lib/utils";
import type { Quote, QuoteFormPayload } from "@/types/quote";

export default function QuotesPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const canEdit = rolesOf(user).some((r) => r === "admin" || r === "sales");

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [viewLoadingId, setViewLoadingId] = useState<string | null>(null);
  const [dealers, setDealers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    getDealers({ limit: 1000 })
      .then((res) => setDealers(res.items))
      .catch(() => {});
  }, []);

  function getDealerName(id: string) {
    return dealers.find((d) => d.id === id)?.name || id;
  }

  const fetchPage = useCallback(
    async (pageNum: number) => {
      return getQuotes({
        search: search || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      });
    },
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
    setItems,
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
  } = useMobilePagedList<Quote>({ fetchPage, onError });

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: Quote) {
    setEditing(item);
    setFormOpen(true);
  }

  async function handleSubmit(payload: QuoteFormPayload) {
    setSubmitting(true);
    try {
      if (editing) {
        const updated = await updateQuote(editing.id, payload);
        setItems((prev) =>
          prev.map((item) => (item.id === editing.id ? updated : item))
        );
        toast.success("Đã cập nhật báo giá");
      } else {
        await createQuote(payload);
        toast.success("Đã tạo báo giá");
        await reload();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: Quote) {
    const confirmed = await confirm({
      title: "Xóa báo giá",
      description: `Bạn có chắc muốn xóa "${item.name}"? Hành động này không thể hoàn tác.`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    setActionId(item.id);
    try {
      await deleteQuote(item.id);
      toast.success(`Đã xóa báo giá "${item.name}"`);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setActionId(null);
    }
  }

  async function openView(item: Quote) {
    setViewLoadingId(item.id);
    try {
      const detail = await getQuote(item.id);
      setViewingQuote(detail);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được chi tiết"
      );
    } finally {
      setViewLoadingId(null);
    }
  }

  async function handleDirectPrint(item: Quote) {
    setViewLoadingId(item.id);
    try {
      const detail = await getQuote(item.id);
      printQuoteDocument({ quote: detail });
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được chi tiết"
      );
    } finally {
      setViewLoadingId(null);
    }
  }

  async function handleDirectPrintAdmin(item: Quote) {
    setViewLoadingId(item.id);
    try {
      const detail = await getQuote(item.id);
      printQuoteDocument({ quote: detail, forAdmin: true });
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được chi tiết"
      );
    } finally {
      setViewLoadingId(null);
    }
  }

  function handlePrint() {
    if (!viewingQuote) return;
    printQuoteDocument({ quote: viewingQuote });
  }

  function handlePrintAdmin() {
    if (!viewingQuote) return;
    printQuoteDocument({ quote: viewingQuote, forAdmin: true });
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.dealers} />;
  }

  return (
    <div className="space-y-0 lg:space-y-2">
      <PageHeader
        title="Báo giá"
        actions={
          canEdit ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Tạo báo giá
            </Button>
          ) : null
        }
        fab={
          canEdit
            ? {
                onClick: openCreate,
                label: "Tạo báo giá",
              }
            : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách báo giá</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchInput
            placeholder="Tìm theo tên báo giá..."
            value={search}
            onSearch={setSearch}
            className="flex-1"
          />

          {items.length === 0 ? (
            <EmptyState
              title="Chưa có báo giá"
              description="Tạo bảng báo giá đầu tiên để áp dụng cho nhiều đại lý."
              action={
                canEdit ? (
                  <Button onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Tạo báo giá
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="space-y-4">
              <MobileInfiniteList
                onRefresh={refresh}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
                disabled={loading}>
                <div className="flex flex-col gap-3">
                  {items.map((item) => {
                    const totalValue = item.lines.reduce(
                      (sum, line) =>
                        sum +
                        calculateLineTotal(
                          line.costPrice,
                          line.marginPercent,
                          line.quantity,
                          line.overrideUnitPrice
                        ),
                      0
                    );
                    const dealerNames = (item.dealerIds || []).map(getDealerName);
                    const dealerSummary =
                      dealerNames.length === 0
                        ? "Chưa gán đại lý"
                        : dealerNames.length <= 2
                          ? dealerNames.join(", ")
                          : `${dealerNames.slice(0, 2).join(", ")} +${dealerNames.length - 2}`;
                    return (
                      <MobileRecordCard key={item.id} className="p-4">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                            {item.name}
                          </p>
                          <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                            {formatDateDisplay(item.createdAt)}
                            {" · "}
                            {item.lines.length} SP
                            {" · "}
                            LN {item.defaultMarginPercent}%
                          </p>
                        </div>

                        <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
                          <div className="min-w-0">
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              Tổng giá trị
                            </p>
                            <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-secondary)]">
                              {formatCurrency(totalValue)}
                            </p>
                          </div>
                          <div className="min-w-0 text-right">
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              Đại lý
                            </p>
                            <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                              {item.dealerIds?.length || 0}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 min-w-0">
                          <MobileMetaChip className="max-w-full">
                            {dealerSummary}
                          </MobileMetaChip>
                        </div>

                        <MobileRecordActions>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-w-9"
                            onClick={() => void openView(item)}
                            loading={viewLoadingId === item.id}
                            title="Xem">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-w-9 px-2.5"
                            onClick={() => void handleDirectPrint(item)}
                            loading={viewLoadingId === item.id}
                            title="In cho đại lý">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-2.5"
                            onClick={() => void handleDirectPrintAdmin(item)}
                            loading={viewLoadingId === item.id}
                            title="In nội bộ">
                            <Printer className="h-4 w-4" />
                            <span className="text-xs font-medium">NB</span>
                          </Button>
                          {canEdit ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 min-w-9"
                                onClick={() => openEdit(item)}
                                title="Sửa">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="h-9 min-w-9"
                                loading={actionId === item.id}
                                onClick={() => handleDelete(item)}
                                title="Xóa">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}
                        </MobileRecordActions>
                      </MobileRecordCard>
                    );
                  })}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden lg:block">
                <div className="crm-table-frame">
                  <table className="crm-data-table min-w-[640px]">
                    <thead>
                      <tr>
                        <th className="font-medium">Tên báo giá</th>
                        <th className="text-right font-medium">Số SP</th>
                        <th className="text-left font-medium">Đại lý</th>
                        <th className="text-right font-medium">% LN mặc định</th>
                        <th className="text-right font-medium">Ngày tạo</th>
                        {canEdit ? (
                          <th className="text-right font-medium">Thao tác</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="font-medium">{item.name}</td>
                          <td className="text-right tabular-nums">
                            {item.lines.length}
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {item.dealerIds?.map((id) => (
                                <span
                                  key={id}
                                  className="inline-block rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-2 py-0.5 text-xs">
                                  {getDealerName(id)}
                                </span>
                              ))}
                              {!item.dealerIds?.length && (
                                <span className="text-xs text-[var(--color-text-inverse)]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="text-right tabular-nums">
                            {item.defaultMarginPercent}%
                          </td>
                          <td className="text-right text-[var(--color-text-inverse)]">
                            {formatDateDisplay(item.createdAt)}
                          </td>
                          {canEdit ? (
                            <td>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 w-9 p-0"
                                  onClick={() => void handleDirectPrint(item)}
                                  loading={viewLoadingId === item.id}
                                  title="In">
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 w-9 p-0"
                                  onClick={() => void handleDirectPrintAdmin(item)}
                                  loading={viewLoadingId === item.id}
                                  title="In cho Admin">
                                  <Printer className="h-4 w-4" />
                                  <span className="sr-only">A</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 w-9 p-0"
                                  onClick={() => openEdit(item)}
                                  title="Sửa">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  className="h-9 w-9 p-0"
                                  loading={actionId === item.id}
                                  onClick={() => handleDelete(item)}
                                  title="Xóa">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

      <QuoteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSubmit={handleSubmit}
      />

      <Dialog
        open={viewingQuote !== null}
        onOpenChange={(open) => !open && setViewingQuote(null)}>
        <DialogContent className="max-w-[860px]">
          <DialogHeader>
            <DialogTitle>In báo giá</DialogTitle>
          </DialogHeader>
          {viewingQuote ? (
            <div className="space-y-4">
              <div className="no-print flex justify-end gap-2">
                <Button variant="outline" onClick={handlePrintAdmin}>
                  <Printer className="h-4 w-4" />
                  In cho Admin
                </Button>
                <Button variant="print" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  In / Xuất PDF
                </Button>
              </div>
              <QuotePrintView quote={viewingQuote} />
              <details className="no-print rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Xem bảng tính chi tiết
                </summary>
                <div className="mt-3">
                  <QuoteLineTable
                    lines={viewingQuote.lines}
                    defaultMargin={viewingQuote.defaultMarginPercent}
                    onChange={() => {
                      /* view-only */
                    }}
                    disabled
                  />
                </div>
              </details>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}