"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Pencil, Plus, RefreshCw, Trash2 } from "@/components/ui/icons";
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
import { SearchInput } from "@/components/ui/search-input";
import {
  FilterDrawer,
  FilterOptionList,
  FilterTrigger,
} from "@/components/ui/filter-drawer";
import { EmptyState } from "@/components/ui/empty-state";
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
import { PhoneLink, Copyable } from "@/components/ui/smart-text";
import {
  SearchableSelect,
  STATUS_OPTIONS,
} from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import { SupplierDetailDialog } from "@/components/suppliers/SupplierDetailDialog";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  canManageSuppliers,
  canViewSuppliers,
  rolesOf,
} from "@/lib/auth/permissions";
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  getSuppliers,
  updateSupplier,
} from "@/lib/api/suppliers";
import type { Supplier, SupplierInput } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { useDeferredFilters } from "@/lib/hooks/useDeferredFilters";
import { useDeepLinkOpen } from "@/lib/hooks/useDeepLinkOpen";
import { Badge } from "@/components/ui/badge";
import { statusBadgeVariant } from "@/lib/status-badge";

const EMPTY_FORM: SupplierInput = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  taxCode: "",
  status: "active",
  note: "",
};

const EMPTY_LIST_FILTERS = { status: "" };

export default function SuppliersPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const roles = rolesOf(user);
  const allowed = canViewSuppliers(roles);
  const canWrite = canManageSuppliers(roles);

  const [search, setSearch] = useState("");
  const filters = useDeferredFilters(EMPTY_LIST_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<Supplier | null>(null);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPage = useCallback(
    (pageNum: number) =>
      getSuppliers({
        search: search || undefined,
        status: filters.applied.status || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [search, filters.applied.status]
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
    refresh,
    loadMore,
    goToPage,
  } = useMobilePagedList<Supplier>({ fetchPage, onError });

  useEffect(() => {
    if (!allowed) return;
    void refresh();
  }, [allowed, fetchPage]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openDetail(item: Supplier) {
    setViewing(item);
    setDetailOpen(true);
  }

  useDeepLinkOpen(async (id) => {
    try {
      const supplier = await getSupplier(id);
      openDetail(supplier);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : "Không mở được nhà cung cấp"
      );
      throw err;
    }
  });

  function openEdit(item: Supplier) {
    setEditing(item);
    setForm({
      name: item.name,
      contactName: item.contactName || "",
      phone: item.phone,
      email: item.email || "",
      address: item.address || "",
      taxCode: item.taxCode || "",
      status: item.status,
      note: item.note || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) {
      toast.warning("Bạn không có quyền sửa nhà cung cấp");
      return;
    }
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.warning("Tên NCC tối thiểu 2 ký tự");
      return;
    }
    if (!form.phone.trim() || form.phone.trim().length < 8) {
      toast.warning("SĐT không hợp lệ");
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        const updated = await updateSupplier(editing.id, form);
        setItems((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        toast.success("Đã cập nhật nhà cung cấp");
      } else {
        await createSupplier(form);
        toast.success("Đã thêm nhà cung cấp");
        await refresh();
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickStatus(
    item: Supplier,
    status: Supplier["status"]
  ) {
    if (!canWrite || status === item.status) return;
    setActionId(`status:${item.id}`);
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, status } : row))
    );
    try {
      const updated = await updateSupplier(item.id, {
        name: item.name,
        contactName: item.contactName,
        phone: item.phone,
        email: item.email,
        address: item.address,
        taxCode: item.taxCode,
        note: item.note,
        status,
      });
      setItems((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row))
      );
      toast.success("Đã cập nhật trạng thái NCC");
    } catch (err) {
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? item : row))
      );
      toast.error(
        err instanceof ApiClientError ? err.message : "Cập nhật thất bại"
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(item: Supplier) {
    if (!canWrite) return;
    const ok = await confirm({
      title: "Xóa nhà cung cấp?",
      description: `Xóa “${item.name}”?`,
      confirmText: "Xóa",
      variant: "danger",
    });
    if (!ok) return;
    setActionId(item.id);
    try {
      await deleteSupplier(item.id);
      toast.success("Đã xóa nhà cung cấp");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setActionId(null);
    }
  }

  if (!allowed) {
    return (
      <div className="space-y-3">
        <PageHeader title="Nhà cung cấp" />
        <EmptyState title="Bạn không có quyền xem nhà cung cấp" />
      </div>
    );
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.suppliers} />;
  }

  return (
    <div className="space-y-0 lg:space-y-2">
      <PageHeader
        title="Nhà cung cấp"
        actions={
          canWrite ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Thêm NCC
            </Button>
          ) : null
        }
        fab={
          canWrite
            ? [
                {
                  onClick: openCreate,
                  label: "Thêm NCC",
                  icon: <Plus className="h-5 w-5" />,
                },
              ]
            : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách NCC</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <SearchInput
              placeholder="Tìm theo tên, SĐT, MST..."
              value={search}
              onSearch={setSearch}
              className="flex-1"
            />
            <FilterTrigger
              open={filters.open}
              activeCount={filters.appliedCount}
              onClick={() => filters.setOpen(true)}
            />
          </div>
          <FilterDrawer
            open={filters.open}
            onOpenChange={filters.setOpen}
            title="Bộ lọc NCC"
            onClear={filters.clearDraft}
            onApply={filters.apply}
            draftCount={filters.draftCount}>
            <FilterOptionList
              label="Trạng thái"
              value={filters.draft.status}
              onChange={(value) => filters.setDraftValue("status", value)}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                ...STATUS_OPTIONS.warehouse,
              ]}
            />
          </FilterDrawer>

          {items.length === 0 ? (
            <EmptyState title="Chưa có nhà cung cấp" />
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
                    const hasChips = Boolean(
                      item.taxCode || item.email || item.address
                    );
                    return (
                      <MobileRecordCard key={item.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                              {item.name}
                            </p>
                            {item.contactName ? (
                              <p className="mt-1 text-[16px] font-medium leading-snug text-[var(--color-text-primary)]">
                                {item.contactName}
                              </p>
                            ) : null}
                            {item.phone ? (
                              <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                                <PhoneLink value={item.phone} />
                              </p>
                            ) : null}
                            {item.address ? (
                              <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                                {item.address}
                              </p>
                            ) : null}
                          </div>
                          <Badge
                            variant={statusBadgeVariant(item.status)}
                            className="shrink-0">
                            {item.status === "active" ? "Hoạt động" : "Ngưng"}
                          </Badge>
                        </div>

                        {hasChips ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {item.taxCode ? (
                              <MobileMetaChip>
                                MST:{" "}
                                <Copyable
                                  value={item.taxCode}
                                  label="mã số thuế"
                                  className="text-[14px] font-medium text-[var(--color-text-primary)]"
                                />
                              </MobileMetaChip>
                            ) : null}
                            {item.email ? (
                              <MobileMetaChip>
                                <Copyable
                                  value={item.email}
                                  label="email"
                                  className="text-[14px] font-medium text-[var(--color-text-primary)]"
                                />
                              </MobileMetaChip>
                            ) : null}
                            {item.address ? (
                              <MobileMetaChip>{item.address}</MobileMetaChip>
                            ) : null}
                          </div>
                        ) : null}

                        <MobileRecordActions>
                          {canWrite ? (
                            <SearchableSelect
                              options={STATUS_OPTIONS.warehouse}
                              value={item.status}
                              onChange={(value) =>
                                void handleQuickStatus(
                                  item,
                                  value as Supplier["status"]
                                )
                              }
                              searchable={false}
                              placeholder="Đổi trạng thái"
                              disabled={actionId === `status:${item.id}`}
                              trigger={
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 min-w-9"
                                  title="Đổi trạng thái"
                                  loading={actionId === `status:${item.id}`}>
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              }
                            />
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 min-w-9"
                            onClick={() => openDetail(item)}
                            title="Xem chi tiết">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canWrite ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 min-w-9"
                                onClick={() => openEdit(item)}
                                title="Sửa">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                className="h-9 min-w-9"
                                loading={actionId === item.id}
                                onClick={() => void handleDelete(item)} title="Xóa">
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
                  <table className="crm-data-table min-w-[860px]">
                    <thead>
                      <tr>
                        <th>Tên</th>
                        <th>Liên hệ</th>
                        <th>SĐT</th>
                        <th>MST</th>
                        <th>Trạng thái</th>
                        <th className="text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="font-medium">{item.name}</td>
                          <td>{item.contactName || "—"}</td>
                          <td>
                            {item.phone ? <PhoneLink value={item.phone} /> : "—"}
                          </td>
                          <td className="text-[var(--color-text-inverse)]">
                            {item.taxCode ? (
                              <Copyable value={item.taxCode} label="mã số thuế" />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <Badge variant={statusBadgeVariant(item.status)}>
                              {item.status === "active" ? "Hoạt động" : "Ngưng"}
                            </Badge>
                          </td>
                          <td>
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDetail(item)}
                                title="Xem chi tiết">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canWrite ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEdit(item)}
                                    title="Sửa">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    loading={actionId === item.id}
                                    onClick={() => void handleDelete(item)} title="Xóa">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </td>
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

      <SupplierDetailDialog
        supplier={viewing}
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next);
          if (!next) setViewing(null);
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa nhà cung cấp" : "Thêm nhà cung cấp"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tên NCC *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Người liên hệ</Label>
                <Input
                  value={form.contactName || ""}
                  onChange={(e) =>
                    setForm({ ...form, contactName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>SĐT *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mã số thuế</Label>
                <Input
                  value={form.taxCode || ""}
                  onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Địa chỉ</Label>
              <Input
                value={form.address || ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <SearchableSelect
                options={STATUS_OPTIONS.warehouse}
                value={form.status || "active"}
                onChange={(status) =>
                  setForm({
                    ...form,
                    status: status as "active" | "inactive",
                  })
                }
                searchable={false}
              />
            </div>
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea
                value={form.note || ""}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
