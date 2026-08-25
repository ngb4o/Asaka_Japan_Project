"use client";

import { useCallback, useEffect, useState } from "react";
import {
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
  MobileRecordCard,
  MobileStatTile,
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

  function handlePrint() {
    if (!viewingQuote) return;
    printQuoteDocument({ quote: viewingQuote });
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
                <div className="flex flex-col gap-2.5">
                  {items.map((item) => {
                    const totalValue = item.lines.reduce(
                      (sum, line) =>
                        sum +
                        calculateLineTotal(
                          line.costPrice,
                          line.marginPercent,
                          line.quantity
                        ),
                      0
                    );
                    const dealerCount = item.dealerIds?.length || 0;
                    return (
                      <MobileRecordCard key={item.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-[var(--color-text-primary)]">
                              {item.name}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <MobileStatTile label="Sản phẩm">
                            {item.lines.length}
                          </MobileStatTile>
                          <MobileStatTile label="Đại lý">
                            {dealerCount}
                          </MobileStatTile>
                          <MobileStatTile label="Tổng">
                            {formatCurrency(totalValue)}
                          </MobileStatTile>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          {item.dealerIds?.map((id) => (
                            <MobileMetaChip key={id}>
                              {getDealerName(id)}
                            </MobileMetaChip>
                          ))}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <MobileMetaChip>
                            % LN: {item.defaultMarginPercent}%
                          </MobileMetaChip>
                          <MobileMetaChip>
                            {formatDateDisplay(item.createdAt)}
                          </MobileMetaChip>
                        </div>

                        {canEdit ? (
                          <div className="mt-3 flex justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-3">
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
                        ) : null}
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