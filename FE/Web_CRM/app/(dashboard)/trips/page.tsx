"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Plus, Trash2, X } from "@/components/ui/icons";
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
import { SearchInput } from "@/components/ui/search-input";
import { DateInput } from "@/components/ui/date-input";
import { DateRangeInput } from "@/components/ui/date-range-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VndInput } from "@/components/ui/vnd-input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canManageTripsFinance, canOperateTrip, rolesOf } from "@/lib/auth/permissions";
import { getEmployees } from "@/lib/api/employees";
import { getDealers } from "@/lib/api/dealers";
import { getOrders } from "@/lib/api/orders";
import {
  addTripAdvance,
  addTripExpense,
  addTripStop,
  createTrip,
  deleteTrip,
  getTrip,
  getTrips,
  removeTripStop,
  reviewTripExpense,
  settleTrip,
  updateTrip,
} from "@/lib/api/trips";
import type { Dealer, Employee, Order, Trip } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { useDeepLinkOpen } from "@/lib/hooks/useDeepLinkOpen";
import { formatCurrency, formatDateDisplay, toDateValue, cn } from "@/lib/utils";
import { statusBadgeVariant } from "@/lib/status-badge";

const TRIP_STATUS_LABEL: Record<Trip["status"], string> = {
  draft: "Nháp",
  in_progress: "Đang đi",
  settlement: "Chờ quyết toán",
  closed: "Đã đóng",
  cancelled: "Hủy",
};

const ORDER_STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  delivering: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Hủy",
};

const ORDER_STATUS_TONE: Record<Order["status"], string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  confirmed: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  delivering: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const EXPENSE_LABEL: Record<string, string> = {
  fuel: "Xăng",
  food: "Ăn uống",
  lodging: "Lưu trú",
  toll: "Cầu đường",
  parking: "Gửi xe",
  other: "Khác",
};

const PURPOSE_LABEL: Record<string, string> = {
  delivery: "Giao hàng",
  collection: "Thu tiền",
  meeting: "Gặp gỡ",
  other: "Khác",
};

