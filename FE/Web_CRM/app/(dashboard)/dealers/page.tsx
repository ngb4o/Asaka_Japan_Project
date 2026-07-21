"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
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
import { DealerDetailDialog } from "@/components/dealers/DealerDetailDialog";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { SearchableSelect, STATUS_OPTIONS } from "@/components/ui/searchable-select";
import {
  createDealer,
  deleteDealer,
  getDealers,
  updateDealer,
} from "@/lib/api/dealers";
import type { Dealer } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE, shouldReloadPreviousPage } from "@/lib/pagination";

type DealerFormValues = {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  region: string;
  tier: Dealer["tier"];
  discountPercent: number | "";
  status: Dealer["status"];
  note: string;
};

const EMPTY_FORM: DealerFormValues = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  region: "",
  tier: "standard",
  discountPercent: 0,
  status: "pending",
  note: "",
};

const TIER_LABELS: Record<Dealer["tier"], string> = {
  standard: "Tiêu chuẩn",
  silver: "Bạc",
  gold: "Vàng",
};

export default function DealersPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<Dealer | null>(null);
  const [editing, setEditing] = useState<Dealer | null>(null);
  const [form, setForm] = useState<DealerFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDealers({
        search: search || undefined,
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
  }, [search, page, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openDetail(item: Dealer) {
    setViewing(item);
    setDetailOpen(true);
  }

  function openEdit(item: Dealer) {
    setEditing(item);
    setForm({
      name: item.name,
      contactName: item.contactName,
      phone: item.phone,
      email: item.email,
      address: item.address,
      region: item.region,
      tier: item.tier,
      discountPercent: item.discountPercent,
      status: item.status,
      note: item.note,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.warning("Vui lòng nhập tên công ty/đại lý");
      return;
    }
    if (!form.phone.trim()) {
      toast.warning("Vui lòng nhập số điện thoại");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        region: form.region.trim(),
        tier: form.tier,
        discountPercent: Number(form.discountPercent) || 0,
        status: form.status,
        note: form.note.trim(),
      };

      if (editing) {
        await updateDealer(editing.id, payload);
        toast.success("Đã cập nhật đại lý");
      } else {
        await createDealer(payload);
        toast.success("Đã thêm đại lý");
      }
      setDialogOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: Dealer) {
    const confirmed = await confirm({
      title: "Xóa đại lý",
      description: `Xóa đại lý "${item.name}"?`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteDealer(item.id);
      toast.success("Đã xóa đại lý");
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Đại lý</h1>
          <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
            Quản lý đại lý — xem sản phẩm, số lượng và giá theo báo giá/đơn hàng
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm đại lý
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đại lý</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Tìm theo tên, SĐT, khu vực..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có đại lý</p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                      <th className="px-2 py-3 font-medium">Tên</th>
                      <th className="px-2 py-3 font-medium">Liên hệ</th>
                      <th className="px-2 py-3 font-medium">Khu vực</th>
                      <th className="px-2 py-3 font-medium">Hạng</th>
                      <th className="px-2 py-3 font-medium">Trạng thái</th>
                      <th className="px-2 py-3 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                        <td className="px-2 py-3 font-medium">{item.name}</td>
                        <td className="px-2 py-3">
                          <p>{item.contactName || "—"}</p>
                          <p className="text-xs text-[var(--color-text-inverse)]">{item.phone}</p>
                        </td>
                        <td className="px-2 py-3">{item.region || "—"}</td>
                        <td className="px-2 py-3">{TIER_LABELS[item.tier]}</td>
                        <td className="px-2 py-3">
                          <Badge variant={item.status === "active" ? "success" : "muted"}>
                            {item.status === "active"
                              ? "Hoạt động"
                              : item.status === "pending"
                                ? "Chờ duyệt"
                                : "Ngưng"}
                          </Badge>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetail(item)}
                              title="Xem sản phẩm / đơn hàng"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
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

      <DealerDetailDialog
        dealer={viewing}
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next);
          if (!next) setViewing(null);
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa đại lý" : "Thêm đại lý"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên công ty/đại lý *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">Người liên hệ</Label>
                <Input
                  id="contactName"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">SĐT *</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Khu vực</Label>
                <Input
                  id="region"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Hạng</Label>
                <SearchableSelect
                  options={STATUS_OPTIONS.dealerTier}
                  value={form.tier}
                  onChange={(value) => setForm({ ...form, tier: value as Dealer["tier"] })}
                  searchable={false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Chiết khấu (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  max={100}
                  value={form.discountPercent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discountPercent: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <SearchableSelect
                  options={STATUS_OPTIONS.dealer}
                  value={form.status}
                  onChange={(value) =>
                    setForm({ ...form, status: value as Dealer["status"] })
                  }
                  searchable={false}
                />
              </div>
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
    </div>
  );
}
