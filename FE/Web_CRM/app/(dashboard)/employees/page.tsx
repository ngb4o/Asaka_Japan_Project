"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Pencil, Plus, RefreshCw, Trash2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { VndInput } from "@/components/ui/vnd-input";
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
import { CodeText, Copyable, PhoneLink } from "@/components/ui/smart-text";
import { ImageUpload } from "@/components/products/ImageUpload";
import { EmployeeDetailDialog } from "@/components/employees/EmployeeDetailDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canManageEmployees, canViewEmployeesPage, rolesOf } from "@/lib/auth/permissions";
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee,
} from "@/lib/api/employees";
import { getUsers } from "@/lib/api/users";
import type { Employee, UserProfile } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { useDeferredFilters } from "@/lib/hooks/useDeferredFilters";
import { cn, formatCurrency } from "@/lib/utils";
import { statusBadgeVariant } from "@/lib/status-badge";

type FormValues = {
  code: string;
  fullName: string;
  phone: string;
  email: string;
  title: string;
  department: string;
  userId: string;
  baseSalary: number | "";
  commissionPercent: number | "";
  allowance: number | "";
  bankAccount: string;
  bankName: string;
  bankQrImage: string;
  status: Employee["status"];
  note: string;
};

const EMPTY_FORM: FormValues = {
  code: "",
  fullName: "",
  phone: "",
  email: "",
  title: "",
  department: "",
  userId: "",
  baseSalary: 0,
  commissionPercent: 0,
  allowance: 0,
  bankAccount: "",
  bankName: "",
  bankQrImage: "",
  status: "active",
  note: "",
};

const EMPTY_LIST_FILTERS = { status: "" };

