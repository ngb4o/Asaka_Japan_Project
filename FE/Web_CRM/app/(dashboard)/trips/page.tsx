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
  DialogFooter,
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
import {
  FilterDrawer,
  FilterOptionList,
  FilterTrigger,
} from "@/components/ui/filter-drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { PreviewableImage } from "@/components/ui/previewable-image";
import { ImageUpload } from "@/components/products/ImageUpload";
import { LocationCapture, type GeoLocationValue } from "@/components/trips/LocationCapture";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canManageTripsFinance, canOperateTrip, canViewProfit, rolesOf } from "@/lib/auth/permissions";
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
  reorderTripStops,
  reviewTripExpense,
  settleTrip,
  updateTrip,
} from "@/lib/api/trips";
import { uploadTripReceipt } from "@/lib/api/uploads";
import type { Dealer, Employee, Order, Trip } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { useDeferredFilters } from "@/lib/hooks/useDeferredFilters";
import { useDeepLinkOpen } from "@/lib/hooks/useDeepLinkOpen";
import { useCrmDataRefresh } from "@/lib/hooks/useCrmDataRefresh";
import { formatCurrency, formatDateDisplay, toDateValue, cn } from "@/lib/utils";
import { statusBadgeVariant } from "@/lib/status-badge";

const TripMap = dynamic(
  () => import("@/components/trips/TripMap").then((mod) => mod.TripMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 animate-pulse rounded-xl bg-[var(--color-surface-muted)] sm:h-96" />
    ),
  }
);

const SortableTripStops = dynamic(
  () =>
    import("@/components/trips/SortableTripStops").then((mod) => mod.SortableTripStops),
  { ssr: false }
);

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

function tripReceiptUrls(item: {
  receiptUrls?: string[];
  receiptUrl?: string;
}) {
  if (Array.isArray(item.receiptUrls) && item.receiptUrls.length) {
    return item.receiptUrls.filter(Boolean);
  }
  return item.receiptUrl ? [item.receiptUrl] : [];
}

const EMPTY_LIST_FILTERS = { status: "" };

