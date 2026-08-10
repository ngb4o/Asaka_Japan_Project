"use client";

import { useRef, useState } from "react";
import { Camera, ImageIcon, ImagePlus, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PreviewableImage } from "@/components/ui/previewable-image";
import { useToast } from "@/components/providers/ToastProvider";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  uploadProductImage,
  type UploadResult,
} from "@/lib/api/uploads";

type ImageUploadProps = {
  /** Single-image mode (news). Prefer `values` for multi. */
  value?: string;
  onChange?: (url: string) => void;
  /** Multi-image mode */
  values?: string[];
  onValuesChange?: (urls: string[]) => void;
  label?: string;
  max?: number;
  upload?: (file: File) => Promise<UploadResult>;
};

export function ImageUpload({
  value,
  onChange,
  values,
  onValuesChange,
  label = "Ảnh sản phẩm",
  max = 1,
  upload = uploadProductImage,
}: ImageUploadProps) {
  const toast = useToast();
  const isMobile = useIsMobile();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);

  const isMulti = max > 1;
  const images = isMulti
    ? values ?? []
    : value
      ? [value]
      : [];
  const remaining = Math.max(0, max - images.length);
  const canAdd = remaining > 0;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const maxBytes = 20 * 1024 * 1024;
    const oversized = files.find((file) => file.size > maxBytes);
    if (oversized) {
      toast.warning("Mỗi ảnh tối đa 20MB");
      event.target.value = "";
      return;
    }

    const selected = files.slice(0, remaining);
    if (!selected.length) {
      toast.warning(`Chỉ được tải tối đa ${max} ảnh`);
      event.target.value = "";
      return;
    }

    if (files.length > remaining) {
      toast.warning(`Chỉ thêm được ${remaining} ảnh nữa (tối đa ${max})`);
    }

    setUploading(true);

    try {
      const uploaded: string[] = [];

      for (const file of selected) {
        const result = await upload(file);
        uploaded.push(result.url);
      }

      const next = [...images, ...uploaded].slice(0, max);

      if (isMulti) {
        onValuesChange?.(next);
      } else {
        onChange?.(next[0] || "");
      }

      toast.success(
        uploaded.length > 1
          ? `Đã tải ${uploaded.length} ảnh lên`
          : "Đã tải ảnh lên"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tải ảnh thất bại");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function removeAt(index: number) {
    const next = images.filter((_, i) => i !== index);
    if (isMulti) {
      onValuesChange?.(next);
    } else {
      onChange?.(next[0] || "");
    }
  }

  function openAddPicker() {
    if (isMobile) {
      setSourcePickerOpen(true);
      return;
    }
    galleryInputRef.current?.click();
  }

  function pickFromCamera() {
    setSourcePickerOpen(false);
    // Let sheet close before opening native picker
    window.setTimeout(() => cameraInputRef.current?.click(), 180);
  }

  function pickFromGallery() {
    setSourcePickerOpen(false);
    window.setTimeout(() => galleryInputRef.current?.click(), 180);
  }

  return (
    <div className="w-full min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="block">{label}</Label>
        {isMulti ? (
          <span className="text-xs text-[var(--color-text-inverse)]">
            {images.length}/{max} ảnh
          </span>
        ) : null}
      </div>

      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <div className="flex w-full min-w-0 flex-nowrap gap-3 overflow-x-auto overscroll-x-contain pb-2 pt-1 [-webkit-overflow-scrolling:touch]">
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative block h-28 w-28 shrink-0">
              <PreviewableImage
                src={url}
                alt={`${label} ${index + 1}`}
                fill
                className="rounded-lg transition hover:ring-2 hover:ring-[var(--color-text-secondary)]/30"
              />
              {isMulti && index === 0 ? (
                <span className="pointer-events-none absolute bottom-1 left-1 z-[1] rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Chính
                </span>
              ) : null}
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="absolute right-1 top-1 z-[1] h-7 w-7 rounded-full p-0"
                onClick={() => removeAt(index)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {canAdd ? (
            <Button
              type="button"
              variant="outline"
              loading={uploading}
              onClick={openAddPicker}
              className="h-28 w-28 shrink-0 rounded-lg border-dashed bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-inverse)] shadow-none hover:border-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]">
              <span className="flex flex-col items-center gap-1.5">
                <ImagePlus className="h-5 w-5" />
                Thêm ảnh
              </span>
            </Button>
          ) : null}
        </div>
      </div>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        multiple={isMulti && remaining > 1}
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <BottomSheet
        open={sourcePickerOpen}
        onOpenChange={setSourcePickerOpen}
        title="Thêm ảnh">
        <div className="-mx-1 divide-y divide-[var(--color-border-subtle)]">
          <button
            type="button"
            className="flex h-12 w-full items-center gap-3 px-3 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]"
            onClick={pickFromCamera}>
            <Camera className="h-5 w-5 shrink-0 text-[var(--color-text-inverse)]" />
            Chụp ảnh
          </button>
          <button
            type="button"
            className="flex h-12 w-full items-center gap-3 px-3 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)]"
            onClick={pickFromGallery}>
            <ImageIcon className="h-5 w-5 shrink-0 text-[var(--color-text-inverse)]" />
            Chọn từ thư viện
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
