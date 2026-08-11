"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, RefreshCw, Trash2 } from "@/components/ui/icons";
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
import {
  FilterDrawer,
  FilterOptionList,
  FilterTrigger,
} from "@/components/ui/filter-drawer";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import {
  MobileMetaChip,
  MobileRecordCard,
} from "@/components/ui/mobile-record-card";
import { SearchableSelect, STATUS_OPTIONS } from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canManageUsers, ROLE_LABELS, ALL_USER_ROLES, rolesOf } from "@/lib/auth/permissions";
import { getEmployees } from "@/lib/api/employees";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUserPassword,
  updateUserRole,
} from "@/lib/api/users";
import type { Employee, UserProfile, UserRole } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useDeferredFilters } from "@/lib/hooks/useDeferredFilters";

function randomPassword(length = 10) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "";
  const values = crypto.getRandomValues(new Uint8Array(length));
  for (const value of values) {
    result += alphabet[value % alphabet.length];
  }
  return result;
}

function normalizeUser(item: UserProfile): UserProfile {
  const nextRoles = rolesOf(item);
  return {
    ...item,
    roles: nextRoles.length ? nextRoles : item.role ? [item.role] : ["sales"],
    role: nextRoles[0] || item.role || "sales",
  };
}

function RoleCheckboxes({
  value,
  onChange,
  disabled,
  compact,
}: {
  value: UserRole[];
  onChange: (roles: UserRole[]) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  function toggle(role: UserRole) {
    if (disabled) return;
    if (value.includes(role)) {
      if (value.length <= 1) return;
      onChange(value.filter((item) => item !== role));
    } else {
      onChange([...value, role]);
    }
  }

  return (
    <div
      className={cn(
        compact ? "flex flex-wrap gap-1.5" : "grid grid-cols-2 gap-2"
      )}>
      {ALL_USER_ROLES.map((role) => {
        const checked = value.includes(role);
        return (
          <label
            key={role}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-lg border text-sm",
              compact ? "px-2 py-1 text-xs" : "gap-2 px-3 py-2",
              checked
                ? "border-[var(--color-text-secondary)] bg-[var(--color-surface-muted)]"
                : "border-[var(--color-border-subtle)]",
              disabled && "cursor-not-allowed opacity-50"
            )}>
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-[var(--color-text-secondary)]"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(role)}
            />
            <span>{ROLE_LABELS[role]}</span>
          </label>
        );
      })}
    </div>
  );
}

type CreateForm = {
  employeeId: string;
  email: string;
  password: string;
  roles: UserRole[];
};

const EMPTY_FORM: CreateForm = {
  employeeId: "",
  email: "",
  password: "",
  roles: ["sales"],
};

const EMPTY_LIST_FILTERS = { role: "" };