export default function TripsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const canFinance = canManageTripsFinance(rolesOf(user));

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [tripOrders, setTripOrders] = useState<Order[]>([]);
  const [loadingTripOrders, setLoadingTripOrders] = useState(false);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<Trip | null>(null);
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const isTripAction = (key: string) => actionId === key;
  const isSubmitting = (key: string) => submittingKey === key;
  const canOperateSelected = canOperateTrip(selected, user);

  const [form, setForm] = useState({
    title: "",
    region: "",
    startDate: "",
    endDate: "",
    memberIds: [] as string[],
    orderIds: [] as string[],
    note: "",
  });

  const [stopForm, setStopForm] = useState({
    date: "",
    dealerId: "",
    location: "",
    purpose: "delivery",
    note: "",
  });
  const [advanceAmount, setAdvanceAmount] = useState<number | "">("");
  const [advanceNote, setAdvanceNote] = useState("");
  const [expenseForm, setExpenseForm] = useState({
    category: "fuel",
    amount: "" as number | "",
    date: "",
    funding: "advance" as "advance" | "reimburse",
    note: "",
  });

  const fetchPage = useCallback(
    (pageNum: number) =>
      getTrips({
        search: search || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [search]
  );

  const onError = useCallback(
    (err: unknown) => {
      toast.error(err instanceof ApiClientError ? err.message : "Không tải được chuyến");
    },
    [toast]
  );

  const {
    items,
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
  } = useMobilePagedList<Trip>({ fetchPage, onError });

  const loadAuxData = useCallback(async () => {
    try {
      const [employeesResult, dealersResult] = await Promise.all([
        getEmployees({ status: "active", limit: 100, page: 1 }),
        getDealers({ limit: 100, page: 1 }),
      ]);
      setEmployees(employeesResult.items);
      setDealers(dealersResult.items);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Không tải được chuyến");
    }
  }, [toast]);

  const loadTripOrders = useCallback(
    async (memberIds: string[]) => {
      if (!memberIds.length) {
        setTripOrders([]);
        return;
      }
      setLoadingTripOrders(true);
      try {
        const ordersResult = await getOrders({
          deliveryEmployeeIds: memberIds.join(","),
          deliveryEmployeeMatch: "all",
          withoutTrip: true,
          limit: 100,
          page: 1,
        });
        setTripOrders(
          ordersResult.items.filter((order) => order.status !== "cancelled")
        );
      } catch (err) {
        toast.error(
          err instanceof ApiClientError ? err.message : "Không tải được đơn hàng"
        );
        setTripOrders([]);
      } finally {
        setLoadingTripOrders(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    void reload();
    // Reload when filter query changes (fetchPage identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  useEffect(() => {
    void loadAuxData();
  }, [loadAuxData]);

  useEffect(() => {
    if (!createOpen) return;
    void loadTripOrders(form.memberIds);
  }, [createOpen, form.memberIds, loadTripOrders]);

  const employeeOptions = useMemo(
    () => employees.map((item) => ({ value: item.id, label: item.fullName })),
    [employees]
  );

  async function refreshSelected(id: string) {
    const detail = await getTrip(id);
    setSelected(detail);
    await reload();
  }

  function openCreate() {
    const today = toDateValue(new Date());
    setForm({
      title: "",
      region: "",
      startDate: today,
      endDate: today,
      memberIds: employees[0] ? [employees[0].id] : [],
      orderIds: [],
      note: "",
    });
    setCreateOpen(true);
  }

  function applyTripDetail(detail: Trip) {
    setSelected(detail);
    setStopForm({
      date: toDateValue(detail.startDate),
      dealerId: "",
      location: "",
      purpose: "delivery",
      note: "",
    });
  }

  async function openDetail(item: Trip) {
    applyTripDetail(item);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = await getTrip(item.id);
      applyTripDetail(detail);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Không mở được chuyến");
    } finally {
      setDetailLoading(false);
    }
  }

  useDeepLinkOpen(async (id) => {
    setSelected(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const detail = await getTrip(id);
      applyTripDetail(detail);
    } catch (err) {
      setDetailOpen(false);
      toast.error(
        err instanceof ApiClientError ? err.message : "Không mở được chuyến"
      );
      throw err;
    } finally {
      setDetailLoading(false);
    }
  });

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!form.memberIds.length) {
      toast.warning("Chọn ít nhất một nhân viên");
      return;
    }
    setSubmittingKey("create");
    try {
      const trip = await createTrip({
        title: form.title.trim(),
        region: form.region.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        memberIds: form.memberIds,
        orderIds: form.orderIds,
        note: form.note.trim(),
      });
      toast.success("Đã tạo chuyến công tác");
      setCreateOpen(false);
      setSelected(trip);
      setDetailOpen(true);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Tạo chuyến thất bại");
    } finally {
      setSubmittingKey(null);
    }
  }

  async function handleDelete(item: Trip) {
    const ok = await confirm({
      title: "Xóa chuyến",
      description: `Xóa chuyến ${item.code}?`,
      confirmText: "Xóa",
      variant: "danger",
    });
    if (!ok) return;
    setActionId(`delete:${item.id}`);
    try {
      await deleteTrip(item.id);
      toast.success("Đã xóa chuyến");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setActionId(null);
    }
  }

  async function handleStatus(status: Trip["status"]) {
    if (!selected) return;
    setActionId(`status:${status}`);
    try {
      await updateTrip(selected.id, { status });
      toast.success("Đã cập nhật trạng thái");
      await refreshSelected(selected.id);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Cập nhật thất bại");
    } finally {
      setActionId(null);
    }
  }

  async function handleRemoveStop(stopId: string) {
    if (!selected) return;
    setActionId(`stop:${stopId}`);
    try {
      await removeTripStop(selected.id, stopId);
      await refreshSelected(selected.id);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa điểm dừng thất bại");
    } finally {
      setActionId(null);
    }
  }

  async function handleReviewExpense(
    expenseId: string,
    status: "approved" | "rejected"
  ) {
    if (!selected) return;
    setActionId(`${status}:${expenseId}`);
    try {
      await reviewTripExpense(selected.id, expenseId, status);
      await refreshSelected(selected.id);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Duyệt chi phí thất bại");
    } finally {
      setActionId(null);
    }
  }

  async function handleAddStop(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSubmittingKey("stop");
    try {
      await addTripStop(selected.id, {
        date: stopForm.date || undefined,
        dealerId: stopForm.dealerId || null,
        location: stopForm.location,
        purpose: stopForm.purpose as Trip["stops"][number]["purpose"],
        note: stopForm.note,
      });
      toast.success("Đã thêm điểm dừng");
      await refreshSelected(selected.id);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Thêm điểm dừng thất bại");
    } finally {
      setSubmittingKey(null);
    }
  }

  async function handleAddAdvance(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (!advanceAmount || Number(advanceAmount) <= 0) {
      toast.warning("Nhập số tiền ứng");
      return;
    }
    setSubmittingKey("advance");
    try {
      await addTripAdvance(selected.id, {
        amount: Number(advanceAmount),
        note: advanceNote,
      });
      toast.success("Đã ghi nhận tạm ứng");
      setAdvanceAmount("");
      setAdvanceNote("");
      await refreshSelected(selected.id);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Ghi tạm ứng thất bại");
    } finally {
      setSubmittingKey(null);
    }
  }

  async function handleAddExpense(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      toast.warning("Nhập số tiền chi");
      return;
    }
    setSubmittingKey("expense");
    try {
      await addTripExpense(selected.id, {
        category: expenseForm.category as Trip["expenses"][number]["category"],
        amount: Number(expenseForm.amount),
        date: expenseForm.date || undefined,
        funding: expenseForm.funding,
        note: expenseForm.note,
      });
      toast.success("Đã thêm khoản chi");
      setExpenseForm({
        category: "fuel",
        amount: "",
        date: "",
        funding: "advance",
        note: "",
      });
      await refreshSelected(selected.id);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Thêm chi phí thất bại");
    } finally {
      setSubmittingKey(null);
    }
  }

  async function handleSettle() {
    if (!selected) return;
    const ok = await confirm({
      title: "Quyết toán chuyến",
      description: "Khóa chuyến và chốt số dư tạm ứng/hoàn chi phí?",
      confirmText: "Quyết toán",
    });
    if (!ok) return;
    setSubmittingKey("settle");
    try {
      await settleTrip(selected.id);
      toast.success("Đã quyết toán chuyến");
      await refreshSelected(selected.id);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Quyết toán thất bại");
    } finally {
      setSubmittingKey(null);
    }
  }

  function toggleMember(id: string) {
    setForm((prev) => {
      const memberIds = prev.memberIds.includes(id)
        ? prev.memberIds.filter((item) => item !== id)
        : [...prev.memberIds, id];
      return {
        ...prev,
        memberIds,
        orderIds: [],
      };
    });
  }

  function toggleOrder(id: string) {
    setForm((prev) => ({
      ...prev,
      orderIds: prev.orderIds.includes(id)
        ? prev.orderIds.filter((item) => item !== id)
        : [...prev.orderIds, id],
    }));
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.warehouses} />;
  }

  const preview = selected?.settlementPreview;

  return (
    <div className="space-y-0 md:space-y-6">
      <PageHeader
        title="Chuyến công tác"
        description="Giao hàng nhiều ngày, tạm ứng, chi phí và quyết toán"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tạo chuyến
          </Button>
        }
        fab={{ onClick: openCreate, label: "Tạo chuyến" }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách chuyến</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SearchInput
            placeholder="Tìm mã / tiêu đề / khu vực..."
            value={search}
            onSearch={setSearch}
            />
          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có chuyến công tác</p>
          ) : (
            <>
              <MobileInfiniteList
                onRefresh={refresh}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
                disabled={loading}
              >
                <div className="flex flex-col gap-3">
                {items.map((item) => {
                  const memberNames =
                    item.members.map((member) => member.fullName).join(", ") || "";
                  return (
                    <MobileRecordCard key={item.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold tracking-tight text-[var(--color-text-primary)]">
                            {item.code}
                          </p>
                          <p className="mt-0.5 truncate text-sm text-[var(--color-text-inverse)]">
                            {item.title || item.region || "—"}
                          </p>
                        </div>
                        <Badge
                          variant={statusBadgeVariant(item.status)}
                          className="shrink-0"
                        >
                          {TRIP_STATUS_LABEL[item.status]}
                        </Badge>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <MobileMetaChip>
                          {formatDateDisplay(item.startDate)} →{" "}
                          {formatDateDisplay(item.endDate)}
                        </MobileMetaChip>
                        {memberNames ? (
                          <MobileMetaChip>{memberNames}</MobileMetaChip>
                        ) : null}
                        <MobileMetaChip>
                          {item.stops.length} điểm dừng
                        </MobileMetaChip>
                        {item.orders.length > 0 ? (
                          <MobileMetaChip>{item.orders.length} đơn</MobileMetaChip>
                        ) : null}
                      </div>

                      <MobileRecordActions>
                        <Button variant="outline" size="sm" onClick={() => openDetail(item)}>
                          Chi tiết
                        </Button>
                        {canFinance && item.status !== "closed" ? (
                          <Button
                            variant="danger"
                            size="sm"
                            loading={isTripAction(`delete:${item.id}`)}
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </MobileRecordActions>
                    </MobileRecordCard>
                  );
                })}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden md:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                    <th className="px-2 py-3 font-medium">Mã</th>
                    <th className="px-2 py-3 font-medium">Thời gian</th>
                    <th className="px-2 py-3 font-medium">Người đi</th>
                    <th className="px-2 py-3 font-medium">Đơn hàng</th>
                    <th className="px-2 py-3 font-medium">Trạng thái</th>
                    <th className="px-2 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                      <td className="px-2 py-3">
                        <p className="font-medium">{item.code}</p>
                        <p className="text-xs text-[var(--color-text-inverse)]">
                          {item.title || item.region || "—"}
                        </p>
                      </td>
                      <td className="px-2 py-3">
                        {formatDateDisplay(item.startDate)} → {formatDateDisplay(item.endDate)}
                      </td>
                      <td className="px-2 py-3">
                        {item.members.map((member) => member.fullName).join(", ") || "—"}
                      </td>
                      <td className="px-2 py-3">
                        {item.orders.length === 0 ? (
                          <span className="text-[var(--color-text-inverse)]">—</span>
                        ) : (
                          <div className="flex max-w-[260px] flex-wrap gap-1.5">
                            {item.orders.map((order) => (
                              <span
                                key={order.id}
                                className="inline-flex items-center rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs font-medium"
                                title={`${order.customerName || ""} - ${ORDER_STATUS_LABEL[(order.status as Order["status"]) || "pending"] || order.status}`}
                              >
                                {order.code}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <Badge variant={item.status === "closed" ? "success" : "muted"}>
                          {TRIP_STATUS_LABEL[item.status]}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDetail(item)}>
                            Chi tiết
                          </Button>
                          {canFinance && item.status !== "closed" ? (
                            <Button
                              variant="danger"
                              size="sm"
                              loading={isTripAction(`delete:${item.id}`)}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tạo chuyến công tác</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Tiêu đề</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Giao hàng miền Trung"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Ngày đi → Ngày về *</Label>
                <DateRangeInput
                  from={form.startDate}
                  to={form.endDate}
                  fromLabel="Ngày đi"
                  toLabel="Ngày về"
                  placeholder="Chọn ngày đi → ngày về"
                  clearable={false}
                  onChange={({ from, to }) =>
                    setForm({ ...form, startDate: from, endDate: to })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Khu vực / tuyến</Label>
                <Input
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Người đi *</Label>
              <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border border-[var(--color-border-subtle)] p-3 sm:grid-cols-2">
                {employeeOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.memberIds.includes(option.value)}
                      onChange={() => toggleMember(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            {form.memberIds.length > 0 && !loadingTripOrders && tripOrders.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Đơn hàng gắn chuyến</Label>
                {form.orderIds.length > 0 ? (
                  <span className="text-xs text-[var(--color-text-inverse)]">
                    Đã chọn {form.orderIds.length}
                  </span>
                ) : null}
              </div>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]/40 p-2">
                {tripOrders.map((order) => {
                    const checked = form.orderIds.includes(order.id);
                    return (
                      <label
                        key={order.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl border bg-[var(--color-surface-elevated)] px-3 py-3 transition-all",
                          checked
                            ? "border-[var(--color-text-secondary)] ring-2 ring-[var(--color-text-secondary)]/15"
                            : "border-[var(--color-border-subtle)] hover:border-[var(--color-text-secondary)]/35"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-[var(--color-text-secondary)]"
                          checked={checked}
                          onChange={() => toggleOrder(order.id)}
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold tracking-tight">
                              {order.code}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[13px] font-medium leading-none md:px-2 md:py-0.5 md:text-[11px]",
                                ORDER_STATUS_TONE[order.status]
                              )}
                            >
                              {ORDER_STATUS_LABEL[order.status]}
                            </span>
                          </div>
                          <p className="truncate text-sm text-[var(--color-text-inverse)]">
                            {order.customerName || order.dealerName || "Khách lẻ"}
                          </p>
                          {order.deliveryEmployeeName ? (
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              NV giao: {order.deliveryEmployeeName}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-inverse)]">
                            <span>
                              {order.paymentStatus === "paid"
                                ? "Đã TT"
                                : order.paymentStatus === "partial"
                                  ? "TT một phần"
                                  : "Chưa TT"}
                            </span>
                            <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                              {formatCurrency(order.total)}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>
            ) : null}

            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={isSubmitting("create")}>
                Tạo chuyến
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailLoading(false);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected
                ? `${selected.code} - ${TRIP_STATUS_LABEL[selected.status || "draft"]}`
                : "Chi tiết chuyến"}
            </DialogTitle>
          </DialogHeader>

          {detailLoading && !selected ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ) : null}

          {selected ? (
            <div
              className={cn(
                "space-y-0 md:space-y-6",
                detailLoading && "pointer-events-none opacity-60"
              )}
            >
              <div className="grid gap-3 rounded-xl border border-[var(--color-border-subtle)] p-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-[var(--color-text-inverse)]">Thời gian</p>
                  <p className="font-medium">
                    {formatDateDisplay(selected.startDate)} → {formatDateDisplay(selected.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-inverse)]">Người đi</p>
                  <p className="font-medium">
                    {selected.members.map((item) => item.fullName).join(", ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-inverse)]">Khu vực</p>
                  <p className="font-medium">{selected.region || selected.title || "—"}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:col-start-4">
                  {canOperateSelected && selected.status === "draft" ? (
                    <Button
                      size="sm"
                      loading={isTripAction("status:in_progress")}
                      onClick={() => handleStatus("in_progress")}
                    >
                      Bắt đầu đi
                    </Button>
                  ) : null}
                  {canOperateSelected && selected.status === "in_progress" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={isTripAction("status:settlement")}
                      onClick={() => handleStatus("settlement")}
                    >
                      Chờ quyết toán
                    </Button>
                  ) : null}
                </div>
              </div>

              <section className="space-y-3">
                <h4 className="font-semibold">Đơn hàng ({selected.orders.length})</h4>
                {selected.orders.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-inverse)]">Chưa gắn đơn</p>
                ) : (
                  <div className="space-y-2">
                    {selected.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border-subtle)] px-3 py-3 text-sm"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href="/orders"
                              className="font-semibold text-[var(--color-text-secondary)] hover:underline"
                            >
                              {order.code}
                            </Link>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[13px] font-medium leading-none md:px-2 md:py-0.5 md:text-[11px]",
                                ORDER_STATUS_TONE[
                                  (order.status as Order["status"]) || "pending"
                                ] || ORDER_STATUS_TONE.pending
                              )}
                            >
                              {ORDER_STATUS_LABEL[
                                (order.status as Order["status"]) || "pending"
                              ] || order.status}
                            </span>
                          </div>
                          <p className="truncate text-[var(--color-text-inverse)]">
                            {order.customerName || "—"}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums">
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h4 className="font-semibold">Lịch trình / điểm dừng</h4>
                {selected.stops.map((stop) => (
                  <div
                    key={stop.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-border-subtle)] p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {formatDateDisplay(stop.date)} - {PURPOSE_LABEL[stop.purpose]}
                      </p>
                      <p className="text-[var(--color-text-inverse)]">
                        {stop.dealerName || stop.location || "—"}
                      </p>
                      {stop.note ? <p className="mt-1 text-xs">{stop.note}</p> : null}
                    </div>
                    {canOperateSelected && selected.status !== "closed" ? (
                      <Button
                        variant="danger"
                        size="sm"
                        loading={isTripAction(`stop:${stop.id}`)}
                        onClick={() => handleRemoveStop(stop.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
                {canOperateSelected && selected.status !== "closed" ? (
                  <form
                    onSubmit={handleAddStop}
                    className="grid gap-3 rounded-xl border border-dashed border-[var(--color-border-subtle)] p-3 sm:grid-cols-2"
                  >
                    <DateInput
                      value={stopForm.date}
                      onChange={(date) => setStopForm({ ...stopForm, date })}
                    />
                    <SearchableSelect
                      options={[
                        { value: "", label: "Không chọn đại lý" },
                        ...dealers.map((item) => ({ value: item.id, label: item.name })),
                      ]}
                      value={stopForm.dealerId}
                      onChange={(dealerId) => setStopForm({ ...stopForm, dealerId })}
                    />
                    <Input
                      placeholder="Địa điểm"
                      value={stopForm.location}
                      onChange={(e) => setStopForm({ ...stopForm, location: e.target.value })}
                    />
                    <SearchableSelect
                      options={Object.entries(PURPOSE_LABEL).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      value={stopForm.purpose}
                      onChange={(purpose) => setStopForm({ ...stopForm, purpose })}
                      searchable={false}
                    />
                    <Input
                      className="sm:col-span-2"
                      placeholder="Ghi chú điểm dừng"
                      value={stopForm.note}
                      onChange={(e) => setStopForm({ ...stopForm, note: e.target.value })}
                    />
                    <Button type="submit" loading={isSubmitting("stop")} className="sm:col-span-2">
                      Thêm điểm dừng
                    </Button>
                  </form>
                ) : null}
              </section>

              <section className="space-y-3">
                <h4 className="font-semibold">Tạm ứng</h4>
                {selected.advances.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 text-sm"
                  >
                    <span>{item.note || "Tạm ứng"}</span>
                    <span className="font-medium">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                {canFinance && selected.status !== "closed" ? (
                  <form onSubmit={handleAddAdvance} className="grid gap-3 sm:grid-cols-3">
                    <VndInput
                      value={advanceAmount}
                      onValueChange={setAdvanceAmount}
                      placeholder="Số tiền ứng"
                    />
                    <Input
                      value={advanceNote}
                      onChange={(e) => setAdvanceNote(e.target.value)}
                      placeholder="Ghi chú"
                    />
                    <Button type="submit" loading={isSubmitting("advance")}>
                      Ghi tạm ứng
                    </Button>
                  </form>
                ) : null}
              </section>

              <section className="space-y-3">
                <h4 className="font-semibold">Chi phí</h4>
                {selected.expenses.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {EXPENSE_LABEL[item.category]} -{" "}
                        {item.funding === "advance" ? "Trừ ứng" : "Hoàn lại"}
                      </p>
                      <p className="text-xs text-[var(--color-text-inverse)]">
                        {formatDateDisplay(item.date)} - {item.note || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          item.status === "approved"
                            ? "success"
                            : item.status === "rejected"
                              ? "muted"
                              : "default"
                        }
                      >
                        {item.status === "approved"
                          ? "Đã duyệt"
                          : item.status === "rejected"
                            ? "Từ chối"
                            : "Chờ duyệt"}
                      </Badge>
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                      {canFinance && item.status === "pending" && selected.status !== "closed" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            loading={isTripAction(`approved:${item.id}`)}
                            onClick={() => handleReviewExpense(item.id, "approved")}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            loading={isTripAction(`rejected:${item.id}`)}
                            onClick={() => handleReviewExpense(item.id, "rejected")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}

                {canOperateSelected && selected.status !== "closed" ? (
                  <form
                    onSubmit={handleAddExpense}
                    className="grid gap-3 rounded-xl border border-dashed border-[var(--color-border-subtle)] p-3 sm:grid-cols-2"
                  >
                    <SearchableSelect
                      options={Object.entries(EXPENSE_LABEL).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      value={expenseForm.category}
                      onChange={(category) => setExpenseForm({ ...expenseForm, category })}
                      searchable={false}
                    />
                    <SearchableSelect
                      options={[
                        { value: "advance", label: "Trừ từ tạm ứng" },
                        { value: "reimburse", label: "Tự bỏ → hoàn lại" },
                      ]}
                      value={expenseForm.funding}
                      onChange={(funding) =>
                        setExpenseForm({
                          ...expenseForm,
                          funding: funding as "advance" | "reimburse",
                        })
                      }
                      searchable={false}
                    />
                    <VndInput
                      value={expenseForm.amount}
                      onValueChange={(amount) => setExpenseForm({ ...expenseForm, amount })}
                      placeholder="Số tiền"
                    />
                    <DateInput
                      value={expenseForm.date}
                      onChange={(date) => setExpenseForm({ ...expenseForm, date })}
                    />
                    <Input
                      className="sm:col-span-2"
                      placeholder="Ghi chú"
                      value={expenseForm.note}
                      onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
                    />
                    <Button type="submit" loading={isSubmitting("expense")} className="sm:col-span-2">
                      Thêm khoản chi
                    </Button>
                  </form>
                ) : null}
              </section>

              <section className="space-y-3 rounded-xl border border-[var(--color-border-subtle)] p-4">
                <h4 className="font-semibold">Quyết toán</h4>
                {preview ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                    <p>Tổng ứng: <strong>{formatCurrency(preview.advanceTotal)}</strong></p>
                    <p>
                      Chi trừ ứng:{" "}
                      <strong>{formatCurrency(preview.expenseAdvanceTotal)}</strong>
                    </p>
                    <p>
                      Chi hoàn:{" "}
                      <strong>{formatCurrency(preview.expenseReimburseTotal)}</strong>
                    </p>
                    <p>
                      NV nộp lại: <strong>{formatCurrency(preview.employeeReturn)}</strong>
                    </p>
                    <p>
                      Cty trả NV: <strong>{formatCurrency(preview.companyPay)}</strong>
                    </p>
                  </div>
                ) : null}
                {canFinance && selected.status !== "closed" ? (
                  <Button onClick={handleSettle} loading={isSubmitting("settle")}>
                    Quyết toán & khóa chuyến
                  </Button>
                ) : null}
                {selected.settlement ? (
                  <p className="text-sm text-[var(--color-text-inverse)]">
                    Đã quyết toán lúc {new Date(selected.settlement.settledAt).toLocaleString("vi-VN")}
                  </p>
                ) : null}
              </section>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
