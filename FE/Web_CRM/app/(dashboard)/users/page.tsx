"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import {
  MobileRecordActions,
  MobileRecordCard,
} from "@/components/ui/mobile-record-card";
import { SearchableSelect, STATUS_OPTIONS } from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canManageUsers, ROLE_LABELS } from "@/lib/auth/permissions";
import { statusBadgeVariant } from "@/lib/status-badge";
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

type CreateForm = {
  employeeId: string;
  email: string;
  password: string;
  role: UserRole;
};

const EMPTY_FORM: CreateForm = {
  employeeId: "",
  email: "",
  password: "",
  role: "sales",
};

export default function UsersPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<UserProfile[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResult, employeesResult] = await Promise.all([
        getUsers(),
        getEmployees({ status: "active", limit: 200, page: 1 }),
      ]);
      setItems(usersResult.items);
      setEmployees(employeesResult.items || []);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được danh sách user"
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (canManageUsers(user?.role)) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user?.role, loadData]);

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

  async function handleRoleChange(id: string, role: UserRole) {
    if (role === items.find((item) => item.id === id)?.role) return;
    setUpdatingId(id);
    try {
      await updateUserRole(id, role);
      toast.success("Đã cập nhật quyền");
      await loadData();
    } catch (err) {
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
    setSubmitting(true);
    try {
      const created = await createUser({
        employeeId: form.employeeId,
        email: form.email.trim(),
        password: form.password.trim() || undefined,
        role: form.role,
      });
      setCreateOpen(false);
      setCreatedCreds({
        email: created.email,
        password: created.temporaryPassword || form.password,
        employeeName: created.employeeName || "Nhân viên",
      });
      toast.success("Đã cấp tài khoản");
      await loadData();
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

    setUpdatingId(item.id);
    try {
      await deleteUser(item.id);
      toast.success("Đã xóa tài khoản");
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setUpdatingId(null);
    }
  }

  if (!canManageUsers(user?.role)) {
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
    return <PageSkeleton {...PAGE_SKELETONS.warehouses} />;
  }

  return (
    <div className="space-y-0 md:space-y-6">
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
          <CardTitle>Danh sách tài khoản ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có user</p>
          ) : (
            <>
              <MobileInfiniteList
                onRefresh={loadData}
                onLoadMore={() => {}}
                hasMore={false}
                disabled={loading}
              >
                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <MobileRecordCard key={item.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold tracking-tight text-[var(--color-text-primary)]">
                            {item.employeeName || "—"}
                            {item.employeeCode ? (
                              <span className="ml-2 text-xs font-normal text-[var(--color-text-inverse)]">
                                {item.employeeCode}
                              </span>
                            ) : null}
                            {item.id === user?.id ? (
                              <span className="ml-2 text-xs font-normal text-[var(--color-text-inverse)]">
                                (bạn)
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-[var(--color-text-inverse)]">
                            {item.email}
                          </p>
                        </div>
                        <Badge
                          variant={statusBadgeVariant(item.role)}
                          className="shrink-0"
                        >
                          {ROLE_LABELS[item.role] || item.role}
                        </Badge>
                      </div>

                      <div className="mt-2.5">
                        <SearchableSelect
                          options={STATUS_OPTIONS.userRole}
                          value={item.role}
                          onChange={(value) => handleRoleChange(item.id, value as UserRole)}
                          searchable={false}
                          disabled={updatingId === item.id}
                          triggerClassName="h-9 w-full text-xs"
                        />
                      </div>

                      <MobileRecordActions>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPasswordTarget(item);
                            setNewPassword(randomPassword());
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                          Đặt lại MK
                        </Button>
                        {item.id !== user?.id ? (
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={updatingId === item.id}
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </MobileRecordActions>
                    </MobileRecordCard>
                  ))}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden md:block">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                    <th className="px-2 py-3 font-medium">Nhân viên</th>
                    <th className="px-2 py-3 font-medium">Email đăng nhập</th>
                    <th className="px-2 py-3 font-medium">Vai trò hiện tại</th>
                    <th className="px-2 py-3 font-medium">Đổi quyền</th>
                    <th className="px-2 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                      <td className="px-2 py-3 font-medium">
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
                      <td className="px-2 py-3">{item.email}</td>
                      <td className="px-2 py-3">
                        <Badge variant={item.role === "admin" ? "success" : "muted"}>
                          {ROLE_LABELS[item.role] || item.role}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">
                        <div className="w-[180px]">
                          <SearchableSelect
                            options={STATUS_OPTIONS.userRole}
                            value={item.role}
                            onChange={(value) =>
                              handleRoleChange(item.id, value as UserRole)
                            }
                            searchable={false}
                            disabled={updatingId === item.id}
                            triggerClassName="h-8 text-xs"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPasswordTarget(item);
                              setNewPassword(randomPassword());
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                            Đặt lại MK
                          </Button>
                          {item.id !== user?.id ? (
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={updatingId === item.id}
                              onClick={() => handleDelete(item)}
                            >
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
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-[var(--color-text-inverse)]">
                Gửi mật khẩu này cho nhân viên. Họ có thể đổi sau khi đăng nhập.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Vai trò</Label>
              <SearchableSelect
                options={STATUS_OPTIONS.userRole}
                value={form.role}
                onChange={(value) => setForm({ ...form, role: value as UserRole })}
                searchable={false}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                Cấp tài khoản
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passwordTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPasswordTarget(null);
        }}
      >
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
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordTarget(null)}
              >
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                Lưu
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createdCreds !== null}
        onOpenChange={(open) => {
          if (!open) setCreatedCreds(null);
        }}
      >
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
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      `Email: ${createdCreds.email}\nMật khẩu: ${createdCreds.password}`
                    );
                    toast.success("Đã copy");
                  }}
                >
                  Copy
                </Button>
                <Button type="button" onClick={() => setCreatedCreds(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