export default function UsersPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<UserProfile[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const filters = useDeferredFilters(EMPTY_LIST_FILTERS);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const isUserAction = (id: string, kind: "role" | "delete") =>
    updatingId === `${kind}:${id}`;
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [createdCreds, setCreatedCreds] = useState<{
    email: string;
    password: string;
    employeeName: string;
  } | null>(null);

  const availableEmployees = useMemo(
    () => employees.filter((item) => !item.userId),
    [employees]
  );

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const roleFilter = filters.applied.role;
    return items.filter((item) => {
      if (roleFilter) {
        const roles = item.roles?.length
          ? item.roles
          : item.role
            ? [item.role]
            : [];
        if (!roles.includes(roleFilter as UserRole)) return false;
      }
      if (!keyword) return true;
      const haystack = [
        item.employeeName,
        item.employeeCode,
        item.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [items, search, filters.applied.role]);

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const [usersResult, employeesResult] = await Promise.all([
        getUsers(),
        getEmployees({ status: "active", limit: 200, page: 1 }),
      ]);
      setItems(usersResult.items.map(normalizeUser));
      setEmployees(employeesResult.items || []);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được danh sách user"
      );
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (canManageUsers(rolesOf(user))) {
      void loadData();
    } else {
      setLoading(false);
    }
  }, [user, loadData]);

  function openCreate() {
    setForm({
      ...EMPTY_FORM,
      password: randomPassword(),
    });
    setCreateOpen(true);
  }

  function handleEmployeeChange(employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId);
    setForm((prev) => ({
      ...prev,
      employeeId,
      email: employee?.email || "",
    }));
  }

  async function handleRolesChange(item: UserProfile, roles: UserRole[]) {
    if (!roles.length) {
      toast.warning("Chọn ít nhất một vai trò");
      return;
    }
    const current = rolesOf(item).slice().sort().join(",");
    const next = roles.slice().sort().join(",");
    if (current === next) return;

    const previous = item;
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? normalizeUser({ ...row, roles, role: roles[0] })
          : row
      )
    );
    setUpdatingId(`role:${item.id}`);
    try {
      const updated = await updateUserRole(item.id, roles);
      setItems((prev) =>
        prev.map((row) =>
          row.id === updated.id ? normalizeUser(updated) : row
        )
      );
      toast.success("Đã cập nhật quyền");
    } catch (err) {
      setItems((prev) =>
        prev.map((row) => (row.id === previous.id ? previous : row))
      );
      toast.error(err instanceof ApiClientError ? err.message : "Cập nhật thất bại");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!form.employeeId) {
      toast.warning("Chọn nhân viên để gắn tài khoản");
      return;
    }
    if (!form.email.trim()) {
      toast.warning("Nhân viên chưa có email — vui lòng nhập email");
      return;
    }
    if (!form.roles.length) {
      toast.warning("Chọn ít nhất một vai trò");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createUser({
        employeeId: form.employeeId,
        email: form.email.trim(),
        password: form.password.trim() || undefined,
        roles: form.roles,
      });
      setCreateOpen(false);
      setCreatedCreds({
        email: created.email,
        password: created.temporaryPassword || form.password,
        employeeName: created.employeeName || "Nhân viên",
      });
      toast.success("Đã cấp tài khoản");
      await loadData({ silent: true });
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Tạo tài khoản thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!passwordTarget) return;
    const password = newPassword.trim() || randomPassword();
    if (password.length < 6) {
      toast.warning("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    setSubmitting(true);
    try {
      await updateUserPassword(passwordTarget.id, password);
      toast.success("Đã đặt lại mật khẩu");
      setPasswordTarget(null);
      setCreatedCreds({
        email: passwordTarget.email,
        password,
        employeeName: passwordTarget.employeeName || passwordTarget.email,
      });
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Đặt lại mật khẩu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: UserProfile) {
    if (item.id === user?.id) {
      toast.warning("Không thể xóa tài khoản đang đăng nhập");
      return;
    }
    const ok = await confirm({
      title: "Xóa tài khoản CRM",
      description: `Xóa tài khoản "${item.employeeName || item.email}"? Nhân viên sẽ được gỡ gắn và có thể cấp lại sau.`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!ok) return;

    setUpdatingId(`delete:${item.id}`);
    try {
      await deleteUser(item.id);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
      setEmployees((prev) =>
        prev.map((employee) =>
          employee.userId === item.id ? { ...employee, userId: null } : employee
        )
      );
      toast.success("Đã xóa tài khoản");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setUpdatingId(null);
    }
  }

  if (!canManageUsers(rolesOf(user))) {
    return (
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-8 text-center">
        <h1 className="text-xl font-semibold">Không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-[var(--color-text-inverse)]">
          Chỉ quản trị viên mới được phân quyền người dùng.
        </p>
      </div>
    );
  }

  if (loading) {
    return <PageSkeleton {...PAGE_SKELETONS.users} />;
  }

  return (
    <div className="space-y-0 lg:space-y-6">
      <PageHeader
        title="Người dùng & phân quyền"
        description="Chọn nhân viên để cấp tài khoản CRM - đăng nhập bằng email"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Cấp tài khoản
          </Button>
        }
        fab={{ onClick: openCreate, label: "Cấp tài khoản" }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách tài khoản ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <SearchInput
              placeholder="Tìm theo tên, mã, email..."
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
            title="Bộ lọc tài khoản"
            onClear={filters.clearDraft}
            onApply={filters.apply}
            draftCount={filters.draftCount}>
            <FilterOptionList
              label="Vai trò"
              value={filters.draft.role}
              onChange={(value) => filters.setDraftValue("role", value)}
              options={[
                { value: "", label: "Tất cả vai trò" },
                ...STATUS_OPTIONS.userRole,
              ]}
            />
          </FilterDrawer>
          {filteredItems.length === 0 ? (
            <EmptyState title="Chưa có tài khoản" />
          ) : (
            <>
              <MobileInfiniteList
                onRefresh={loadData}
                onLoadMore={() => {}}
                hasMore={false}
                disabled={loading}>
                <div className="flex flex-col gap-3">
                  {filteredItems.map((item) => {
                    const itemRoles = rolesOf(item);
                    const primaryRole = itemRoles[0] || item.role;
                    const extraRoles = itemRoles.slice(1);
                    const isSelf = item.id === user?.id;
                    const displayName =
                      item.employeeName || item.username || "—";

                    return (
                      <MobileRecordCard key={item.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                              {displayName}
                            </p>
                            {item.username &&
                            item.username !== displayName ? (
                              <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--color-text-primary)]">
                                {item.username}
                              </p>
                            ) : null}
                            <p className="mt-1 truncate text-sm text-[var(--color-text-inverse)]">
                              {item.email}
                            </p>
                            {item.employeeCode ? (
                              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                                {item.employeeCode}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <Badge variant="muted">
                              {ROLE_LABELS[primaryRole]}
                            </Badge>
                            {isSelf ? (
                              <Badge variant="success">Bạn</Badge>
                            ) : null}
                          </div>
                        </div>

                        {extraRoles.length > 0 ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {extraRoles.map((role) => (
                              <MobileMetaChip key={role}>
                                {ROLE_LABELS[role]}
                              </MobileMetaChip>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-3">
                          <p className="mb-1.5 text-xs font-medium text-[var(--color-text-inverse)]">
                            Vai trò
                          </p>
                          <RoleCheckboxes
                            compact
                            value={itemRoles}
                            disabled={isUserAction(item.id, "role")}
                            onChange={(roles) => handleRolesChange(item, roles)}
                          />
                        </div>

                        <div className="mt-3.5 flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-3.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-w-9"
                            title="Đặt lại mật khẩu"
                            onClick={() => {
                              setPasswordTarget(item);
                              setNewPassword(randomPassword());
                            }}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          {!isSelf ? (
                            <Button
                              variant="danger"
                              size="sm"
                              className="h-9 min-w-9"
                              title="Xóa tài khoản"
                              loading={isUserAction(item.id, "delete")}
                              onClick={() => handleDelete(item)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </MobileRecordCard>
                    );
                  })}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden lg:block">
              <div className="crm-table-frame">
                <table className="crm-data-table min-w-[820px]">
                <thead>
                  <tr>
                    <th className="font-medium">Nhân viên</th>
                    <th className="font-medium">Email đăng nhập</th>
                    <th className="font-medium">Vai trò</th>
                    <th className="text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">
                        {item.employeeName || "—"}
                        {item.employeeCode ? (
                          <span className="ml-2 text-xs text-[var(--color-text-inverse)]">
                            {item.employeeCode}
                          </span>
                        ) : null}
                        {item.id === user?.id ? (
                          <span className="ml-2 text-xs text-[var(--color-text-inverse)]">
                            (bạn)
                          </span>
                        ) : null}
                      </td>
                      <td>{item.email}</td>
                      <td>
                        <RoleCheckboxes
                          compact
                          value={rolesOf(item)}
                          disabled={isUserAction(item.id, "role")}
                          onChange={(roles) => handleRolesChange(item, roles)}
                        />
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPasswordTarget(item);
                              setNewPassword(randomPassword());
                            }}>
                            <KeyRound className="h-4 w-4" />
                            Đặt lại MK
                          </Button>
                          {item.id !== user?.id ? (
                            <Button
                              variant="danger"
                              size="sm"
                              loading={isUserAction(item.id, "delete")}
                              onClick={() => handleDelete(item)} title="Xóa">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cấp tài khoản cho nhân viên</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nhân viên *</Label>
              <SearchableSelect
                options={availableEmployees.map((item) => ({
                  value: item.id,
                  label: `${item.code} - ${item.fullName}${item.email ? ` - ${item.email}` : ""}`,
                }))}
                value={form.employeeId}
                onChange={handleEmployeeChange}
                placeholder={
                  availableEmployees.length
                    ? "Chọn nhân viên chưa có tài khoản"
                    : "Không còn nhân viên chưa gắn TK"
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email đăng nhập *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Tự điền từ hồ sơ nhân viên nếu có"
              />
            </div>
            <div className="space-y-2">
              <Label>Mật khẩu tạm</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm({ ...form, password: randomPassword() })}
                  title="Tạo mật khẩu ngẫu nhiên">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-[var(--color-text-inverse)]">
                Gửi mật khẩu này cho nhân viên. Họ có thể đổi sau khi đăng nhập.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Vai trò (có thể chọn nhiều)</Label>
              <RoleCheckboxes
                value={form.roles}
                onChange={(roles) => setForm({ ...form, roles })}
              />
              <p className="text-xs text-[var(--color-text-inverse)]">
                Ví dụ: Kinh doanh + Kho nếu một người vừa bán vừa xuất hàng.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                Cấp tài khoản
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passwordTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPasswordTarget(null);
        }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Đặt lại mật khẩu - {passwordTarget?.employeeName || passwordTarget?.email}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Mật khẩu mới</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewPassword(randomPassword())}
                  title="Tạo mật khẩu ngẫu nhiên">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordTarget(null)}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createdCreds !== null}
        onOpenChange={(open) => {
          if (!open) setCreatedCreds(null);
        }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thông tin đăng nhập</DialogTitle>
          </DialogHeader>
          {createdCreds ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-inverse)]">
                Gửi cho {createdCreds.employeeName}. Họ đăng nhập bằng email rồi đổi mật
                khẩu trong CRM.
              </p>
              <div className="space-y-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3 text-sm">
                <p>
                  <span className="text-[var(--color-text-inverse)]">Email: </span>
                  <span className="font-medium">{createdCreds.email}</span>
                </p>
                <p>
                  <span className="text-[var(--color-text-inverse)]">Mật khẩu: </span>
                  <span className="font-mono font-medium">{createdCreds.password}</span>
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                  await navigator.clipboard.writeText(
                  `Email: ${createdCreds.email}\nMật khẩu: ${createdCreds.password}`
                  );
                  toast.success("Đã copy");
                  }}>
                  Copy
                </Button>
                <Button type="button" onClick={() => setCreatedCreds(null)}>
                  Đóng
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
