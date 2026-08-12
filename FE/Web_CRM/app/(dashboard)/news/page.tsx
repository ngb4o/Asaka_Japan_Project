"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageIcon, Pencil, Plus, RefreshCw, Trash2 } from "@/components/ui/icons";
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
import { ImageUpload } from "@/components/products/ImageUpload";
import { PreviewableImage } from "@/components/ui/previewable-image";
import { NewsContentField } from "@/components/news/NewsContentField";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import { MobileMediaCard } from "@/components/ui/mobile-record-card";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import {
  SearchableSelect,
  STATUS_OPTIONS,
} from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import { createNews, deleteNews, getNews, updateNews } from "@/lib/api/news";
import { uploadNewsImage } from "@/lib/api/uploads";
import type { News } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { useDeferredFilters } from "@/lib/hooks/useDeferredFilters";
import {
  buildNewsPayload,
  validateNewsForm,
  type NewsFormValues,
} from "@/lib/validation/payloads";
import { statusBadgeVariant } from "@/lib/status-badge";

const EMPTY_FORM: NewsFormValues = {
  title: "",
  content: "",
  status: "active",
};

function truncateText(text: string, maxLength = 120) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

const EMPTY_LIST_FILTERS = { status: "" };

export default function NewsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const filters = useDeferredFilters(EMPTY_LIST_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<News | null>(null);
  const [form, setForm] = useState<NewsFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, string>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  const fetchPage = useCallback(
    (pageNum: number) =>
      getNews({
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
    reload,
    refresh,
    loadMore,
    goToPage,
  } = useMobilePagedList<News>({ fetchPage, onError });

  useEffect(() => {
    setOrderDrafts({});
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  const reloadList = useCallback(async () => {
    setOrderDrafts({});
    await reload();
  }, [reload]);

  const refreshList = useCallback(async () => {
    setOrderDrafts({});
    await refresh();
  }, [refresh]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: News) {
    setEditing(item);
    setForm({
      title: item.title,
      content: item.content,
      image: item.image,
      status: item.status,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationError = validateNewsForm(form);
    if (validationError) {
      toast.warning(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const payload = buildNewsPayload(form);

      if (editing) {
        await updateNews(editing.id, payload);
        toast.success("Đã cập nhật tin tức");
      } else {
        await createNews(payload);
        toast.success("Đã thêm tin tức");
      }
      setDialogOpen(false);
      await reloadList();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickStatus(item: News, status: News["status"]) {
    if (status === item.status) return;

    setActionId(`status:${item.id}`);
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, status } : row))
    );

    try {
      await updateNews(item.id, { status });
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

  async function saveDisplayOrder(item: News) {
    const raw = orderDrafts[item.id];
    const nextOrder =
      raw === undefined || raw === ""
        ? item.displayOrder ?? 0
        : Math.max(0, Math.floor(Number(raw) || 0));
    const current = item.displayOrder ?? 0;

    if (nextOrder === current) {
      setOrderDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      return;
    }

    setSavingOrderId(item.id);
    try {
      const updated = await updateNews(item.id, { displayOrder: nextOrder });
      setItems((prev) =>
        prev
          .map((row) =>
            row.id === item.id
              ? { ...row, displayOrder: updated.displayOrder ?? nextOrder }
              : row
          )
          .sort(
            (a, b) =>
              (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
              a.title.localeCompare(b.title, "vi")
          )
      );
      setOrderDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      toast.success("Đã cập nhật thứ tự hiển thị");
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không cập nhật được thứ tự"
      );
      setOrderDrafts((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } finally {
      setSavingOrderId(null);
    }
  }

  async function handleDelete(item: News) {
    const confirmed = await confirm({
      title: "Xóa tin tức",
      description: `Bạn có chắc muốn xóa "${item.title}"? Hành động này không thể hoàn tác.`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    setActionId(item.id);
    try {
      await deleteNews(item.id);
      toast.success(`Đã xóa tin "${item.title}"`);
      await reloadList();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setActionId(null);
    }
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.news} />;
  }

  return (
    <div className="space-y-0 lg:space-y-2">
      <PageHeader
        title="Tin tức"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm tin tức
          </Button>
        }
        fab={{ onClick: openCreate, label: "Thêm tin tức" }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <SearchInput
              placeholder="Tìm theo tiêu đề, nội dung..."
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
            title="Bộ lọc tin tức"
            onClear={filters.clearDraft}
            onApply={filters.apply}
            draftCount={filters.draftCount}>
            <FilterOptionList
              label="Trạng thái"
              value={filters.draft.status}
              onChange={(value) => filters.setDraftValue("status", value)}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                ...STATUS_OPTIONS.news,
              ]}
            />
          </FilterDrawer>

          {items.length === 0 ? (
            <EmptyState title="Chưa có tin tức" />
          ) : (
            <div className="space-y-4">
              <MobileInfiniteList
                onRefresh={refreshList}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
                disabled={loading}>
                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <MobileMediaCard
                      key={item.id}
                      mediaClassName="h-[4.5rem] w-[6rem]"
                      media={
                        item.image ? (
                          <PreviewableImage
                            src={item.image}
                            alt={item.title}
                            fill
                            className="rounded-xl border-0"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[var(--color-text-inverse)]">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )
                      }
                      title={item.title}
                      subtitle={truncateText(item.content, 90)}
                      badge={
                        <Badge variant={statusBadgeVariant(item.status)}>
                          {item.status === "active" ? "Hiển thị" : "Ẩn"}
                        </Badge>
                      }
                      actions={
                        <>
                          <div className="mr-auto flex items-center gap-2">
                            <span className="text-xs text-[var(--color-text-inverse)]">STT</span>
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-16 px-2 text-center"
                              disabled={savingOrderId === item.id}
                              value={
                                orderDrafts[item.id] ?? String(item.displayOrder ?? 0)
                              }
                              onChange={(e) =>
                                setOrderDrafts((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              onBlur={() => void saveDisplayOrder(item)}
                              aria-label={`Thứ tự hiển thị ${item.title}`}
                            />
                          </div>
                          <SearchableSelect
                            options={STATUS_OPTIONS.news}
                            value={item.status}
                            onChange={(value) =>
                              void handleQuickStatus(
                                item,
                                value as News["status"]
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
                      }
                    />
                  ))}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden lg:block">
              <div className="crm-table-frame">
                <table className="crm-data-table min-w-[760px]">
                <thead>
                  <tr>
                    <th className="font-medium">STT</th>
                    <th className="font-medium">Ảnh</th>
                    <th className="font-medium">Tiêu đề</th>
                    <th className="font-medium">Nội dung</th>
                    <th className="font-medium">Trạng thái</th>
                    <th className="font-medium text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-16 px-2 text-center"
                          disabled={savingOrderId === item.id}
                          value={
                            orderDrafts[item.id] ?? String(item.displayOrder ?? 0)
                          }
                          onChange={(e) =>
                            setOrderDrafts((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          onBlur={() => void saveDisplayOrder(item)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                          aria-label={`Thứ tự hiển thị ${item.title}`}
                        />
                      </td>
                      <td>
                        {item.image ? (
                          <div className="relative h-12 w-16 overflow-hidden rounded-lg">
                            <PreviewableImage
                              src={item.image}
                              alt={item.title}
                              fill
                              className="rounded-lg"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-inverse)]">—</span>
                        )}
                      </td>
                      <td className="max-w-[220px] font-medium">{item.title}</td>
                      <td className="max-w-[320px] text-[var(--color-text-inverse)]">
                        {truncateText(item.content)}
                      </td>
                      <td>
                        <div className="w-[140px]">
                          <SearchableSelect
                            options={STATUS_OPTIONS.news}
                            value={item.status}
                            onChange={(value) =>
                              void handleQuickStatus(
                                item,
                                value as News["status"]
                              )
                            }
                            searchable={false}
                            disabled={actionId === `status:${item.id}`}
                            triggerClassName="h-8 text-xs"
                          />
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa tin tức" : "Thêm tin tức"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tiêu đề *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Trạng thái</Label>
                <SearchableSelect
                  id="status"
                  options={STATUS_OPTIONS.news}
                  value={form.status || "active"}
                  onChange={(next) =>
                    setForm({
                      ...form,
                      status: next as "active" | "inactive",
                    })
                  }
                  searchable={false}
                />
              </div>
            </div>
            <NewsContentField
              value={form.content}
              onChange={(content) => setForm({ ...form, content })}
            />
            <ImageUpload
              label="Ảnh tin tức"
              value={form.image}
              onChange={(url) => setForm({ ...form, image: url })}
              upload={uploadNewsImage}
            />
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
