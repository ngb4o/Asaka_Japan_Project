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
import { Textarea } from "@/components/ui/textarea";
import { VndInput } from "@/components/ui/vnd-input";
import { ImageUpload } from "@/components/products/ImageUpload";
import { PreviewableImage } from "@/components/ui/previewable-image";
import { ProductDescriptionField } from "@/components/products/ProductDescriptionField";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import {
  MobileMediaCard,
  MobileMetaChip,
} from "@/components/ui/mobile-record-card";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import {
  SearchableSelect,
  STATUS_OPTIONS,
} from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { canManageProducts, rolesOf } from "@/lib/auth/permissions";
import { getProductCategories } from "@/lib/api/product-categories";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "@/lib/api/products";
import type { Product, ProductCategory } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { useDeferredFilters } from "@/lib/hooks/useDeferredFilters";
import { formatCurrency } from "@/lib/utils";
import { getStockDisplayParts } from "@/lib/inventoryUnits";
import { statusBadgeVariant } from "@/lib/status-badge";
import {
  buildProductPayload,
  validateProductForm,
  type ProductFormValues,
} from "@/lib/validation/payloads";

const EMPTY_FORM: ProductFormValues = {
  name: "",
  categoryId: "",
  price: "",
  unit: "chai",
  unitsPerCase: 1,
  images: [],
  status: "active",
};

const EMPTY_LIST_FILTERS = { categoryId: "", status: "" };

