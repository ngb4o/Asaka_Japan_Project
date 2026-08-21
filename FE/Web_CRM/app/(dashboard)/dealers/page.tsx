"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DealerDetailDialog } from "@/components/dealers/DealerDetailDialog";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { SearchableSelect, STATUS_OPTIONS } from "@/components/ui/searchable-select";
import { PhoneLink } from "@/components/ui/smart-text";
import {
  MobileMetaChip,
  MobileRecordActions,
  MobileRecordCard,
} from "@/components/ui/mobile-record-card";
import {
  FilterDrawer,
  FilterOptionList,
  FilterTrigger,
} from "@/components/ui/filter-drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { LocationCapture, type GeoLocationValue } from "@/components/trips/LocationCapture";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canManageDealers, rolesOf } from "@/lib/auth/permissions";
import {
  createDealer,
  deleteDealer,
  getDealer,
  getDealers,
  updateDealer,
} from "@/lib/api/dealers";
import type { Dealer } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { useDeferredFilters } from "@/lib/hooks/useDeferredFilters";
import { useDeepLinkOpen } from "@/lib/hooks/useDeepLinkOpen";
import { useCrmDataRefresh } from "@/lib/hooks/useCrmDataRefresh";
import { statusBadgeVariant } from "@/lib/status-badge";
import { Badge } from "@/components/ui/badge";

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
  geo: GeoLocationValue | null;
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
  geo: null,
};

const EMPTY_LIST_FILTERS = { status: "", tier: "", region: "" };

