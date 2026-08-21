"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, MapPin, Pencil, Plus, RefreshCw, Trash2, UserPlus } from "@/components/ui/icons";
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
import { SearchableSelect, STATUS_OPTIONS } from "@/components/ui/searchable-select";
import { Copyable, PhoneLink } from "@/components/ui/smart-text";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canManageLeads, rolesOf } from "@/lib/auth/permissions";
import {
  convertLeadToDealer,
  createLead,
  deleteLead,
  getLead,
  getLeads,
  updateLead,
} from "@/lib/api/leads";
import type { Lead, LeadInput } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { useDeferredFilters } from "@/lib/hooks/useDeferredFilters";
import { useDeepLinkOpen } from "@/lib/hooks/useDeepLinkOpen";
import { useCrmDataRefresh } from "@/lib/hooks/useCrmDataRefresh";
import { leadStatusBadgeVariant } from "@/lib/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  LocationCapture,
  type GeoLocationValue,
} from "@/components/trips/LocationCapture";
import {
  openGoogleMapsDirections,
  placeMapsDestination,
} from "@/lib/maps/directions";

const EMPTY_LIST_FILTERS = { status: "", type: "", region: "" };

const EMPTY_FORM: LeadInput = {
  name: "",
  phone: "",
  email: "",
  company: "",
  region: "",
  message: "",
  type: "contact",
  source: "",
};

function geoFromLead(item: Lead): GeoLocationValue | null {
  if (
    typeof item.lat === "number" &&
    typeof item.lng === "number" &&
    Number.isFinite(item.lat) &&
    Number.isFinite(item.lng)
  ) {
    return { lat: item.lat, lng: item.lng, locationSource: "manual" };
  }
  return null;
}