export default function EmployeesPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const canEdit = canManageEmployees(rolesOf(user));
  const allowed = canViewEmployeesPage(rolesOf(user));
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const filters = useDeferredFilters(EMPTY_LIST_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<Employee | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPage = useCallback(
    (pageNum: number) =>
      getEmployees({
        search: search || undefined,
        status: filters.applied.status || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [search, filters.applied.status]
  );

  const onError = useCallback(
    (err: unknown) => {
      toast.error(err instanceof ApiClientError ? err.message : "Không tải được dữ liệu");
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
  } = useMobilePagedList<Employee>({ fetchPage, onError });

  const loadUsers = useCallback(async () => {
    if (!canEdit) {
      setUsers([]);
      return;
    }
    try {
      const usersResult = await getUsers().catch(() => ({ items: [], total: 0 }));
      setUsers(usersResult.items || []);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Không tải được dữ liệu");
    }
  }, [canEdit, toast]);

  useEffect(() => {
    if (!allowed) return;
    void reload();
    // Reload when filter query changes (fetchPage identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, fetchPage]);

  useEffect(() => {
    if (!allowed) return;
    void loadUsers();
  }, [allowed, loadUsers]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openDetail(item: Employee) {
    setViewing(item);
    setDetailOpen(true);
  }

  function openEdit(item: Employee) {
    setEditing(item);
    setForm({
      code: item.code,
      fullName: item.fullName,
      phone: item.phone || "",
      email: item.email || "",
      title: item.title || "",
      department: item.department || "",
      userId: item.userId || "",
      baseSalary: item.baseSalary || 0,
      commissionPercent: item.commissionPercent || 0,
      allowance: item.allowance || 0,
      bankAccount: item.bankAccount || "",
      bankName: item.bankName || "",
      bankQrImage: item.bankQrImage || "",
      status: item.status,
      note: item.note || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.fullName.trim()) {
      toast.warning("Nhập họ tên nhân viên");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code: form.code.trim() || undefined,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        title: form.title.trim(),
        department: form.department.trim(),
        userId: form.userId || null,
        baseSalary: Number(form.baseSalary) || 0,
        commissionPercent: Number(form.commissionPercent) || 0,
        allowance: Number(form.allowance) || 0,
        bankAccount: form.bankAccount.trim(),
        bankName: form.bankName.trim(),
        bankQrImage: form.bankQrImage.trim(),
        status: form.status,
        note: form.note.trim(),
      };
      if (editing) {
        await updateEmployee(editing.id, payload);
        toast.success("Đã cập nhật nhân viên");
      } else {
        await createEmployee(payload);
        toast.success("Đã tạo nhân viên");
      }
      setDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickStatus(
    item: Employee,
    status: Employee["status"]
  ) {
    if (!canEdit || status === item.status) return;

    setActionId(`status:${item.id}`);
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, status } : row))
    );

    try {
      await updateEmployee(item.id, { status });
      toast.success("Đã cập nhật trạng thái");
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

  async function handleDelete(item: Employee) {
    const ok = await confirm({
      title: "Xóa nhân viên",
      description: `Xóa nhân viên "${item.fullName}"?`,
      confirmText: "Xóa",
      variant: "danger",
    });
    if (!ok) return;
    setActionId(item.id);
    try {
      await deleteEmployee(item.id);
      toast.success("Đã xóa nhân viên");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setActionId(null);
    }
  }

  if (!allowed) {
    return (
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-8 text-center">
        <h1 className="text-xl font-semibold">Không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-[var(--color-text-inverse)]">
          Hồ sơ nhân viên chỉ dành cho Quản trị và Kế toán.
        </p>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.employees} />;
  }

  return (
    <div className="space-y-0 lg:space-y-2">
      <PageHeader
        title="Hồ sơ nhân viên"
        actions={
          canEdit ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Thêm nhân viên
            </Button>
          ) : null
        }
        fab={
          canEdit ? { onClick: openCreate, label: "Thêm nhân viên" } : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách nhân viên</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <SearchInput
              placeholder="Tìm theo tên, mã, SĐT..."
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
            title="Bộ lọc nhân viên"
            onClear={filters.clearDraft}
            onApply={filters.apply}
            draftCount={filters.draftCount}>
            <FilterOptionList
              label="Trạng thái"
              value={filters.draft.status}
              onChange={(value) => filters.setDraftValue("status", value)}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                ...STATUS_OPTIONS.employee,
              ]}
            />
          </FilterDrawer>
          {items.length === 0 ? (
            <EmptyState title="Chưa có nhân viên" />
          ) : (
            <div className="space-y-4">
              <MobileInfiniteList
                onRefresh={refresh}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
                disabled={loading}>
                <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <MobileRecordCard key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                          {item.code ? (
                            <CodeText value={item.code} label="mã nhân viên" />
                          ) : (
                            "—"
                          )}
                        </p>
                        <p className="mt-1 text-[16px] font-medium leading-snug text-[var(--color-text-primary)]">
                          {item.fullName}
                        </p>
                        {item.phone ? (
                          <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                            <PhoneLink value={item.phone} />
                          </p>
                        ) : null}
                        {item.email ? (
                          <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">
                            <Copyable
                              value={item.email}
                              label="email"
                              className="text-xs text-[var(--color-text-secondary)]"
                            />
                          </p>
                        ) : null}
                      </div>
                      <Badge
                        variant={statusBadgeVariant(item.status)}
                        className="shrink-0">
                        {item.status === "active" ? "Đang làm" : "Ngưng"}
                      </Badge>
                    </div>

                    <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
                      <div>
                        <p className="text-xs text-[var(--color-text-inverse)]">
                          Lương cứng
                        </p>
                        <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-secondary)]">
                          {formatCurrency(item.baseSalary)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[var(--color-text-inverse)]">
                          HH / Phụ cấp
                        </p>
                        <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                          {item.commissionPercent}% · {formatCurrency(item.allowance)}
                        </p>
                      </div>
                    </div>

                    {(item.title || item.department || item.userName) ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {item.title ? <MobileMetaChip>{item.title}</MobileMetaChip> : null}
                        {item.department ? (
                          <MobileMetaChip>{item.department}</MobileMetaChip>
                        ) : null}
                        {item.userName ? (
                          <MobileMetaChip>TK: {item.userName}</MobileMetaChip>
                        ) : null}
                      </div>
                    ) : null}

                    <div
                      className={cn(
                        "mt-3.5 flex flex-wrap justify-end gap-2",
                        (item.title || item.department || item.userName) &&
                          "border-t border-[var(--color-border-subtle)] pt-3.5"
                      )}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 min-w-9"
                        onClick={() => openDetail(item)}
                        title="Xem chi tiết">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit ? (
                        <>
                          <SearchableSelect
                            options={STATUS_OPTIONS.employee}
                            value={item.status}
                            onChange={(value) =>
                              void handleQuickStatus(
                                item,
                                value as Employee["status"]
                              )
                            }
                            searchable={false}
                            placeholder="Đổi trạng thái"
                            disabled={actionId === `status:${item.id}`}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 min-w-9"
                                title="Đổi trạng thái"
                                loading={actionId === `status:${item.id}`}>
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            }
                          />
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
                    </div>
                  </MobileRecordCard>
                ))}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden lg:block">
              <div className="crm-table-frame">
                <table className="crm-data-table min-w-[900px]">
                <thead>
                  <tr>
                    <th className="font-medium">Mã</th>
                    <th className="font-medium">Họ tên</th>
                    <th className="font-medium">Chức vụ</th>
                    <th className="font-medium">Lương / HH</th>
                    <th className="font-medium">TK CRM</th>
                    <th className="font-medium">Trạng thái</th>
                    <th className="text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">
                        {item.code ? (
                          <CodeText value={item.code} label="mã nhân viên" />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <p>{item.fullName}</p>
                        <div className="space-y-0.5 text-xs text-[var(--color-text-inverse)]">
                          {item.phone ? <PhoneLink value={item.phone} /> : null}
                          {item.email ? (
                            <Copyable
                              value={item.email}
                              label="email"
                              className="text-xs text-[var(--color-text-inverse)]"
                            />
                          ) : null}
                          {!item.phone && !item.email ? "—" : null}
                        </div>
                      </td>
                      <td>
                        {item.title || "—"}
                        {item.department ? (
                          <p className="text-xs text-[var(--color-text-inverse)]">{item.department}</p>
                        ) : null}
                      </td>
                      <td>
                        <p>{formatCurrency(item.baseSalary)}</p>
                        <p className="text-xs text-[var(--color-text-inverse)]">
                          HH {item.commissionPercent}% - PC {formatCurrency(item.allowance)}
                        </p>
                      </td>
                      <td>{item.userName || "—"}</td>
                      <td>
                        {canEdit ? (
                          <div className="w-[140px]">
                            <SearchableSelect
                              options={STATUS_OPTIONS.employee}
                              value={item.status}
                              onChange={(value) =>
                                void handleQuickStatus(
                                  item,
                                  value as Employee["status"]
                                )
                              }
                              searchable={false}
                              disabled={actionId === `status:${item.id}`}
                              triggerClassName="h-8 text-xs"
                            />
                          </div>
                        ) : (
                          <Badge variant={item.status === "active" ? "success" : "muted"}>
                            {item.status === "active" ? "Đang làm" : "Ngưng"}
                          </Badge>
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetail(item)}
                            title="Xem chi tiết">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(item)}
                                title="Sửa">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                loading={actionId === item.id}
                                onClick={() => handleDelete(item)} title="Xóa">
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
            </div>
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={DEFAULT_PAGE_SIZE}
            onPageChange={goToPage}
            disabled={loading}
          />
        </CardContent>
      </Card>

      <EmployeeDetailDialog
        employee={viewing}
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next);
          if (!next) setViewing(null);
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa nhân viên" : "Thêm nhân viên"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Họ tên *</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mã NV</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Tự tạo nếu để trống"
              />
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <SearchableSelect
                options={STATUS_OPTIONS.employee}
                value={form.status}
                onChange={(value) => setForm({ ...form, status: value as Employee["status"] })}
                searchable={false}
              />
            </div>
            <div className="space-y-2">
              <Label>SĐT</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Chức vụ</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Phòng ban</Label>
              <Input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Tài khoản CRM</Label>
              <SearchableSelect
                options={[
                  { value: "", label: "Không liên kết" },
                  ...users.map((item) => ({
                    value: item.id,
                    label: `${item.username} (${item.email})`,
                  })),
                ]}
                value={form.userId}
                onChange={(userId) => setForm({ ...form, userId })}
                placeholder="Liên kết để tính hoa hồng"
              />
            </div>
            <div className="space-y-2">
              <Label>Lương cứng</Label>
              <VndInput
                value={form.baseSalary}
                onValueChange={(baseSalary) => setForm({ ...form, baseSalary })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phụ cấp</Label>
              <VndInput
                value={form.allowance}
                onValueChange={(allowance) => setForm({ ...form, allowance })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hoa hồng (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                inputMode="decimal"
                value={form.commissionPercent}
                onChange={(e) =>
                  setForm({
                    ...form,
                    commissionPercent: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tên ngân hàng</Label>
              <Input
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="VD: Vietcombank, MB Bank..."
              />
            </div>
            <div className="space-y-2">
              <Label>Số tài khoản</Label>
              <Input
                value={form.bankAccount}
                onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <ImageUpload
                label="Ảnh QR ngân hàng"
                value={form.bankQrImage}
                onChange={(bankQrImage) => setForm({ ...form, bankQrImage })}
                max={1}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Ghi chú</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
