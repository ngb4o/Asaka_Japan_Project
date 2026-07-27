"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
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
import type { ProductCategory } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE, shouldReloadPreviousPage } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import {
  buildProductCategoryPayload,
  validateProductCategoryForm,
  type ProductCategoryFormValues,
} from "@/lib/validation/payloads";

const EMPTY_FORM: ProductCategoryFormValues = {
  name: "",
  status: "active",
};

export default function ProductCategoriesPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState<ProductCategoryFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProductCategories({
        search: search || undefined,
        page,
        limit: DEFAULT_PAGE_SIZE,
      });
      setItems(result.items);
      if (shouldReloadPreviousPage(result, page)) {
        setPage(result.totalPages);
        return;
      }
      setPage(result.page);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [search, page, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    });
    setDialogOpen(true);
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
      await loadData();
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

    try {
      await deleteProductCategory(item.id);
      toast.success(`Đã xóa loại "${item.name}"`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    }
  }

  if (initialLoading) {
    return <PageSkeleton {...PAGE_SKELETONS.categories} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loại sản phẩm"
        description="Quản lý nhóm sản phẩm BVTV"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm loại
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Danh sách</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Tìm theo tên..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">
              {search.trim()
                ? loading
                  ? "Đang tìm..."
                  : "Không tìm thấy loại sản phẩm"
                : "Chưa có loại sản phẩm"}
            </p>
          ) : (
            <div className={cn("space-y-4", loading && "opacity-60")}>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                    <th className="px-2 py-3 font-medium">Tên</th>
                    <th className="px-2 py-3 font-medium">Slug</th>
                    <th className="px-2 py-3 font-medium">Trạng thái</th>
                    <th className="px-2 py-3 font-medium">Mô tả</th>
                    <th className="px-2 py-3 font-medium text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                      <td className="px-2 py-3 font-medium">{item.name}</td>
                      <td className="px-2 py-3 text-[var(--color-text-inverse)]">{item.slug}</td>
                      <td className="px-2 py-3">
                        <Badge variant={item.status === "active" ? "success" : "muted"}>
                          {item.status === "active" ? "Hoạt động" : "Ngưng"}
                        </Badge>
                      </td>
                      <td className="max-w-xs truncate px-2 py-3 text-[var(--color-text-inverse)]">
                        {item.description || "—"}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(item)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={DEFAULT_PAGE_SIZE}
                onPageChange={setPage}
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
            <div className="space-y-2">
              <Label htmlFor="name">Tên loại *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                Lưu
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
