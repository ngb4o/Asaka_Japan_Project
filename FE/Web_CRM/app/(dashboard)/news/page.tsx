"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
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
import { ImageUpload } from "@/components/products/ImageUpload";
import { NewsContentField } from "@/components/news/NewsContentField";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import {
  SearchableSelect,
  STATUS_OPTIONS,
} from "@/components/ui/searchable-select";
import { createNews, deleteNews, getNews, updateNews } from "@/lib/api/news";
import { getImageUrl, uploadNewsImage } from "@/lib/api/uploads";
import type { News } from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE, shouldReloadPreviousPage } from "@/lib/pagination";
import {
  buildNewsPayload,
  validateNewsForm,
  type NewsFormValues,
} from "@/lib/validation/payloads";

const EMPTY_FORM: NewsFormValues = {
  title: "",
  content: "",
  status: "active",
};

function truncateText(text: string, maxLength = 120) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export default function NewsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<News | null>(null);
  const [form, setForm] = useState<NewsFormValues>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, string>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getNews({
        search: search || undefined,
        page,
        limit: DEFAULT_PAGE_SIZE,
      });
      setItems(result.items);
      setOrderDrafts({});
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
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setSubmitting(false);
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

    try {
      await deleteNews(item.id);
      toast.success(`Đã xóa tin "${item.title}"`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    }
  }

  if (loading && items.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.news} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tin tức</h1>
          <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
            Quản lý bài viết tin tức
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Thêm tin tức
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Tìm theo tiêu đề, nội dung..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có tin tức</p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                    <th className="px-2 py-3 font-medium">STT</th>
                    <th className="px-2 py-3 font-medium">Ảnh</th>
                    <th className="px-2 py-3 font-medium">Tiêu đề</th>
                    <th className="px-2 py-3 font-medium">Nội dung</th>
                    <th className="px-2 py-3 font-medium">Trạng thái</th>
                    <th className="px-2 py-3 font-medium text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                      <td className="px-2 py-3">
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
                      <td className="px-2 py-3">
                        {item.image ? (
                          <div className="relative h-12 w-16 overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]">
                            <Image
                              src={getImageUrl(item.image)}
                              alt={item.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-inverse)]">—</span>
                        )}
                      </td>
                      <td className="max-w-[220px] px-2 py-3 font-medium">{item.title}</td>
                      <td className="max-w-[320px] px-2 py-3 text-[var(--color-text-inverse)]">
                        {truncateText(item.content)}
                      </td>
                      <td className="px-2 py-3">
                        <Badge variant={item.status === "active" ? "success" : "muted"}>
                          {item.status === "active" ? "Hiển thị" : "Ẩn"}
                        </Badge>
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Sửa tin tức" : "Thêm tin tức"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Tiêu đề *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