export default function ProductsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const canEdit = canManageProducts(rolesOf(user));
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [search, setSearch] = useState("");
  const filters = useDeferredFilters(EMPTY_LIST_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, string>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageNum: number) => {
      const result = await getProducts({
        search: search || undefined,
        categoryId: filters.applied.categoryId || undefined,
        status: filters.applied.status || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      });
      if (pageNum === 1) setOrderDrafts({});
      return result;
    },
    [search, filters.applied.categoryId, filters.applied.status]
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
  } = useMobilePagedList<Product>({ fetchPage, onError });

  const loadCategories = useCallback(async () => {
    try {
      const categoriesResult = await getProductCategories({ limit: 100, page: 1 });
      setCategories(categoriesResult.items);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được dữ liệu"
      );
    }
  }, [toast]);

  useEffect(() => {
    void reload();
    // Reload when filter query changes (fetchPage identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      categoryId: categories[0]?.id || "",
    });
    setDialogOpen(true);
  }

  function openEdit(item: Product) {
    setEditing(item);
    setForm({
      name: item.name,
      sku: item.sku,
      categoryId: item.categoryId,
      description: item.description,
      shortDescription: item.shortDescription || "",
      unit: item.unit || "chai",
      unitsPerCase: item.unitsPerCase || 1,
      price: item.price,
      costPrice: item.costPrice,
      activeIngredient: item.activeIngredient,
      packaging: item.packaging,
      image: item.image,
      images:
        item.images?.length > 0
          ? item.images
          : item.image
            ? [item.image]
            : [],
      status: item.status,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationError = validateProductForm(form);
    if (validationError) {
      toast.warning(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const payload = buildProductPayload(form);

      if (editing) {
        await updateProduct(editing.id, payload);
        toast.success("Đã cập nhật sản phẩm");
      } else {
        await createProduct(payload);
        toast.success("Đã thêm sản phẩm");
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
    item: Product,
    status: Product["status"]
  ) {
    if (!canEdit || status === item.status) return;

    setActionId(`status:${item.id}`);
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, status } : row))
    );

    try {
      await updateProduct(item.id, { status });
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

  async function saveDisplayOrder(item: Product) {
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
      const updated = await updateProduct(item.id, { displayOrder: nextOrder });
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
              a.name.localeCompare(b.name, "vi")
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

  async function handleDelete(item: Product) {
    const confirmed = await confirm({
      title: "Xóa sản phẩm",
      description: `Bạn có chắc muốn xóa "${item.name}"? Hành động này không thể hoàn tác.`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    setActionId(item.id);
    try {
      await deleteProduct(item.id);
      toast.success(`Đã xóa sản phẩm "${item.name}"`);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setActionId(null);
    }
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.products} />;
  }

  return (
    <div className="space-y-0 md:space-y-6">
      <PageHeader
        title="Sản phẩm"
        description={
          canEdit
            ? "Quản lý danh mục thuốc bảo vệ thực vật"
            : "Danh mục sản phẩm (chỉ xem)"
        }
        actions={
          canEdit ? (
            <Button onClick={openCreate} disabled={categories.length === 0}>
              <Plus className="h-4 w-4" />
              Thêm sản phẩm
            </Button>
          ) : null
        }
        fab={
          canEdit
            ? {
                onClick: openCreate,
                label: "Thêm sản phẩm",
                disabled: categories.length === 0,
              }
            : null
        }
      />

      {canEdit && categories.length === 0 && (
        <p className="text-sm text-amber-700">
          Vui lòng tạo ít nhất một loại sản phẩm trước khi thêm sản phẩm.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <SearchInput
              placeholder="Tìm theo tên sản phẩm..."
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
            title="Bộ lọc sản phẩm"
            onClear={filters.clearDraft}
            onApply={filters.apply}
            draftCount={filters.draftCount}>
            <FilterOptionList
              label="Loại sản phẩm"
              value={filters.draft.categoryId}
              onChange={(value) => filters.setDraftValue("categoryId", value)}
              searchable
              searchPlaceholder="Tìm loại..."
              options={[
                { value: "", label: "Tất cả loại" },
                ...categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
            />
            <FilterOptionList
              label="Trạng thái"
              value={filters.draft.status}
              onChange={(value) => filters.setDraftValue("status", value)}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                ...STATUS_OPTIONS.product,
              ]}
            />
          </FilterDrawer>

          {items.length === 0 ? (
            <EmptyState title="Chưa có sản phẩm" />
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
                  const thumb = item.image || item.images?.[0];
                  return (
                    <MobileMediaCard
                      key={item.id}
                      media={
                        thumb ? (
                          <PreviewableImage
                            src={thumb}
                            alt={item.name}
                            fill
                            className="rounded-xl border-0"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[var(--color-text-inverse)]">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )
                      }
                      title={item.name}
                      subtitle={item.categoryName || "Chưa phân loại"}
                      badge={
                        <Badge variant={statusBadgeVariant(item.status)}>
                          {item.status === "active" ? "Đang bán" : "Ngưng"}
                        </Badge>
                      }
                      meta={
                        <>
                          <MobileMetaChip>{formatCurrency(item.price)}</MobileMetaChip>
                          <MobileMetaChip>
                            {(() => {
                              const stock = getStockDisplayParts(
                                item.totalStock ?? 0,
                                item.unitsPerCase
                              );
                              return (
                                <span className="flex flex-col leading-tight">
                                  <span>Tồn {stock.primary}</span>
                                  {stock.secondary ? (
                                    <span className="text-[11px] opacity-80">
                                      ({stock.secondary})
                                    </span>
                                  ) : null}
                                </span>
                              );
                            })()}
                          </MobileMetaChip>
                        </>
                      }
                      actions={
                        canEdit ? (
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
                              aria-label={`Thứ tự hiển thị ${item.name}`}
                            />
                          </div>
                          <SearchableSelect
                            options={STATUS_OPTIONS.product}
                            value={item.status}
                            onChange={(value) =>
                              void handleQuickStatus(
                                item,
                                value as Product["status"]
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
                        ) : undefined
                      }
                    />
                  );
                })}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden md:block">
              <div className="crm-table-frame">
                <table className="crm-data-table min-w-[780px]">
                <thead>
                  <tr>
                    <th className="font-medium">STT</th>
                    <th className="font-medium">Ảnh</th>
                    <th className="font-medium">Tên</th>
                    <th className="font-medium">Loại</th>
                    <th className="font-medium">Giá bán</th>
                    <th className="font-medium">Tồn kho</th>
                    <th className="font-medium">Trạng thái</th>
                    {canEdit ? (
                      <th className="font-medium text-right">Thao tác</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {canEdit ? (
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
                          aria-label={`Thứ tự hiển thị ${item.name}`}
                        />
                        ) : (
                          <span className="tabular-nums text-[var(--color-text-inverse)]">
                            {item.displayOrder ?? 0}
                          </span>
                        )}
                      </td>
                      <td>
                        {item.image || item.images?.[0] ? (
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                            <PreviewableImage
                              src={item.image || item.images[0]}
                              alt={item.name}
                              fill
                              className="rounded-lg">
                              {(item.images?.length || (item.image ? 1 : 0)) >
                              1 ? (
                                <span className="pointer-events-none absolute bottom-0 right-0 z-[1] rounded-tl bg-black/70 px-1 text-[10px] font-medium text-white">
                                  {item.images?.length || 1}
                                </span>
                              ) : null}
                            </PreviewableImage>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-inverse)]">—</span>
                        )}
                      </td>
                      <td className="font-medium">{item.name}</td>
                      <td>{item.categoryName || "—"}</td>
                      <td>{formatCurrency(item.price)}</td>
                      <td className="font-medium">
                        {(() => {
                          const stock = getStockDisplayParts(
                            item.totalStock ?? 0,
                            item.unitsPerCase
                          );
                          return (
                            <span className="flex flex-col leading-tight">
                              <span>{stock.primary}</span>
                              {stock.secondary ? (
                                <span className="text-xs text-[var(--color-text-inverse)]">
                                  ({stock.secondary})
                                </span>
                              ) : null}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        {canEdit ? (
                          <div className="w-[140px]">
                            <SearchableSelect
                              options={STATUS_OPTIONS.product}
                              value={item.status}
                              onChange={(value) =>
                                void handleQuickStatus(
                                  item,
                                  value as Product["status"]
                                )
                              }
                              searchable={false}
                              disabled={actionId === `status:${item.id}`}
                              triggerClassName="h-8 text-xs"
                            />
                          </div>
                        ) : (
                          <Badge variant={item.status === "active" ? "success" : "muted"}>
                            {item.status === "active" ? "Đang bán" : "Ngưng"}
                          </Badge>
                        )}
                      </td>
                      {canEdit ? (
                      <td>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={actionId === item.id}
                            onClick={() => handleDelete(item)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      ) : null}
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
            <DialogTitle>{editing ? "Sửa sản phẩm" : "Thêm sản phẩm"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Tên sản phẩm *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="categoryId">Loại sản phẩm *</Label>
              <SearchableSelect
                id="categoryId"
                options={[
                  { value: "", label: "Chọn loại" },
                  ...categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
                value={form.categoryId}
                onChange={(next) => setForm({ ...form, categoryId: next })}
                placeholder="Chọn loại"
                searchPlaceholder="Tìm loại sản phẩm..."
              />
            </div>
            <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Giá bán (VND) *</Label>
                <VndInput
                  id="price"
                  placeholder="0"
                  value={form.price}
                  onValueChange={(price) => setForm({ ...form, price })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice">Giá vốn (VND)</Label>
                <VndInput
                  id="costPrice"
                  placeholder="0"
                  value={form.costPrice ?? ""}
                  onValueChange={(costPrice) => setForm({ ...form, costPrice })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitsPerCase">Số chai / 1 thùng</Label>
                <Input
                  id="unitsPerCase"
                  type="number"
                  min={1}
                  value={form.unitsPerCase ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      unitsPerCase:
                        e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  placeholder="VD: 20"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="shortDescription">Mô tả ngắn (landing page)</Label>
                <span className="text-xs text-[var(--color-text-inverse)]">
                  {(form.shortDescription || "").length}/300
                </span>
              </div>
              <Textarea
                id="shortDescription"
                value={form.shortDescription || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    shortDescription: e.target.value.slice(0, 300),
                  })
                }
                className="min-h-[88px]"
                placeholder="1–2 câu ngắn hiển thị dưới tên sản phẩm trên trang chủ..."
              />
            </div>
            <ProductDescriptionField
              value={form.description || ""}
              onChange={(description) => setForm({ ...form, description })}
            />
            <div className="space-y-2 md:col-span-2">
              <ImageUpload
                label="Ảnh sản phẩm"
                max={5}
                values={form.images || []}
                onValuesChange={(urls) =>
                  setForm({
                    ...form,
                    images: urls,
                    image: urls[0] || "",
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Trạng thái</Label>
              <SearchableSelect
                id="status"
                options={STATUS_OPTIONS.product}
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
            <DialogFooter className="md:col-span-2">
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
