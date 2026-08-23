"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2, X } from "@/components/ui/icons";
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
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import {
  MobileRecordActions,
  MobileRecordCard,
  MobileRecordCardHeader,
} from "@/components/ui/mobile-record-card";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import {
  SearchableSelect,
  STATUS_OPTIONS,
} from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  createProductCategory,
  deleteProductCategory,
  getProductCategories,
  updateProductCategory,
} from "@/lib/api/product-categories";
import type { PestTypeOption, ProductCategory } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { useDeferredFilters } from "@/lib/hooks/useDeferredFilters";
import { cn } from "@/lib/utils";
import { statusBadgeVariant } from "@/lib/status-badge";
import {
  buildProductCategoryPayload,
  validateProductCategoryForm,
  type ProductCategoryFormValues,
} from "@/lib/validation/payloads";

const EMPTY_FORM: ProductCategoryFormValues = {
  name: "",
  status: "active",
  pestTypes: [],
};

const EMPTY_LIST_FILTERS = { status: "" };

export default function ProductCategoriesPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const filters = useDeferredFilters(EMPTY_LIST_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState<ProductCategoryFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchPage = useCallback(
    (pageNum: number) =>
      getProductCategories({
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
  } = useMobilePagedList<ProductCategory>({ fetchPage, onError });

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: ProductCategory) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description,
      status: item.status,
      pestTypes: item.pestTypes ? [...item.pestTypes] : [],
    });
    setDialogOpen(true);
  }

  async function handleQuickStatus(
    item: ProductCategory,
    status: ProductCategory["status"]
  ) {
    if (status === item.status) return;

    setActionId(`status:${item.id}`);
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, status } : row))
    );

    try {
      await updateProductCategory(item.id, {
        name: item.name,
        description: item.description,
        status,
        pestTypes: item.pestTypes,
      });
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationError = validateProductCategoryForm(form);
    if (validationError) {
      toast.warning(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const payload = buildProductCategoryPayload(form);

      if (editing) {
        await updateProductCategory(editing.id, payload);
        toast.success("Đã cập nhật loại sản phẩm");
      } else {
        await createProductCategory(payload);
        toast.success("Đã thêm loại sản phẩm");
      }
      setDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: ProductCategory) {
    const confirmed = await confirm({
      title: "Xóa loại sản phẩm",
      description: `Bạn có chắc muốn xóa "${item.name}"? Hành động này không thể hoàn tác.`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    setActionId(item.id);
    try {
      await deleteProductCategory(item.id);
      toast.success(`Đã xóa loại "${item.name}"`);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setActionId(null);
    }
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.categories} />;
  }

  return (
    <div className="space-y-0 lg:space-y-2">
      <PageHeader
        title="Loại sản phẩm"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm loại
          </Button>
        }
        fab={{ onClick: openCreate, label: "Thêm loại" }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <SearchInput
              placeholder="Tìm theo tên..."
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
            title="Bộ lọc loại sản phẩm"
            onClear={filters.clearDraft}
            onApply={filters.apply}
            draftCount={filters.draftCount}>
            <FilterOptionList
              label="Trạng thái"
              value={filters.draft.status}
              onChange={(value) => filters.setDraftValue("status", value)}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                ...STATUS_OPTIONS.category,
              ]}
            />
          </FilterDrawer>

          {items.length === 0 ? (
            <EmptyState
              title={
                search.trim()
                  ? loading
                    ? "Đang tìm..."
                    : "Không tìm thấy loại sản phẩm"
                  : "Chưa có loại sản phẩm"
              }
            />
          ) : (
            <div className={cn("space-y-4", loading && "opacity-60")}>
              <MobileInfiniteList
                onRefresh={refresh}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
                disabled={loading}>
                <div className="flex flex-col gap-3">
                  {items.map((item) => (
                    <MobileRecordCard key={item.id} className="p-4">
                      <MobileRecordCardHeader
                        title={item.name}
                        subtitle={item.description || undefined}
                        trailing={
                          <Badge variant={statusBadgeVariant(item.status)}>
                            {item.status === "active" ? "Hoạt động" : "Ngưng"}
                          </Badge>
                        }
                      />
                      {item.pestTypes && item.pestTypes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.pestTypes.slice(0, 4).map((pt) => (
                            <span
                              key={pt.value}
                              className="inline-flex items-center rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                              {pt.label}
                            </span>
                          ))}
                          {item.pestTypes.length > 4 && (
                            <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                              +{item.pestTypes.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      <MobileRecordActions>
                        <SearchableSelect
                          options={STATUS_OPTIONS.category}
                          value={item.status}
                          onChange={(value) =>
                            void handleQuickStatus(
                              item,
                              value as ProductCategory["status"]
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
                      </MobileRecordActions>
                    </MobileRecordCard>
                  ))}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden lg:block">
              <div className="crm-table-frame">
                <table className="crm-data-table min-w-[640px]">
                <thead>
                  <tr>
                    <th className="font-medium">Tên</th>
                    <th className="font-medium">Slug</th>
                    <th className="font-medium">Trạng thái</th>
                    <th className="font-medium">Mô tả</th>
                    <th className="font-medium">Loại con</th>
                    <th className="font-medium text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.name}</td>
                      <td className="text-[var(--color-text-inverse)]">{item.slug}</td>
                      <td>
                        <div className="w-[140px]">
                          <SearchableSelect
                            options={STATUS_OPTIONS.category}
                            value={item.status}
                            onChange={(value) =>
                              void handleQuickStatus(
                                item,
                                value as ProductCategory["status"]
                              )
                            }
                            searchable={false}
                            disabled={actionId === `status:${item.id}`}
                            triggerClassName="h-8 text-xs"
                          />
                        </div>
                      </td>
                      <td className="max-w-xs truncate text-[var(--color-text-inverse)]">
                        {item.description || "—"}
                      </td>
                      <td>
                        {item.pestTypes && item.pestTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {item.pestTypes.slice(0, 3).map((pt) => (
                              <span
                                key={pt.value}
                                className="inline-flex items-center rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                                {pt.label}
                              </span>
                            ))}
                            {item.pestTypes.length > 3 && (
                              <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                                +{item.pestTypes.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-inverse)]">—</span>
                        )}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sửa loại sản phẩm" : "Thêm loại sản phẩm"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên loại *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Trạng thái</Label>
                <SearchableSelect
                  id="status"
                  options={STATUS_OPTIONS.category}
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
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Loại con (pestTypes)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      pestTypes: [
                        ...(f.pestTypes || []),
                        { value: "", label: "" },
                      ],
                    }))
                  }>
                  <Plus className="h-3 w-3" />
                  Thêm loại con
                </Button>
              </div>

              {(!form.pestTypes || form.pestTypes.length === 0) ? (
                <p className="text-sm text-[var(--color-text-inverse)]">
                  Chưa có loại con nào. Nhấn "Thêm loại con" để tạo.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.pestTypes!.map((pt, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Giá trị (slug, VD: sau-duc-than)"
                        value={pt.value}
                        onChange={(e) => {
                          const updated = [...(form.pestTypes || [])];
                          updated[index] = { ...updated[index], value: e.target.value };
                          setForm((f) => ({ ...f, pestTypes: updated }));
                        }}
                        className="flex-1 font-mono text-xs"
                      />
                      <Input
                        placeholder="Nhãn hiển thị (VD: Sâu đục thân)"
                        value={pt.label}
                        onChange={(e) => {
                          const updated = [...(form.pestTypes || [])];
                          updated[index] = { ...updated[index], label: e.target.value };
                          setForm((f) => ({ ...f, pestTypes: updated }));
                        }}
                        className="flex-[2]"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 shrink-0 text-red-500 hover:text-red-600"
                        onClick={() => {
                          const updated = [...(form.pestTypes || [])];
                          updated.splice(index, 1);
                          setForm((f) => ({ ...f, pestTypes: updated }));
                        }}
                        title="Xóa loại con">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
