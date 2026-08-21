"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ImageUpload } from "@/components/products/ImageUpload";
import { useToast } from "@/components/providers/ToastProvider";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { uploadOrderPhoto } from "@/lib/api/uploads";
import { compressImage } from "@/lib/imageCompression";
import type { Order } from "@/lib/types";

type DeliveryPhotoDialogProps = {
  open: boolean;
  order: Order | null;
  nextStatus: "delivering" | "completed" | null;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSkip: () => void;
  onConfirm: (photos: string[]) => void;
};

export function DeliveryPhotoDialog({
  open,
  submitting = false,
  onOpenChange,
  onSkip,
  onConfirm,
}: DeliveryPhotoDialogProps) {
  const toast = useToast();
  const isMobile = useIsMobile();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPhoto("");
      setUploading(false);
    }
  }, [open]);

  const busy = submitting || uploading;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadOrderPhoto(await compressImage(file));
      onConfirm([result.url]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tải ảnh thất bại");
      setUploading(false);
    }
  }

  if (!isMobile) {
    return (
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (busy) return;
          onOpenChange(next);
        }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm ảnh</DialogTitle>
          </DialogHeader>
          <ImageUpload
            label="Ảnh giao hàng"
            value={photo}
            onChange={setPhoto}
            max={1}
            upload={uploadOrderPhoto}
            onUploadingChange={setUploading}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onSkip}>
              Bỏ qua
            </Button>
            <Button
              type="button"
              loading={submitting}
              disabled={busy}
              onClick={() => onConfirm(photo ? [photo] : [])}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
      title="Thêm ảnh">
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
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

      <div className="-mx-1 divide-y divide-[var(--color-border-subtle)]">
        <button
          type="button"
          disabled={busy}
          className="flex h-12 w-full items-center gap-3 px-3 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
          onClick={() => cameraInputRef.current?.click()}>
          <Camera className="h-5 w-5 shrink-0 text-[var(--color-text-inverse)]" />
          Chụp ảnh
        </button>
        <button
          type="button"
          disabled={busy}
          className="flex h-12 w-full items-center gap-3 px-3 text-left text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
          onClick={() => galleryInputRef.current?.click()}>
          <ImageIcon className="h-5 w-5 shrink-0 text-[var(--color-text-inverse)]" />
          Chọn từ thư viện
        </button>
      </div>

      <div className="px-4 pb-3 pt-3">
        <Button
          type="button"
          className="w-full"
          disabled={busy}
          loading={submitting}
          onClick={onSkip}>
          Bỏ qua
        </Button>
      </div>
    </BottomSheet>
  );
}
