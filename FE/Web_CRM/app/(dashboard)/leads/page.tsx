"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2, UserPlus } from "@/components/ui/icons";
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

const EMPTY_LIST_FILTERS = { status: "", type: "" };

const EMPTY_FORM: LeadInput = {
  name: "",
  phone: "",
  email: "",
  company: "",
  region: "",
  message: "",
  type: "contact",
};

export default function LeadsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const canWrite = canManageLeads(rolesOf(user));
  const [search, setSearch] = useState("");
  const filters = useDeferredFilters(EMPTY_LIST_FILTERS);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<LeadInput>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Lead["status"]>("new");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const isLeadAction = (id: string, kind: "status" | "convert" | "delete") =>
    updatingId === `${kind}:${id}`;

  const fetchPage = useCallback(
    (pageNum: number) =>
      getLeads({
        search: search || undefined,
        status: filters.applied.status || undefined,
        type: filters.applied.type || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [search, filters.applied.status, filters.applied.type]
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
      } catch {
        /* ignore */
      }
    }
  });

  useEffect(() => {
    void reload();
    // Reload when filter query changes (fetchPage identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  }

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
      });
      toast.success("Đã thêm khách tiềm năng");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
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
      await updateLead(selected.id, { status, note });
      toast.success("Đã cập nhật lead");
      setSelected(null);
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
                          title="Sửa">
                          <Pencil className="h-4 w-4" />
                        </Button>
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
                              title="Sửa">
                              <Pencil className="h-4 w-4" />
                            </Button>
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
          if (!open) setForm(EMPTY_FORM);
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
                <Input
                  id="lead-region"
                  value={form.region || ""}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                />
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
    </div>
  );
}