export default function DealersPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const canWrite = canManageDealers(rolesOf(user));
  const [search, setSearch] = useState("");
  const filters = useDeferredFilters(EMPTY_LIST_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<Dealer | null>(null);
  const [editing, setEditing] = useState<Dealer | null>(null);
  const [form, setForm] = useState<DealerFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [regionOptions, setRegionOptions] = useState<{ value: string; label: string }[]>([]);
  const [isAddingRegion, setIsAddingRegion] = useState(false);
  const regionInputRef = useRef<HTMLInputElement>(null);
  const isDealerAction = (id: string, kind: "update" | "delete") =>
    updatingId === `${kind}:${id}`;

  const fetchPage = useCallback(
    (pageNum: number) =>
      getDealers({
        search: search || undefined,
        status: filters.applied.status || undefined,
        tier: filters.applied.tier || undefined,
        region: filters.applied.region || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [search, filters.applied.status, filters.applied.tier, filters.applied.region]
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
  } = useMobilePagedList<Dealer>({ fetchPage, onError });

  useCrmDataRefresh(["dealers"], () => refresh());

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  useEffect(() => {
    const regions = Array.from(
      new Set(
        items
          .map((item) => item.region)
          .filter((r): r is string => Boolean(r.trim()))
      )
    ).sort();
    setRegionOptions(
      regions.map((r) => ({ value: r, label: r }))
    );
  }, [items]);

  useEffect(() => {
    if (isAddingRegion) {
      regionInputRef.current?.focus();
    }
  }, [isAddingRegion]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openDetail(item: Dealer) {
    setViewing(item);
    setDetailOpen(true);
  }

  useDeepLinkOpen(async (id) => {
    try {
      const dealer = await getDealer(id);
      openDetail(dealer);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không mở được đại lý"
      );
      throw err;
    }
  });

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
      geo:
        typeof item.lat === "number" &&
        typeof item.lng === "number" &&
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lng)
          ? { lat: item.lat, lng: item.lng, locationSource: "manual" }
          : null,
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
        lat: form.geo?.lat ?? null,
        lng: form.geo?.lng ?? null,
      };

      if (editing) {
        await updateDealer(editing.id, payload);
        toast.success("Đã cập nhật đại lý");
      } else {
        await createDealer(payload);
        toast.success("Đã thêm đại lý");
      }
      setDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickUpdate(
    item: Dealer,
    patch: Partial<Pick<Dealer, "tier" | "status">>
  ) {
    const nextTier = patch.tier ?? item.tier;
    const nextStatus = patch.status ?? item.status;
    if (nextTier === item.tier && nextStatus === item.status) return;

    setUpdatingId(`update:${item.id}`);
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, tier: nextTier, status: nextStatus } : row
      )
    );

    try {
      await updateDealer(item.id, {
        tier: nextTier,
        status: nextStatus,
      } as Parameters<typeof updateDealer>[1]);
      toast.success("Đã cập nhật đại lý");
    } catch (err) {
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? item : row))
      );
      toast.error(
        err instanceof ApiClientError ? err.message : "Cập nhật thất bại"
      );
    } finally {
      setUpdatingId(null);
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

    setUpdatingId(`delete:${item.id}`);
    try {
      await deleteDealer(item.id);
      toast.success("Đã xóa đại lý");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.dealers} />;
  }

  return (
    <div className="space-y-0 lg:space-y-2">
      <PageHeader
        title="Đại lý"
        actions={
          canWrite ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Thêm đại lý
            </Button>
          ) : null
        }
        fab={canWrite ? { onClick: openCreate, label: "Thêm đại lý" } : null}
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đại lý</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <SearchInput
              placeholder="Tìm theo tên, SĐT, khu vực..."
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
            title="Bộ lọc đại lý"
            onClear={filters.clearDraft}
            onApply={filters.apply}
            draftCount={filters.draftCount}>
            <FilterOptionList
              label="Trạng thái"
              value={filters.draft.status}
              onChange={(value) => filters.setDraftValue("status", value)}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                ...STATUS_OPTIONS.dealer,
              ]}
            />
            <FilterOptionList
              label="Hạng"
              value={filters.draft.tier}
              onChange={(value) => filters.setDraftValue("tier", value)}
              options={[
                { value: "", label: "Tất cả hạng" },
                ...STATUS_OPTIONS.dealerTier,
              ]}
            />
            <FilterOptionList
              label="Khu vực"
              value={filters.draft.region}
              onChange={(value) => filters.setDraftValue("region", value)}
              options={[
                { value: "", label: "Tất cả khu vực" },
                ...regionOptions,
              ]}
            />
          </FilterDrawer>

          {items.length === 0 ? (
            <EmptyState title="Chưa có đại lý" />
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
                    const tierLabel =
                      STATUS_OPTIONS.dealerTier.find((o) => o.value === item.tier)?.label ||
                      item.tier;
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
                          </div>
                          <Badge
                            variant={statusBadgeVariant(item.status)}
                            className="shrink-0">
                            {STATUS_OPTIONS.dealer.find((o) => o.value === item.status)?.label ||
                              item.status}
                          </Badge>
                        </div>

                        <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
                          <div>
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              Hạng
                            </p>
                            <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-secondary)]">
                              {tierLabel}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[var(--color-text-inverse)]">
                              CK %
                            </p>
                            <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                              {item.discountPercent}%
                            </p>
                          </div>
                        </div>

                        {(item.phone || item.region) ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {item.phone ? (
                              <MobileMetaChip>
                                <PhoneLink
                                  value={item.phone}
                                  className="text-[14px] font-medium text-[var(--color-text-primary)]"
                                />
                              </MobileMetaChip>
                            ) : null}
                            {item.region ? (
                              <MobileMetaChip>{item.region}</MobileMetaChip>
                            ) : null}
                          </div>
                        ) : null}

                        <MobileRecordActions
                          divider={Boolean(item.phone || item.region)}>
                          {canWrite ? (
                            <SearchableSelect
                              options={STATUS_OPTIONS.dealer}
                              value={item.status}
                              onChange={(value) =>
                                void handleQuickUpdate(item, {
                                  status: value as Dealer["status"],
                                })
                              }
                              searchable={false}
                              placeholder="Đổi trạng thái"
                              trigger={
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 min-w-9"
                                  title="Đổi trạng thái"
                                  loading={isDealerAction(item.id, "update")}>
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              }
                            />
                          ) : null}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-w-9"
                            onClick={() => openDetail(item)}
                            title="Xem sản phẩm / đơn hàng">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canWrite ? (
                            <>
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
                                loading={isDealerAction(item.id, "delete")}
                                onClick={() => handleDelete(item)} title="Xóa">
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
                  <table className="crm-data-table min-w-[900px]">
                  <thead>
                    <tr>
                      <th className="font-medium">Tên</th>
                      <th className="font-medium">Liên hệ</th>
                      <th className="font-medium">Khu vực</th>
                      <th className="font-medium">Hạng</th>
                      <th className="font-medium">Chiết khấu</th>
                      <th className="font-medium">Trạng thái</th>
                      <th className="font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="font-medium">{item.name}</td>
                        <td>
                          <p>{item.contactName || "—"}</p>
                          <p className="text-xs text-[var(--color-text-inverse)]">
                            <PhoneLink value={item.phone} />
                          </p>
                        </td>
                        <td>{item.region || "—"}</td>
                        <td>
                          {canWrite ? (
                            <div className="w-[140px]">
                              <SearchableSelect
                                options={STATUS_OPTIONS.dealerTier}
                                value={item.tier}
                                onChange={(value) =>
                                  handleQuickUpdate(item, {
                                    tier: value as Dealer["tier"],
                                  })
                                }
                                searchable={false}
                                disabled={Boolean(updatingId?.endsWith(`:${item.id}`))}
                                triggerClassName="h-8 text-xs"
                              />
                            </div>
                          ) : (
                            STATUS_OPTIONS.dealerTier.find((o) => o.value === item.tier)
                              ?.label || item.tier
                          )}
                        </td>
                        <td>
                          {item.discountPercent > 0
                            ? `${item.discountPercent}%`
                            : "—"}
                        </td>
                        <td>
                          {canWrite ? (
                            <div className="w-[140px]">
                              <SearchableSelect
                                options={STATUS_OPTIONS.dealer}
                                value={item.status}
                                onChange={(value) =>
                                  handleQuickUpdate(item, {
                                    status: value as Dealer["status"],
                                  })
                                }
                                searchable={false}
                                disabled={Boolean(updatingId?.endsWith(`:${item.id}`))}
                                triggerClassName="h-8 text-xs"
                              />
                            </div>
                          ) : (
                            <Badge variant={statusBadgeVariant(item.status)}>
                              {STATUS_OPTIONS.dealer.find((o) => o.value === item.status)
                                ?.label || item.status}
                            </Badge>
                          )}
                        </td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetail(item)}
                              title="Xem sản phẩm / đơn hàng">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canWrite ? (
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
                                  loading={isDealerAction(item.id, "delete")}
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
                {isAddingRegion ? (
                  <div className="flex gap-2">
                    <Input
                      id="region"
                      ref={regionInputRef}
                      value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddingRegion(false);
                        setForm({ ...form, region: "" });
                      }}
                    >
                      Hủy
                    </Button>
                  </div>
                ) : (
                  <SearchableSelect
                    options={[{ value: "__add__", label: "+ Thêm khu vực mới" }, ...regionOptions]}
                    value={form.region}
                    onChange={(value) => {
                      if (value !== "__add__") {
                        setForm({ ...form, region: value });
                      }
                    }}
                    onSelect={(value) => {
                      if (value === "__add__") {
                        setIsAddingRegion(true);
                        return true; // prevent close
                      }
                      return false;
                    }}
                    clearable
                  />
                )}
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
            <LocationCapture
              label="GPS đại lý"
              value={form.geo}
              onChange={(geo) => setForm({ ...form, geo })}
            />
            <div className="grid grid-cols-2 gap-4">
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
              <div className="col-span-2 space-y-2">
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
            <DialogFooter>
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