export default function TripsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const canFinance = canManageTripsFinance(rolesOf(user));
  const showProfit = canViewProfit(rolesOf(user));

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [tripOrders, setTripOrders] = useState<Order[]>([]);
  const [loadingTripOrders, setLoadingTripOrders] = useState(false);
  const [search, setSearch] = useState("");
  const filters = useDeferredFilters(EMPTY_LIST_FILTERS);

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
    /** "" = cuối; số = insertAt 0-based */
    insertAt: "" as "" | number,
    geo: null as GeoLocationValue | null,
  });
  const [advanceAmount, setAdvanceAmount] = useState<number | "">("");
  const [advanceNote, setAdvanceNote] = useState("");
  const [advanceReceiptUrls, setAdvanceReceiptUrls] = useState<string[]>([]);
  const [expenseForm, setExpenseForm] = useState({
    category: "fuel",
    amount: "" as number | "",
    date: "",
    funding: "advance" as "advance" | "reimburse",
    paidByEmployeeId: "",
    receiptUrls: [] as string[],
    note: "",
    geo: null as GeoLocationValue | null,
  });

  const fetchPage = useCallback(
    (pageNum: number) =>
      getTrips({
        search: search || undefined,
        status: filters.applied.status || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [search, filters.applied.status]
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

  useCrmDataRefresh(["trips"], async () => {
    await refresh();
    if (selected) {
      try {
        const updated = await getTrip(selected.id);
        setSelected(updated);
      } catch {
        /* ignore */
      }
    }
  });

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
      insertAt: "",
      geo: null,
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

  async function handleReorderStops(stopIds: string[]) {
    if (!selected) return;
    const byId = new Map(selected.stops.map((s) => [s.id, s]));
    const nextStops = stopIds
      .map((id, i) => {
        const stop = byId.get(id);
        return stop ? { ...stop, seq: i + 1 } : null;
      })
      .filter(Boolean) as Trip["stops"];
    if (nextStops.length === selected.stops.length) {
      setSelected({ ...selected, stops: nextStops });
    }

    setActionId("reorder");
    try {
      await reorderTripStops(selected.id, stopIds);
      await refreshSelected(selected.id);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Đổi thứ tự thất bại");
      await refreshSelected(selected.id);
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
        ...(typeof stopForm.insertAt === "number" ? { insertAt: stopForm.insertAt } : {}),
        ...(stopForm.geo
          ? {
              lat: stopForm.geo.lat,
              lng: stopForm.geo.lng,
              accuracy: stopForm.geo.accuracy ?? null,
              locationCapturedAt: stopForm.geo.locationCapturedAt,
              locationSource: stopForm.geo.locationSource || "gps",
            }
          : {}),
      });
      toast.success("Đã thêm điểm dừng");
      setStopForm({
        date: "",
        dealerId: "",
        location: "",
        purpose: "delivery",
        note: "",
        insertAt: "",
        geo: null,
      });
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
    if (!advanceReceiptUrls.length) {
      toast.warning("Thêm ảnh chứng từ tạm ứng (sao kê / biên nhận)");
      return;
    }
    setSubmittingKey("advance");
    try {
      await addTripAdvance(selected.id, {
        amount: Number(advanceAmount),
        note: advanceNote,
        receiptUrls: advanceReceiptUrls,
        receiptUrl: advanceReceiptUrls[0],
      });
      toast.success("Đã ghi nhận tạm ứng");
      setAdvanceAmount("");
      setAdvanceNote("");
      setAdvanceReceiptUrls([]);
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
    if (expenseForm.funding === "reimburse" && !expenseForm.paidByEmployeeId) {
      toast.warning("Chọn nhân viên đã tự bỏ tiền để hoàn đúng người");
      return;
    }
    setSubmittingKey("expense");
    try {
      await addTripExpense(selected.id, {
        category: expenseForm.category as Trip["expenses"][number]["category"],
        amount: Number(expenseForm.amount),
        date: expenseForm.date || undefined,
        funding: expenseForm.funding,
        paidByEmployeeId:
          expenseForm.funding === "reimburse"
            ? expenseForm.paidByEmployeeId
            : undefined,
        receiptUrls: expenseForm.receiptUrls.length
          ? expenseForm.receiptUrls
          : undefined,
        receiptUrl: expenseForm.receiptUrls[0] || undefined,
        note: expenseForm.note,
        ...(expenseForm.geo
          ? {
              lat: expenseForm.geo.lat,
              lng: expenseForm.geo.lng,
              accuracy: expenseForm.geo.accuracy ?? null,
              locationCapturedAt: expenseForm.geo.locationCapturedAt,
              locationSource: expenseForm.geo.locationSource || "gps",
            }
          : {}),
      });
      toast.success("Đã thêm khoản chi");
      setExpenseForm({
        category: "fuel",
        amount: "",
        date: "",
        funding: "advance",
        paidByEmployeeId: "",
        receiptUrls: [],
        note: "",
        geo: null,
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
          <div className="flex gap-2">
            <SearchInput
              placeholder="Tìm mã / tiêu đề / khu vực..."
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
            title="Bộ lọc chuyến"
            onClear={filters.clearDraft}
            onApply={filters.apply}
            draftCount={filters.draftCount}>
            <FilterOptionList
              label="Trạng thái"
              value={filters.draft.status}
              onChange={(value) => filters.setDraftValue("status", value)}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                ...Object.entries(TRIP_STATUS_LABEL).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
            />
          </FilterDrawer>
          {items.length === 0 ? (
            <EmptyState title="Chưa có chuyến công tác" />
          ) : (
            <>
              <MobileInfiniteList
                onRefresh={refresh}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
                disabled={loading}>
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
                          className="shrink-0">
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
                            onClick={() => handleDelete(item)}>
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
              <div className="crm-table-frame">
                <table className="crm-data-table min-w-[900px]">
                <thead>
                  <tr>
                    <th className="font-medium">Mã</th>
                    <th className="font-medium">Thời gian</th>
                    <th className="font-medium">Người đi</th>
                    <th className="font-medium">Đơn hàng</th>
                    <th className="font-medium">Trạng thái</th>
                    <th className="text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <p className="font-medium">{item.code}</p>
                        <p className="text-xs text-[var(--color-text-inverse)]">
                          {item.title || item.region || "—"}
                        </p>
                      </td>
                      <td>
                        {formatDateDisplay(item.startDate)} → {formatDateDisplay(item.endDate)}
                      </td>
                      <td>
                        {item.members.map((member) => member.fullName).join(", ") || "—"}
                      </td>
                      <td>
                        {item.orders.length === 0 ? (
                          <span className="text-[var(--color-text-inverse)]">—</span>
                        ) : (
                          <div className="flex max-w-[260px] flex-wrap gap-1.5">
                            {item.orders.map((order) => (
                              <span
                                key={order.id}
                                className="inline-flex items-center rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs font-medium"
                                title={`${order.customerName || ""} - ${ORDER_STATUS_LABEL[(order.status as Order["status"]) || "pending"] || order.status}`}>
                                {order.code}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge variant={item.status === "closed" ? "success" : "muted"}>
                          {TRIP_STATUS_LABEL[item.status]}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDetail(item)}>
                            Chi tiết
                          </Button>
                          {canFinance && item.status !== "closed" ? (
                            <Button
                              variant="danger"
                              size="sm"
                              loading={isTripAction(`delete:${item.id}`)}
                              onClick={() => handleDelete(item)}>
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
            <p className="text-sm text-[var(--color-text-inverse)]">
              Chọn đơn gắn chuyến → tự tạo điểm dừng giao (#1, #2…) theo thứ tự.
              Có GPS đại lý thì dùng luôn; chưa có thì geocode từ địa chỉ để vẽ
              lộ trình Kho → các điểm.
            </p>
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
                    Đã chọn {form.orderIds.length} · sẽ tạo{" "}
                    {form.orderIds.length} điểm giao
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
                        )}>
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-[var(--color-text-secondary)]"
                          checked={checked}
                          onChange={() => toggleOrder(order.id)}
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate font-semibold tracking-tight">
                              {order.code}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-1 text-[13px] font-medium leading-none md:px-2 md:py-0.5 md:text-[11px]",
                                ORDER_STATUS_TONE[order.status]
                              )}>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={isSubmitting("create")}>
                Tạo chuyến
              </Button>
            </DialogFooter>
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
        }}>
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
              )}>
              <div className="grid gap-3 rounded-xl border border-[var(--color-border-subtle)] p-4 sm:grid-cols-3">
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
                {(canOperateSelected &&
                  (selected.status === "draft" ||
                    selected.status === "in_progress")) ? (
                  <DialogFooter className="border-0 pt-1 sm:col-span-3">
                    {selected.status === "draft" ? (
                      <Button
                        loading={isTripAction("status:in_progress")}
                        onClick={() => handleStatus("in_progress")}>
                        Bắt đầu đi
                      </Button>
                    ) : null}
                    {selected.status === "in_progress" ? (
                      <Button
                        loading={isTripAction("status:settlement")}
                        onClick={() => handleStatus("settlement")}>
                        Chờ quyết toán
                      </Button>
                    ) : null}
                  </DialogFooter>
                ) : null}
              </div>

              <section className="mt-6 space-y-3 md:mt-0">
                <h4 className="font-semibold">Đơn hàng ({selected.orders.length})</h4>
                {selected.orders.length === 0 ? (
                  <EmptyState title="Chưa gắn đơn" size="sm" />
                ) : (
                  <div className="space-y-2">
                    {selected.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border-subtle)] px-3 py-3 text-sm">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              href="/orders"
                              className="min-w-0 truncate font-semibold text-[var(--color-text-secondary)] hover:underline">
                              {order.code}
                            </Link>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-1 text-[13px] font-medium leading-none md:px-2 md:py-0.5 md:text-[11px]",
                                ORDER_STATUS_TONE[
                                  (order.status as Order["status"]) || "pending"
                                ] || ORDER_STATUS_TONE.pending
                              )}>
                              {ORDER_STATUS_LABEL[
                                (order.status as Order["status"]) || "pending"
                              ] || order.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="min-w-0 truncate text-[var(--color-text-inverse)]">
                              {order.customerName || "—"}
                            </p>
                            <p className="shrink-0 font-semibold tabular-nums">
                              {formatCurrency(order.total)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-6 space-y-3 md:mt-0">
                <h4 className="font-semibold">Bản đồ chuyến</h4>
                <TripMap
                  stops={selected.stops}
                  expenses={selected.expenses}
                  origin={
                    selected.originWarehouse &&
                    typeof selected.originWarehouse.lat === "number" &&
                    typeof selected.originWarehouse.lng === "number"
                      ? {
                          lat: selected.originWarehouse.lat,
                          lng: selected.originWarehouse.lng,
                          name: selected.originWarehouse.name,
                          address: selected.originWarehouse.address,
                        }
                      : null
                  }
                />
              </section>

              <section className="mt-6 space-y-3 md:mt-0">
                <h4 className="font-semibold">Lịch trình / điểm dừng</h4>
                <SortableTripStops
                  stops={selected.stops}
                  canReorder={canOperateSelected && selected.status !== "closed"}
                  purposeLabel={PURPOSE_LABEL}
                  removingStopId={
                    actionId?.startsWith("stop:") ? actionId.slice(5) : null
                  }
                  reordering={isTripAction("reorder")}
                  onReorder={handleReorderStops}
                  onRemove={handleRemoveStop}
                />
                {canOperateSelected && selected.status !== "closed" ? (
                  <form
                    onSubmit={handleAddStop}
                    className="grid gap-3 rounded-xl border border-dashed border-[var(--color-border-subtle)] p-3 sm:grid-cols-2">
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
                    <SearchableSelect
                      className="sm:col-span-2"
                      options={[
                        { value: "", label: "Thêm cuối lộ trình" },
                        { value: "0", label: "Thêm đầu (trước #1)" },
                        ...selected.stops.map((s, i) => ({
                          value: String(i + 1),
                          label: `Sau #${s.seq || i + 1}${
                            s.dealerName || s.location
                              ? ` — ${(s.dealerName || s.location).slice(0, 28)}`
                              : ""
                          }`,
                        })),
                      ]}
                      value={
                        stopForm.insertAt === "" ? "" : String(stopForm.insertAt)
                      }
                      onChange={(value) =>
                        setStopForm({
                          ...stopForm,
                          insertAt: value === "" ? "" : Number(value),
                        })
                      }
                      searchable={false}
                    />
                    <Input
                      className="sm:col-span-2"
                      placeholder="Ghi chú điểm dừng"
                      value={stopForm.note}
                      onChange={(e) => setStopForm({ ...stopForm, note: e.target.value })}
                    />
                    <div className="sm:col-span-2">
                      <LocationCapture
                        value={stopForm.geo}
                        onChange={(geo) => setStopForm({ ...stopForm, geo })}
                      />
                    </div>
                    <Button type="submit" loading={isSubmitting("stop")} className="sm:col-span-2">
                      Thêm điểm dừng
                    </Button>
                  </form>
                ) : null}
              </section>

              {selected.advances.length > 0 ||
              (canFinance && selected.status !== "closed") ? (
              <section className="mt-6 space-y-3 md:mt-0">
                {selected.advances.length > 0 || canFinance ? (
                  <h4 className="font-semibold">Tạm ứng</h4>
                ) : null}
                {selected.advances.map((item) => {
                  const receipts = tripReceiptUrls(item);
                  const title = item.note?.trim() || "Tạm ứng";
                  return (
                    <div
                      key={item.id}
                      className="space-y-2.5 rounded-lg border border-[var(--color-border-subtle)] px-3 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        {receipts.length ? (
                          <div className="min-w-0 shrink overflow-hidden">
                            <div className="flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                              {receipts.map((url, index) => (
                                <PreviewableImage
                                  key={`${url}-${index}`}
                                  src={url}
                                  alt={`Chứng từ ${index + 1}`}
                                  className="h-14 w-14 rounded-md"
                                />
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{title}</p>
                          {item.createdAt ? (
                            <p className="mt-0.5 text-xs text-[var(--color-text-inverse)]">
                              {formatDateDisplay(item.createdAt)}
                            </p>
                          ) : null}
                        </div>

                        {!receipts.length ? (
                          <Badge variant="muted" className="shrink-0">
                            Chưa có ảnh
                          </Badge>
                        ) : null}
                      </div>

                      <p className="w-full text-right font-semibold tabular-nums text-[var(--color-text-secondary)]">
                        Số tiền: {formatCurrency(item.amount)}
                      </p>
                    </div>
                  );
                })}
                {canFinance && selected.status !== "closed" ? (
                  <form
                    onSubmit={handleAddAdvance}
                    className="space-y-3 rounded-xl border border-dashed border-[var(--color-border-subtle)] p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
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
                    </div>
                    <ImageUpload
                      label="Chứng từ tạm ứng (sao kê / biên nhận)"
                      values={advanceReceiptUrls}
                      onValuesChange={setAdvanceReceiptUrls}
                      upload={uploadTripReceipt}
                      max={5}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      loading={isSubmitting("advance")}>
                      Ghi tạm ứng
                    </Button>
                  </form>
                ) : null}
              </section>
              ) : null}

              <section className="mt-6 space-y-3 md:mt-0">
                <h4 className="font-semibold">Chi phí</h4>
                {selected.expenses.map((item) => {
                  const receipts = tripReceiptUrls(item);
                  const canReview =
                    canFinance &&
                    item.status === "pending" &&
                    selected.status !== "closed";
                  return (
                    <div
                      key={item.id}
                      className="space-y-2.5 rounded-lg border border-[var(--color-border-subtle)] px-3 py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {EXPENSE_LABEL[item.category]} -{" "}
                            {item.funding === "advance" ? "Trừ ứng" : "Hoàn lại"}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--color-text-inverse)]">
                            {[
                              formatDateDisplay(item.date),
                              item.note?.trim() || null,
                              item.funding === "reimburse" &&
                              item.paidByEmployeeName
                                ? `${item.paidByEmployeeName} tự bỏ`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {typeof item.lat === "number" &&
                          typeof item.lng === "number" ? (
                            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                              GPS: {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                            </p>
                          ) : null}
                        </div>
                        <Badge
                          variant={
                            item.status === "approved"
                              ? "success"
                              : item.status === "rejected"
                                ? "muted"
                                : "default"
                          }
                          className="shrink-0">
                          {item.status === "approved"
                            ? "Đã duyệt"
                            : item.status === "rejected"
                              ? "Từ chối"
                              : "Chờ duyệt"}
                        </Badge>
                      </div>

                      {receipts.length ? (
                        <div className="w-full min-w-0 max-w-full overflow-hidden">
                          <div className="flex w-full min-w-0 flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
                          {receipts.map((url, index) => (
                            <PreviewableImage
                              key={`${url}-${index}`}
                              src={url}
                              alt={`Chứng từ ${index + 1}`}
                              className="h-14 w-14 rounded-md"
                            />
                          ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <p className="text-right font-semibold tabular-nums text-red-600 dark:text-red-400">
                          {`Số tiền: ${formatCurrency(item.amount)}`}
                        </p>
                        {canReview ? (
                          <DialogFooter className="border-0 p-0 pt-0">
                            <Button
                              size="sm"
                              variant="success"
                              loading={isTripAction(`approved:${item.id}`)}
                              onClick={() =>
                                handleReviewExpense(item.id, "approved")
                              }
                            >
                              <Check className="h-4 w-4" />
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="reject"
                              loading={isTripAction(`rejected:${item.id}`)}
                              onClick={() =>
                                handleReviewExpense(item.id, "rejected")
                              }
                            >
                              <X className="h-4 w-4" />
                              Từ chối
                            </Button>
                          </DialogFooter>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {canOperateSelected && selected.status !== "closed" ? (
                  <form
                    onSubmit={handleAddExpense}
                    className="grid gap-3 rounded-xl border border-dashed border-[var(--color-border-subtle)] p-3 sm:grid-cols-2">
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
                          paidByEmployeeId:
                            funding === "reimburse"
                              ? expenseForm.paidByEmployeeId ||
                                selected.members[0]?.id ||
                                ""
                              : "",
                        })
                      }
                      searchable={false}
                    />
                    {expenseForm.funding === "reimburse" ? (
                      <SearchableSelect
                        options={selected.members.map((member) => ({
                          value: member.id,
                          label: member.fullName,
                        }))}
                        value={expenseForm.paidByEmployeeId}
                        onChange={(paidByEmployeeId) =>
                          setExpenseForm({ ...expenseForm, paidByEmployeeId })
                        }
                        placeholder="Ai tự bỏ tiền?"
                        searchable={false}
                      />
                    ) : null}
                    <VndInput
                      value={expenseForm.amount}
                      onValueChange={(amount) =>
                        setExpenseForm({ ...expenseForm, amount })
                      }
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
                      onChange={(e) =>
                        setExpenseForm({ ...expenseForm, note: e.target.value })
                      }
                    />
                    <div className="min-w-0 sm:col-span-2">
                      <ImageUpload
                        label="Chứng từ chi phí (tối đa 5 ảnh)"
                        values={expenseForm.receiptUrls}
                        onValuesChange={(receiptUrls) =>
                          setExpenseForm({ ...expenseForm, receiptUrls })
                        }
                        upload={uploadTripReceipt}
                        max={5}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <LocationCapture
                        value={expenseForm.geo}
                        onChange={(geo) => setExpenseForm({ ...expenseForm, geo })}
                      />
                    </div>
                    <Button
                      type="submit"
                      loading={isSubmitting("expense")}
                      className="sm:col-span-2">
                      Thêm khoản chi
                    </Button>
                  </form>
                ) : null}
              </section>

              <section className="mt-6 space-y-3 rounded-xl border border-[var(--color-border-subtle)] p-4 md:mt-0">
                <h4 className="font-semibold">Quyết toán</h4>
                {preview ? (
                  <div className="space-y-2 rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm">
                    <p className="flex items-baseline justify-between gap-3">
                      <span>Tổng ứng</span>
                      <strong className="tabular-nums">
                        {formatCurrency(preview.advanceTotal)}
                      </strong>
                    </p>
                    <p className="flex items-baseline justify-between gap-3">
                      <span>Chi trừ ứng</span>
                      <strong className="tabular-nums">
                        {formatCurrency(preview.expenseAdvanceTotal)}
                      </strong>
                    </p>
                    <p className="flex items-baseline justify-between gap-3">
                      <span>Chi hoàn</span>
                      <strong className="tabular-nums">
                        {formatCurrency(preview.expenseReimburseTotal)}
                      </strong>
                    </p>
                    <p className="flex items-baseline justify-between gap-3">
                      <span>NV nộp lại</span>
                      <strong className="tabular-nums">
                        {formatCurrency(preview.employeeReturn)}
                      </strong>
                    </p>
                    <p className="flex items-baseline justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-2">
                      <span>Cty trả NV</span>
                      <strong className="tabular-nums text-[var(--color-text-secondary)]">
                        {formatCurrency(preview.companyPay)}
                      </strong>
                    </p>
                    {preview.companyPayByEmployee &&
                    preview.companyPayByEmployee.length > 0 ? (
                      <div className="space-y-2 border-t border-[var(--color-border-subtle)] pt-2">
                        <p className="text-xs text-[var(--color-text-inverse)]">
                          Hoàn theo người
                        </p>
                        {preview.companyPayByEmployee.map((row) => {
                          const name =
                            selected.members.find((m) => m.id === row.employeeId)
                              ?.fullName || row.employeeId;
                          return (
                            <p
                              key={row.employeeId}
                              className="flex items-baseline justify-between gap-3">
                              <span>{name}</span>
                              <strong className="tabular-nums">
                                {formatCurrency(row.amount)}
                              </strong>
                            </p>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {showProfit && selected.profitSummary ? (
                  <div className="space-y-2 rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm">
                    <p className="flex items-baseline justify-between gap-3">
                      <span>Doanh thu đơn</span>
                      <strong className="tabular-nums">
                        {formatCurrency(selected.profitSummary.orderRevenue)}
                      </strong>
                    </p>
                    <p className="flex items-baseline justify-between gap-3">
                      <span>Giá vốn đơn</span>
                      <strong className="tabular-nums">
                        {formatCurrency(selected.profitSummary.orderCostTotal)}
                      </strong>
                    </p>
                    <p className="flex items-baseline justify-between gap-3">
                      <span>Lãi gộp đơn</span>
                      <strong className="tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(selected.profitSummary.orderGrossProfit)}
                      </strong>
                    </p>
                    <p className="flex items-baseline justify-between gap-3">
                      <span>Chi phí đi đường</span>
                      <strong className="tabular-nums">
                        {formatCurrency(selected.profitSummary.tripExpenseTotal)}
                      </strong>
                    </p>
                    <p className="flex items-baseline justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-2">
                      <span>Lãi còn lại (sau chi phí chuyến)</span>
                      <strong
                        className={
                          selected.profitSummary.tripNetProfit >= 0
                            ? "tabular-nums text-emerald-600 dark:text-emerald-400"
                            : "tabular-nums text-red-600 dark:text-red-400"
                        }>
                        {formatCurrency(selected.profitSummary.tripNetProfit)}
                      </strong>
                    </p>
                  </div>
                ) : null}
                {canFinance && selected.status !== "closed" ? (
                  <Button
                    className="w-full"
                    onClick={handleSettle}
                    loading={isSubmitting("settle")}>
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
