"use client";

import { useRef, useState } from "react";
import { Camera, ImageIcon, ImagePlus, GripVertical, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PreviewableImage } from "@/components/ui/previewable-image";
import { useToast } from "@/components/providers/ToastProvider";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { compressImage } from "@/lib/imageCompression";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

type SortableImageGridProps = {
  images: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  max?: number;
  upload?: (file: File) => Promise<{ url: string }>;
  onUploadingChange?: (uploading: boolean) => void;
};

function SortableImageItem({
  image,
  index,
  label,
  onRemove,
}: {
  image: string;
  index: number;
  label: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative block h-28 w-28 shrink-0",
        isDragging && "z-10 opacity-80"
      )}>
      <PreviewableImage
        src={image}
        alt={`${label} ${index + 1}`}
        fill
        className={cn(
          "rounded-lg transition",
          isDragging ? "ring-2 ring-[var(--color-text-secondary)]" : "hover:ring-2 hover:ring-[var(--color-text-secondary)]/30"
        )}
      />
      {index === 0 ? (
        <span className="pointer-events-none absolute bottom-1 left-1 z-[1] rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-medium text-white">
          Chính
        </span>
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-lg bg-black/0 transition-colors group-hover:bg-black/10">
        <div
          {...attributes}
          {...listeners}
          className="flex h-7 w-7 cursor-grab items-center justify-center rounded-full bg-white/80 text-[var(--color-text-inverse)] opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100 active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </div>
      </div>
      <Button
        type="button"
        variant="danger"
        size="sm"
        className="absolute right-1 top-1 z-[1] h-7 w-7 rounded-full p-0 opacity-0 shadow transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Xóa ảnh">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function SortableImageGrid({
  images,
  onChange,
  label = "Ảnh",
  max = 5,
  upload,
  onUploadingChange,
}: SortableImageGridProps) {
  const toast = useToast();
  const isMobile = useIsMobile();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);

  const remaining = Math.max(0, max - images.length);
  const canAdd = remaining > 0;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length || !upload) return;

    const maxBytes = 20 * 1024 * 1024;
    const oversized = files.find((file) => file.size > maxBytes);
    if (oversized) {
      toast.warning("Mỗi ảnh tối đa 20MB");
      event.target.value = "";
      return;
    }

    const selected = files.slice(0, remaining);
    if (!selected.length) {
      toast.warning(`Chỉ thêm được ${remaining} ảnh nữa (tối đa ${max})`);
    }

    setUploading(true);
    onUploadingChange?.(true);

    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const compressed = await compressImage(file);
        const result = await upload(compressed);
        uploaded.push(result.url);
      }
      const next = [...images, ...uploaded].slice(0, max);
      onChange(next);
      toast.success(
        uploaded.length > 1
          ? `Đã tải ${uploaded.length} ảnh lên`
          : "Đã tải ảnh lên"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tải ảnh thất bại");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      event.target.value = "";
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
    window.setTimeout(() => cameraInputRef.current?.click(), 180);
  }

  function pickFromGallery() {
    setSourcePickerOpen(false);
    window.setTimeout(() => galleryInputRef.current?.click(), 180);
  }

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.indexOf(active.id as string);
    const newIndex = images.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(images, oldIndex, newIndex);
    onChange(next);
  }

  const ids = images;

  if (!ids.length && !canAdd) return null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          <div className="flex w-full min-w-0 flex-nowrap gap-3 overflow-x-auto overscroll-x-contain pb-2 pt-1 [-webkit-overflow-scrolling:touch]">
            {images.map((image, index) => (
              <SortableImageItem
                key={image}
                image={image}
                index={index}
                label={label}
                onRemove={() => {
                  const next = images.filter((_, i) => i !== index);
                  onChange(next);
                }}
              />
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
        </SortableContext>
      </DndContext>

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        multiple={remaining > 1}
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
    </>
  );
}
