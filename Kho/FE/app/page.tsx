"use client";

import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  ImagePlus,
  Inbox,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { PreviewableImage } from "@/components/PreviewableImage";
import { createItem, deleteItem, listItems, mediaUrl, updateItem } from "@/lib/api";
import { isAllowedImage, prepareImageFile } from "@/lib/imageFile";
import type { ItemInput, ItemList, WarehouseItem } from "@/lib/types";

const PAGE_SIZE = 12;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const emptyList: ItemList = {
  items: [],
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  totalPages: 1,
  columns: [],
  summary: { totalItems: 0, totalQuantity: 0, columnCount: 0 },
};

export default function HomePage() {
  const [data, setData] = useState<ItemList>(emptyList);
  const [query, setQuery] = useState("");
  const [column, setColumn] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WarehouseItem | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setPage(1);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await listItems({
        q: query || undefined,
        column: column || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setData(next);
      if (next.page !== page) setPage(next.page);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
      setReady(true);
    }
  }, [column, page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(item: WarehouseItem) {
    setEditing(item);
    setDialogOpen(true);
  }

  async function handleSubmit(input: ItemInput) {
    if (editing) {
      await updateItem(editing.id, input);
      setToast("Đã cập nhật sản phẩm");
    } else {
      await createItem(input);
      setToast("Đã thêm sản phẩm vào kho");
    }
    setDialogOpen(false);
    setEditing(null);
    await load();
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setActionId(pendingDelete.id);
    try {
      await deleteItem(pendingDelete.id);
      setToast(`Đã xóa sản phẩm "${pendingDelete.name}"`);
      setPendingDelete(null);
      if (editing?.id === pendingDelete.id) {
        setDialogOpen(false);
        setEditing(null);
      }
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Xóa thất bại");
    } finally {
      setActionId(null);
    }
  }

  if (!ready && loading) {
    return <PageSkeleton />;
  }

  const filteredEmpty = Boolean(query || column);

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-surface-muted)] p-3 sm:p-4">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Sản phẩm</h1>
        <button type="button" onClick={openCreate} className={`${primaryButton} shrink-0`}>
          <Plus className="h-4 w-4" />
          Thêm sản phẩm
        </button>
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
        <div className="flex shrink-0 items-center border-b border-[var(--color-border-subtle)] px-4 py-3">
          <h2 className="text-base font-semibold tracking-tight">Danh sách</h2>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
          <div className="flex shrink-0 gap-2">
            <SearchBox value={query} onSearch={handleSearch} />
          </div>

            {data.items.length === 0 ? (
              <div className="flex min-h-0 flex-1 items-center justify-center">
              <EmptyState
                title={filteredEmpty ? "Không có sản phẩm khớp bộ lọc" : "Chưa có sản phẩm"}
                description={
                  filteredEmpty
                    ? "Thử tên khác hoặc chọn tất cả cột."
                    : "Thêm sản phẩm với ảnh, số lượng và số cột trong kho."
                }
              />
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto lg:hidden">
                  {data.items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3 shadow-[var(--shadow-card)] ring-1 ring-black/[0.03]"
                    >
                      <div className="flex gap-3">
                        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]">
                          {item.image ? (
                            <PreviewableImage src={mediaUrl(item.image)} alt={item.name} />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[var(--color-text-inverse)]">
                              <ImageIcon className="h-6 w-6" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug">{item.name}</p>
                            <span className="shrink-0 rounded-full bg-[var(--color-badge-success-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--color-badge-success-fg)]">
                              {item.column == null ? "Chưa có cột" : `Cột ${item.column}`}
                            </span>
                          </div>
                          <div className="mt-2">
                            <span className="inline-flex rounded-md bg-[var(--color-surface-muted)] px-2.5 py-1 text-sm font-medium">
                              Số lượng {formatQuantity(item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3.5 flex justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-3.5">
                        <button type="button" className={outlineButton} title="Sửa" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={dangerButton}
                          title="Xóa"
                          disabled={actionId === item.id}
                          onClick={() => setPendingDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="crm-table-scroll hidden min-h-0 flex-1 overflow-auto lg:block">
                  <div className="crm-table-frame min-h-full border-0">
                    <table className="crm-data-table min-w-[720px]">
                      <thead>
                        <tr>
                          <th className="font-medium">Ảnh</th>
                          <th className="font-medium">Tên</th>
                          <th className="font-medium">Số lượng</th>
                          <th className="font-medium">Cột</th>
                          <th className="text-right font-medium">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((item) => (
                          <tr key={item.id}>
                            <td>
                              {item.image ? (
                                <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-[var(--color-border-subtle)]">
                                  <PreviewableImage src={mediaUrl(item.image)} alt={item.name} />
                                </div>
                              ) : (
                                <span className="text-xs text-[var(--color-text-inverse)]">—</span>
                              )}
                            </td>
                            <td className="font-medium">{item.name}</td>
                            <td className="font-medium tabular-nums">{formatQuantity(item.quantity)}</td>
                            <td className="tabular-nums">{item.column ?? "—"}</td>
                            <td>
                              <div className="flex justify-end gap-2">
                                <button type="button" className={outlineButton} title="Sửa" onClick={() => openEdit(item)}>
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className={dangerButton}
                                  title="Xóa"
                                  disabled={actionId === item.id}
                                  onClick={() => setPendingDelete(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  total={data.total}
                  limit={data.limit}
                  disabled={loading}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        </section>

      {dialogOpen ? (
        <ItemDialog
          key={editing?.id ?? "create"}
          editing={editing}
          onClose={() => {
            setDialogOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Xóa sản phẩm"
          description={`Bạn có chắc muốn xóa "${pendingDelete.name}"? Hành động này không thể hoàn tác.`}
          confirmText="Xóa"
          loading={actionId === pendingDelete.id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void handleDelete()}
        />
      ) : null}

      {toast ? (
        <p className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0c2810] px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </p>
      ) : null}
    </div>
  );
}

function SearchBox({ value, onSearch }: { value: string; onSearch: (value: string) => void }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft.trim() !== value.trim()) onSearch(draft.trim());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, onSearch, value]);

  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Tìm theo tên sản phẩm..."
        aria-label="Tìm theo tên sản phẩm"
        className="crm-toolbar-elevated h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] pr-9 pl-9 text-sm shadow-sm outline-none placeholder:text-[var(--color-text-inverse)] focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]"
      />
      {draft ? (
        <button
          type="button"
          aria-label="Xóa tìm kiếm"
          className="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)]"
          onClick={() => {
            setDraft("");
            onSearch("");
          }}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function ItemDialog({
  editing,
  onClose,
  onSubmit,
}: {
  editing: WarehouseItem | null;
  onClose: () => void;
  onSubmit: (input: ItemInput) => Promise<void>;
}) {
  const imageInputId = useId();
  const [name, setName] = useState(editing?.name ?? "");
  const [quantity, setQuantity] = useState(editing ? String(editing.quantity) : "");
  const [column, setColumn] = useState(editing?.column == null ? "" : String(editing.column));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(editing?.image ? mediaUrl(editing.image) : "");
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function chooseFile(next: File | null) {
    if (!next) return;
    if (!isAllowedImage(next)) {
      setError("Chỉ nhận ảnh JPEG, PNG, WEBP, GIF hoặc HEIC");
      return;
    }
    if (next.size > MAX_IMAGE_BYTES) {
      setError("Ảnh tối đa 20MB");
      return;
    }

    setError("");
    setPreparing(true);
    try {
      const prepared = await prepareImageFile(next);
      setFile(prepared);
      setPreview(URL.createObjectURL(prepared));
    } catch {
      setFile(next);
      setPreview("");
    } finally {
      setPreparing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    const quantityValue = Number(quantity);
    const columnText = column.trim();
    const columnValue = columnText ? Number(columnText) : null;

    if (trimmedName.length < 2) {
      setError("Tên sản phẩm tối thiểu 2 ký tự");
      return;
    }
    if (!Number.isFinite(quantityValue) || quantityValue < 0) {
      setError("Số lượng phải là số từ 0 trở lên");
      return;
    }
    if (
      columnValue != null &&
      (!Number.isInteger(columnValue) || columnValue < 1 || columnValue > 9999)
    ) {
      setError("Cột phải là số nguyên từ 1 đến 9999");
      return;
    }
    if (!editing && !file) {
      setError("Hãy chọn ảnh sản phẩm");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        name: trimmedName,
        quantity: quantityValue,
        column: columnValue,
        image: file,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message && message !== "Failed to fetch" ? message : "Không tải được ảnh lên. Hãy thử lại.");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <button type="button" aria-label="Đóng" className="absolute inset-0" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--color-surface-elevated)] shadow-xl sm:max-w-lg sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold">{editing ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4 px-4 py-4 sm:px-6 sm:py-6">
          <Field label="Tên sản phẩm *" htmlFor="item-name">
            <input id="item-name" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Số lượng *" htmlFor="item-quantity">
              <input
                id="item-quantity"
                inputMode="decimal"
                value={quantity}
                placeholder="0"
                onChange={(event) => setQuantity(sanitizeQuantity(event.target.value))}
                className={fieldClass}
              />
            </Field>
            <Field label="Cột" htmlFor="item-column">
              <input
                id="item-column"
                inputMode="numeric"
                value={column}
                placeholder="Nhập sau"
                onChange={(event) => setColumn(event.target.value.replace(/[^\d]/g, ""))}
                className={fieldClass}
              />
            </Field>
          </div>
          <div className="space-y-2">
            <label htmlFor={imageInputId} className="text-sm font-medium">
              Ảnh sản phẩm{editing ? "" : " *"}
            </label>
            <div className="flex gap-3">
              {preview ? (
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border-subtle)]">
                  <PreviewableImage src={preview} alt={name || "Ảnh sản phẩm"} />
                </div>
              ) : null}
              <label
                htmlFor={imageInputId}
                className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-inverse)] hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {preparing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                {preparing ? "Đang xử lý" : preview ? "Đổi ảnh" : "Thêm ảnh"}
              </label>
              {file && !preview ? (
                <p className="self-end text-xs text-[var(--color-text-inverse)]">
                  Đã chọn {file.name}. Ảnh sẽ được chuyển sang JPEG khi lưu.
                </p>
              ) : null}
              <input
                id={imageInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
                disabled={preparing}
                className="sr-only"
                onChange={(event) => {
                  chooseFile(event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className={`${outlineButton} h-10 px-4 text-sm`}>
              Hủy
            </button>
            <button type="submit" disabled={submitting || preparing} className={primaryButton}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  confirmText,
  loading,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmText: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface-elevated)] p-5 shadow-xl">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-[var(--color-text-inverse)]">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={`${outlineButton} h-10 px-4 text-sm`}>
            Hủy
          </button>
          <button type="button" disabled={loading} onClick={onConfirm} className={`${dangerButton} h-10 px-4 text-sm`}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-6 py-12 text-center"
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-inverse)] shadow-sm ring-1 ring-[var(--color-border-subtle)]">
        <Inbox className="h-5 w-5" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium sm:text-base">{title}</p>
        <p className="text-sm text-[var(--color-text-inverse)]">{description}</p>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  limit,
  disabled,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = visiblePages(page, totalPages);

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-[var(--color-border-subtle)] pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--color-text-inverse)]">
        Hiển thị <span className="font-medium text-[var(--color-text-primary)]">{from}</span>
        {" - "}
        <span className="font-medium text-[var(--color-text-primary)]">{to}</span>
        {" trong tổng số "}
        <span className="font-medium text-[var(--color-text-primary)]">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={outlineButton}
          disabled={disabled || page <= 1}
          aria-label="Trang trước"
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((pageNumber, index) => {
          const previous = pages[index - 1];
          const showEllipsis = previous !== undefined && pageNumber - previous > 1;
          return (
            <span key={pageNumber} className="flex items-center gap-1">
              {showEllipsis ? <span className="px-1 text-sm text-[var(--color-text-inverse)]">...</span> : null}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPageChange(pageNumber)}
                className={pageNumber === page ? `${primaryButton} h-8 min-w-9 px-3 text-xs` : `${outlineButton} min-w-9`}
              >
                {pageNumber}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          className={outlineButton}
          disabled={disabled || page >= totalPages}
          aria-label="Trang sau"
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function visiblePages(page: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set<number>([1, totalPages, page]);
  if (page > 1) pages.add(page - 1);
  if (page < totalPages) pages.add(page + 1);
  return [...pages].sort((a, b) => a - b);
}

function PageSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-[var(--color-surface-muted)] p-3 sm:p-4">
      <div className="mb-3 h-10 w-40 shrink-0 animate-pulse rounded-lg bg-white" />
      <div className="min-h-0 flex-1 animate-pulse rounded-[var(--radius-card)] bg-white" />
    </div>
  );
}

function formatQuantity(value: number) {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

function sanitizeQuantity(value: string) {
  const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const [whole, ...fraction] = cleaned.split(".");
  if (!fraction.length) return whole;
  return `${whole}.${fraction.join("").slice(0, 2)}`;
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="space-y-2 text-sm font-medium">
      <span className="block">{label}</span>
      {children}
    </label>
  );
}

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#016502] disabled:opacity-50";

const outlineButton =
  "inline-flex h-8 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-xs font-semibold text-[var(--color-text-primary)] shadow-sm transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50";

const dangerButton =
  "inline-flex h-8 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-red-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50";

const fieldClass =
  "flex h-10 w-full rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 text-sm font-normal shadow-sm outline-none placeholder:text-[var(--color-text-inverse)] focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";
