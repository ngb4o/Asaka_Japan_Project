"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
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
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { SearchableSelect, STATUS_OPTIONS } from "@/components/ui/searchable-select";
import {
  convertLeadToDealer,
  deleteLead,
  getLeads,
  updateLead,
} from "@/lib/api/leads";
import type { Lead } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE, shouldReloadPreviousPage } from "@/lib/pagination";

const LEAD_TYPE_LABELS: Record<Lead["type"], string> = {
  contact: "Liên hệ",
  dealer: "Đăng ký đại lý",
};

const LEAD_STATUS_LABELS: Record<Lead["status"], string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  qualified: "Tiềm năng",
  converted: "Đã chuyển đổi",
  closed: "Đóng",
};

export default function LeadsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Lead["status"]>("new");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getLeads({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: DEFAULT_PAGE_SIZE,
      });
      setItems(result.items);
      if (shouldReloadPreviousPage(result, page)) {
        setPage(result.totalPages);
        return;
      }
      setPage(result.page);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
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
      await loadData();
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
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    }
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.warehouses} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lead liên hệ</h1>
        <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
          Quản lý yêu cầu liên hệ và đăng ký đại lý từ website
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách lead</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Tìm theo tên, SĐT, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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
              <div className="overflow-x-auto">
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
                          <Badge variant={item.status === "new" ? "success" : "muted"}>
                            {LEAD_STATUS_LABELS[item.status]}
                          </Badge>
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
                onPageChange={setPage}
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
                <Button onClick={handleSave} disabled={submitting}>
                  {submitting ? "Đang lưu..." : "Lưu"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