export default function LeadsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const canWrite = canManageLeads(rolesOf(user));
  const [search, setSearch] = useState("");
  const filters = useDeferredFilters(EMPTY_LIST_FILTERS);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<LeadInput>(EMPTY_FORM);
  const [createGeo, setCreateGeo] = useState<GeoLocationValue | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Lead["status"]>("new");
  const [detailGeo, setDetailGeo] = useState<GeoLocationValue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editGeo, setEditGeo] = useState<GeoLocationValue | null>(null);
  const [regionOptions, setRegionOptions] = useState<{ value: string; label: string }[]>([]);
  const [isAddingRegion, setIsAddingRegion] = useState(false);
  const regionInputRef = useRef<HTMLInputElement>(null);
  const isLeadAction = (id: string, kind: "status" | "convert" | "delete") =>
    updatingId === `${kind}:${id}`;

  const fetchPage = useCallback(
    (pageNum: number) =>
      getLeads({
        search: search || undefined,
        status: filters.applied.status || undefined,
        type: filters.applied.type || undefined,
        region: filters.applied.region || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [search, filters.applied.status, filters.applied.type, filters.applied.region]
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

  useCrmDataRefresh(["leads"], async () => {
    await refresh();
    if (selected) {
      try {
        const updated = await getLead(selected.id);
        setSelected(updated);
        setStatus(updated.status);
        setNote(updated.note || "");
        setDetailGeo(geoFromLead(updated));
      } catch {
        /* ignore */
      }
    }
  });

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
    void reload();
    // Reload when filter query changes (fetchPage identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreateGeo(null);
    setIsAddingRegion(false);
    setCreateOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setForm({
      name: lead.name,
      phone: lead.phone || "",
      email: lead.email || "",
      company: lead.company || "",
      region: lead.region || "",
      message: lead.message || "",
      type: lead.type,
    });
    setEditGeo(geoFromLead(lead));
    setIsAddingRegion(false);
    setEditOpen(true);
  }

  useEffect(() => {
    if (isAddingRegion) {
      regionInputRef.current?.focus();
    }
  }, [isAddingRegion]);

  async function handleCreate() {
    if (form.name.trim().length < 2) {
      toast.warning("Nhập tên khách tiềm năng");
      return;
    }
    if (form.phone.trim().length < 8) {
      toast.warning("Nhập số điện thoại hợp lệ");
      return;
    }
    setCreating(true);
    try {
      await createLead({
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || "",
        company: form.company?.trim() || "",
        region: form.region?.trim() || "",
        message: form.message?.trim() || "",
        type: form.type || "contact",
        source: "crm",
        lat: createGeo?.lat ?? null,
        lng: createGeo?.lng ?? null,
      });
      toast.success("Đã thêm khách tiềm năng");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setCreateGeo(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Thêm lead thất bại"
      );
    } finally {
      setCreating(false);
    }
  }

  function openDetail(lead: Lead) {
    setSelected(lead);
    setNote(lead.note || "");
    setStatus(lead.status);
    setDetailGeo(geoFromLead(lead));
  }

  useDeepLinkOpen(async (id) => {
    try {
      const lead = await getLead(id);
      openDetail(lead);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không mở được lead"
      );
      throw err;
    }
  });

  async function handleSave() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await updateLead(selected.id, {
        status,
        note,
        lat: detailGeo?.lat ?? null,
        lng: detailGeo?.lng ?? null,
      });
      toast.success("Đã cập nhật lead");
      setSelected(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editing) return;
    if (form.name.trim().length < 2) {
      toast.warning("Nhập tên khách tiềm năng");
      return;
    }
    setSubmitting(true);
    try {
      await updateLead(editing.id, {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        company: form.company || null,
        region: form.region || null,
        message: form.message || null,
        type: form.type,
        lat: editGeo?.lat ?? null,
        lng: editGeo?.lng ?? null,
      });
      toast.success("Đã cập nhật khách tiềm năng");
      setEditOpen(false);
      setEditing(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickStatus(item: Lead, nextStatus: Lead["status"]) {
    if (nextStatus === item.status) return;

    setUpdatingId(`status:${item.id}`);
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

    setUpdatingId(`convert:${lead.id}`);
    try {
      await convertLeadToDealer(lead.id);
      toast.success("Đã tạo đại lý từ lead");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Chuyển đổi thất bại");
    } finally {
      setUpdatingId(null);
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

    setUpdatingId(`delete:${lead.id}`);
    try {
      await deleteLead(lead.id);
      toast.success("Đã xóa lead");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.leads} />;
  }

  const selectedMapsDest = selected
    ? placeMapsDestination({
        lat: detailGeo?.lat ?? selected.lat,
        lng: detailGeo?.lng ?? selected.lng,
      })
    : null;

  return (
    <div className="space-y-0 lg:space-y-2">
      <PageHeader
        title="Lead liên hệ"
        actions={
          canWrite ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Thêm lead
            </Button>
          ) : null
        }
        fab={canWrite ? { onClick: openCreate, label: "Thêm lead" } : null}
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách lead</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <SearchInput
              placeholder="Tìm theo tên, SĐT, email..."
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
            title="Bộ lọc lead"
            onClear={filters.clearDraft}
            onApply={filters.apply}
            draftCount={filters.draftCount}>
            <FilterOptionList
              label="Trạng thái"
              value={filters.draft.status}
              onChange={(value) => filters.setDraftValue("status", value)}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                ...STATUS_OPTIONS.lead,
              ]}
            />
            <FilterOptionList
              label="Loại"
              value={filters.draft.type}
              onChange={(value) => filters.setDraftValue("type", value)}
              options={[
                { value: "", label: "Tất cả loại" },
                ...STATUS_OPTIONS.leadType,
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
            <EmptyState title="Chưa có lead" />
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
                    const typeLabel =
                      STATUS_OPTIONS.leadType.find((o) => o.value === item.type)
                        ?.label || item.type;
                    return (
                    <MobileRecordCard key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            className="text-base font-semibold tracking-tight text-[var(--color-text-primary)] hover:text-[var(--color-text-secondary)]"
                            onClick={() => openDetail(item)}>
                            {item.name}
                          </button>
                          {item.company ? (
                            <p className="mt-1 text-[16px] font-medium leading-snug text-[var(--color-text-primary)]">
                              {item.company}
                            </p>
                          ) : null}
                          {item.phone ? (
                            <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                              <PhoneLink value={item.phone} />
                            </p>
                          ) : null}
                        </div>
                        <Badge
                          variant={leadStatusBadgeVariant(item.status)}
                          className="shrink-0">
                          {STATUS_OPTIONS.lead.find((o) => o.value === item.status)?.label ||
                            item.status}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <MobileMetaChip>
                          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                        </MobileMetaChip>
                        {item.email ? (
                          <MobileMetaChip>
                            <Copyable
                              value={item.email}
                              label="email"
                              className="text-[14px] font-medium text-[var(--color-text-primary)]"
                            />
                          </MobileMetaChip>
                        ) : null}
                        {item.region ? <MobileMetaChip>{item.region}</MobileMetaChip> : null}
                        {geoFromLead(item) ? (
                          <MobileMetaChip>
                            <MapPin className="mr-1 inline h-3.5 w-3.5" />
                            Đã ghim
                          </MobileMetaChip>
                        ) : null}
                        {typeLabel ? <MobileMetaChip>{typeLabel}</MobileMetaChip> : null}
                      </div>

                        <MobileRecordActions>
                        <SearchableSelect
                          options={STATUS_OPTIONS.lead}
                          value={item.status}
                          onChange={(value) =>
                            handleQuickStatus(item, value as Lead["status"])
                          }
                          searchable={false}
                          placeholder="Đổi trạng thái"
                          disabled={Boolean(updatingId?.endsWith(`:${item.id}`))}
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 min-w-9"
                              title="Đổi trạng thái"
                              loading={isLeadAction(item.id, "status")}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 min-w-9"
                          onClick={() => openDetail(item)}
                          title="Xem chi tiết">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canWrite ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-w-9"
                            onClick={() => openEdit(item)}
                            title="Sửa">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {!item.dealerId && item.type === "dealer" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 min-w-9"
                            title="Chuyển đại lý"
                            loading={isLeadAction(item.id, "convert")}
                            onClick={() => handleConvert(item)}>
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          variant="danger"
                          size="sm"
                          className="h-9 min-w-9"
                          title="Xóa"
                          loading={isLeadAction(item.id, "delete")}
                          onClick={() => handleDelete(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                      <th className="font-medium">SĐT</th>
                      <th className="font-medium">Trạng thái</th>
                      <th className="font-medium">Ngày</th>
                      <th className="font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <button
                            type="button"
                            className="font-medium text-left hover:text-[var(--color-text-secondary)]"
                            onClick={() => openDetail(item)}>
                            {item.name}
                          </button>
                          {item.company ? (
                            <p className="text-xs text-[var(--color-text-inverse)]">{item.company}</p>
                          ) : null}
                        </td>
                        <td>
                          {item.phone ? <PhoneLink value={item.phone} /> : "—"}
                        </td>
                        <td>
                          <div className="w-[160px]">
                            <SearchableSelect
                              options={STATUS_OPTIONS.lead}
                              value={item.status}
                              onChange={(value) =>
                                handleQuickStatus(item, value as Lead["status"])
                              }
                              searchable={false}
                              disabled={Boolean(updatingId?.endsWith(`:${item.id}`))}
                              triggerClassName="h-8 text-xs"
                            />
                          </div>
                        </td>
                        <td className="text-[var(--color-text-inverse)]">
                          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
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
                            {canWrite ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(item)}
                                title="Sửa">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {!item.dealerId && item.type === "dealer" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                loading={isLeadAction(item.id, "convert")}
                                onClick={() => handleConvert(item)}
                                title="Chuyển đại lý">
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            ) : null}
                            <Button
                              variant="danger"
                              size="sm"
                              loading={isLeadAction(item.id, "delete")}
                              onClick={() => handleDelete(item)} title="Xóa">
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setForm(EMPTY_FORM);
            setCreateGeo(null);
          }
        }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Thêm khách tiềm năng</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="lead-name">Họ tên</Label>
              <Input
                id="lead-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-phone">Số điện thoại</Label>
              <Input
                id="lead-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lead-email">Email</Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-company">Công ty</Label>
                <Input
                  id="lead-company"
                  value={form.company || ""}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lead-region">Khu vực</Label>
                {isAddingRegion ? (
                  <div className="flex gap-2">
                    <Input
                      id="lead-region"
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
                    value={form.region ?? ""}
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
              <div className="space-y-2">
                <Label>Loại</Label>
                <SearchableSelect
                  options={STATUS_OPTIONS.leadType}
                  value={form.type || "contact"}
                  onChange={(value) =>
                    setForm({ ...form, type: value as Lead["type"] })
                  }
                  searchable={false}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-message">Nội dung</Label>
              <Textarea
                id="lead-message"
                value={form.message || ""}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <LocationCapture
              label="Địa chỉ"
              hint="Ghim khi đến gặp — lần sau chỉ đường quay lại"
              value={createGeo}
              onChange={setCreateGeo}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => void handleCreate()} loading={creating}>
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chi tiết lead</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <MobileRecordCard className="p-4 shadow-none">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                      {selected.name}
                    </p>
                    {selected.company ? (
                      <p className="mt-1 text-[16px] font-medium leading-snug text-[var(--color-text-primary)]">
                        {selected.company}
                      </p>
                    ) : null}
                    {selected.phone ? (
                      <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                        <PhoneLink value={selected.phone} />
                      </p>
                    ) : null}
                  </div>
                  <Badge
                    variant={leadStatusBadgeVariant(selected.status)}
                    className="shrink-0">
                    {STATUS_OPTIONS.lead.find((o) => o.value === selected.status)?.label ||
                      selected.status}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <MobileMetaChip>
                    {new Date(selected.createdAt).toLocaleDateString("vi-VN")}
                  </MobileMetaChip>
                  {selected.email ? (
                    <MobileMetaChip>
                      <Copyable
                        value={selected.email}
                        label="email"
                        className="text-[14px] font-medium text-[var(--color-text-primary)]"
                      />
                    </MobileMetaChip>
                  ) : null}
                  {selected.region ? (
                    <MobileMetaChip>{selected.region}</MobileMetaChip>
                  ) : null}
                  {geoFromLead(selected) || detailGeo ? (
                    <MobileMetaChip>
                      <MapPin className="mr-1 inline h-3.5 w-3.5" />
                      Đã ghim
                    </MobileMetaChip>
                  ) : null}
                  <MobileMetaChip>
                    {STATUS_OPTIONS.leadType.find((o) => o.value === selected.type)
                      ?.label || selected.type}
                  </MobileMetaChip>
                </div>
              </MobileRecordCard>
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
              <LocationCapture
                label="Địa chỉ"
                hint="Ghim khi đến gặp — lần sau chỉ đường quay lại"
                value={detailGeo}
                onChange={setDetailGeo}
              />
              {selectedMapsDest ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => openGoogleMapsDirections(selectedMapsDest)}>
                  <MapPin className="h-4 w-4" />
                  Chỉ đường quay lại
                </Button>
              ) : null}
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Đóng
                </Button>
                <Button onClick={handleSave} loading={submitting}>
                  Lưu
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => !open && setEditOpen(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa khách tiềm năng" : "Thêm khách tiềm năng"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); void handleEdit(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-lead-name">Họ tên *</Label>
              <Input
                id="edit-lead-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-lead-phone">SĐT</Label>
                <Input
                  id="edit-lead-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lead-email">Email</Label>
                <Input
                  id="edit-lead-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lead-company">Công ty</Label>
              <Input
                id="edit-lead-company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lead-region">Khu vực</Label>
              {isAddingRegion ? (
                <div className="flex gap-2">
                  <Input
                    id="edit-lead-region"
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
                  value={form.region ?? ""}
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
            <div className="space-y-2">
              <Label htmlFor="edit-lead-message">Nội dung</Label>
              <Textarea
                id="edit-lead-message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Loại</Label>
              <SearchableSelect
                options={STATUS_OPTIONS.leadType}
                value={form.type ?? "contact"}
                onChange={(value) => setForm({ ...form, type: value as Lead["type"] })}
                searchable={false}
              />
            </div>
            <LocationCapture
              label="GPS"
              value={editGeo}
              onChange={setEditGeo}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
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
