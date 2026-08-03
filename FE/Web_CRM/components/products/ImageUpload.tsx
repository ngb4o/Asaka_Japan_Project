"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useToast } from "@/components/providers/ToastProvider";
import {
  uploadProductImage,
  type UploadResult,
  getImageUrl,
} from "@/lib/api/uploads";
import { cn } from "@/lib/utils";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

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
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const selected = files.slice(0, remaining);
    if (!selected.length) {
      toast.warning(`Chỉ được tải tối đa ${max} ảnh`);
      if (inputRef.current) inputRef.current.value = "";
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
      if (inputRef.current) {
        inputRef.current.value = "";
      }
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="block">{label}</Label>
        {isMulti ? (
          <span className="text-xs text-[var(--color-text-inverse)]">
            {images.length}/{max} ảnh
          </span>
        ) : null}
      </div>

      <div className={cn("flex flex-wrap gap-3", isMulti && "gap-3")}>
        {images.map((url, index) => (
          <div key={`${url}-${index}`} className="relative block w-fit">
            <button
              type="button"
              className="relative h-28 w-28 overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] transition hover:ring-2 hover:ring-[var(--color-text-secondary)]/30"
              onClick={() => setPreviewSrc(url)}
              aria-label={`Xem ảnh ${index + 1}`}
            >
              <Image
                src={getImageUrl(url)}
                alt={`Ảnh ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </button>
            {isMulti && index === 0 ? (
              <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Chính
              </span>
            ) : null}
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="absolute -right-2 -top-2 h-7 w-7 rounded-full p-0"
              onClick={() => removeAt(index)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}

        {canAdd ? (
          <Button
            type="button"
            variant="outline"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
            className="h-28 w-28 rounded-lg border-dashed bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-inverse)] shadow-none hover:border-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
          >
            <span className="flex flex-col items-center gap-1.5">
              <ImagePlus className="h-5 w-5" />
              Thêm ảnh
            </span>
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-[var(--color-text-inverse)]">
        {isMulti
          ? `JPEG, PNG, WEBP, GIF - tối đa ${max} ảnh - mỗi ảnh ≤ 20MB`
          : "JPEG, PNG, WEBP, GIF - tối đa 20MB"}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        multiple={isMulti && remaining > 1}
        onChange={handleFileChange}
      />

      <ImageLightbox
        src={previewSrc}
        alt={label}
        onClose={() => setPreviewSrc(null)}
      />
    </div>
  );
}
