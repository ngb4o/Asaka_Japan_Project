"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import {
  MobileMetaChip,
  MobileRecordActions,
  MobileRecordCard,
} from "@/components/ui/mobile-record-card";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { SearchableSelect, STATUS_OPTIONS } from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  convertLeadToDealer,
  deleteLead,
  getLeads,
  updateLead,
} from "@/lib/api/leads";
import type { Lead } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { leadStatusBadgeVariant } from "@/lib/status-badge";
import { Badge } from "@/components/ui/badge";

const LEAD_TYPE_LABELS: Record<Lead["type"], string> = {
  contact: "Liên hệ",
  dealer: "Đăng ký đại lý",
};

export default function LeadsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Lead["status"]>("new");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchPage = useCallback(
    (pageNum: number) =>
      getLeads({
        search: search || undefined,
        status: statusFilter || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [search, statusFilter]
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
  } = useMobilePagedList<Lead>({ fetchPage, onError });

  useEffect(() => {
    void reload();
    // Reload when filter query changes (fetchPage identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  function openDetail(lead: Lead) {
    setSelected(lead);
    setNote(lead.note || "");
    setStatus(lead.status);
  }

  async function handleSave() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await updateLead(selected.id, { status, note });
      toast.success("Đã cập nhật lead");
      setSelected(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickStatus(item: Lead, nextStatus: Lead["status"]) {
    if (nextStatus === item.status) return;

    setUpdatingId(item.id);
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, status: nextStatus } : row
      )
    );
    if (selected?.id === item.id) {
      setStatus(nextStatus);
      setSelected({ ...item, status: nextStatus });
    }

    try {
      await updateLead(item.id, { status: nextStatus });
      toast.success("Đã cập nhật trạng thái");
    } catch (err) {
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? item : row))
      );
      if (selected?.id === item.id) {
        setStatus(item.status);
        setSelected(item);
      }
      toast.error(
        err instanceof ApiClientError ? err.message : "Cập nhật thất bại"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleConvert(lead: Lead) {
    const confirmed = await confirm({
      title: "Chuyển thành đại lý",
      description: `Tạo đại lý từ lead "${lead.name}"?`,
      confirmText: "Chuyển đổi",
      cancelText: "Hủy",
    });
    if (!confirmed) return;

    try {
      await convertLeadToDealer(lead.id);
      toast.success("Đã tạo đại lý từ lead");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Chuyển đổi thất bại");
    }
  }

  async function handleDelete(lead: Lead) {
    const confirmed = await confirm({
      title: "Xóa lead",
      description: `Xóa lead "${lead.name}"?`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteLead(lead.id);
      toast.success("Đã xóa lead");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    }
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.warehouses} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead liên hệ"
        description="Quản lý yêu cầu liên hệ và đăng ký đại lý từ website"
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách lead</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Tìm theo tên, SĐT, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <SearchableSelect
              options={[{ value: "", label: "Tất cả trạng thái" }, ...STATUS_OPTIONS.lead]}
              value={statusFilter}
              onChange={setStatusFilter}
              searchable={false}
              clearable
            />
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có lead</p>
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
                  {items.map((item) => (
                    <MobileRecordCard key={item.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            className="font-semibold tracking-tight text-[var(--color-text-primary)] hover:text-[var(--color-text-secondary)]"
                            onClick={() => openDetail(item)}
                          >
                            {item.name}
                          </button>
                          {item.company ? (
                            <p className="mt-0.5 truncate text-sm text-[var(--color-text-inverse)]">
                              {item.company}
                            </p>
                          ) : null}
                        </div>
                        <Badge
                          variant={leadStatusBadgeVariant(item.status)}
                          className="shrink-0"
                        >
                          {STATUS_OPTIONS.lead.find((o) => o.value === item.status)?.label ||
                            item.status}
                        </Badge>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {item.phone ? <MobileMetaChip>{item.phone}</MobileMetaChip> : null}
                        <MobileMetaChip>{LEAD_TYPE_LABELS[item.type]}</MobileMetaChip>
                        <MobileMetaChip>
                          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                        </MobileMetaChip>
                        {item.email ? <MobileMetaChip>{item.email}</MobileMetaChip> : null}
                        {item.region ? <MobileMetaChip>{item.region}</MobileMetaChip> : null}
                      </div>

                      <MobileRecordActions>
                        {!item.dealerId && item.type === "dealer" ? (
                          <Button variant="outline" size="sm" onClick={() => handleConvert(item)}>
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button variant="danger" size="sm" onClick={() => handleDelete(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </MobileRecordActions>
                    </MobileRecordCard>
                  ))}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden md:block">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                      <th className="px-2 py-3 font-medium">Tên</th>
                      <th className="px-2 py-3 font-medium">SĐT</th>
                      <th className="px-2 py-3 font-medium">Loại</th>
                      <th className="px-2 py-3 font-medium">Trạng thái</th>
                      <th className="px-2 py-3 font-medium">Ngày</th>
                      <th className="px-2 py-3 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            className="font-medium text-left hover:text-[var(--color-text-secondary)]"
                            onClick={() => openDetail(item)}
                          >
                            {item.name}
                          </button>
                          {item.company ? (
                            <p className="text-xs text-[var(--color-text-inverse)]">{item.company}</p>
                          ) : null}
                        </td>
                        <td className="px-2 py-3">{item.phone}</td>
                        <td className="px-2 py-3">{LEAD_TYPE_LABELS[item.type]}</td>
                        <td className="px-2 py-3">
                          <div className="w-[160px]">
                            <SearchableSelect
                              options={STATUS_OPTIONS.lead}
                              value={item.status}
                              onChange={(value) =>
                                handleQuickStatus(item, value as Lead["status"])
                              }
                              searchable={false}
                              disabled={updatingId === item.id}
                              triggerClassName="h-8 text-xs"
                            />
                          </div>
                        </td>
                        <td className="px-2 py-3 text-[var(--color-text-inverse)]">
                          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-2">
                            {!item.dealerId && item.type === "dealer" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConvert(item)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            ) : null}
                            <Button variant="danger" size="sm" onClick={() => handleDelete(item)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                onPageChange={goToPage}
                disabled={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chi tiết lead</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[var(--color-text-inverse)]">Tên</p>
                  <p className="font-medium">{selected.name}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-inverse)]">SĐT</p>
                  <p className="font-medium">{selected.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-inverse)]">Email</p>
                  <p>{selected.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-inverse)]">Khu vực</p>
                  <p>{selected.region || "—"}</p>
                </div>
              </div>
              {selected.message ? (
                <div>
                  <p className="text-xs text-[var(--color-text-inverse)]">Nội dung</p>
                  <p className="whitespace-pre-wrap text-sm">{selected.message}</p>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <SearchableSelect
                  options={STATUS_OPTIONS.lead}
                  value={status}
                  onChange={(value) => setStatus(value as Lead["status"])}
                  searchable={false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-note">Ghi chú nội bộ</Label>
                <Textarea
                  id="lead-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Đóng
                </Button>
                <Button onClick={handleSave} loading={submitting}>
                  Lưu
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
