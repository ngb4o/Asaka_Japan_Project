"use client";

import { useEffect, useMemo, useState } from "react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, Trash2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import type { TripStop } from "@/lib/types";
import { formatDateDisplay, cn } from "@/lib/utils";

type SortableTripStopsProps = {
  stops: TripStop[];
  canReorder: boolean;
  purposeLabel: Record<string, string>;
  removingStopId?: string | null;
  reordering?: boolean;
  onReorder: (stopIds: string[]) => void | Promise<void>;
  onRemove: (stopId: string) => void;
};

function StopContent({
  stop,
  index,
  purposeLabel,
}: {
  stop: TripStop;
  index: number;
  purposeLabel: Record<string, string>;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="font-medium">
        <span className="mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-700 px-1.5 text-[11px] font-bold text-white">
          {stop.seq || index + 1}
        </span>
        {formatDateDisplay(stop.date)} - {purposeLabel[stop.purpose] || stop.purpose}
      </p>
      <p className="text-[var(--color-text-inverse)]">
        {stop.dealerName || stop.location || "—"}
      </p>
      {stop.note ? <p className="mt-1 text-xs">{stop.note}</p> : null}
      {typeof stop.lat === "number" && typeof stop.lng === "number" ? (
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          GPS: {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
        </p>
      ) : null}
    </div>
  );
}

function StopActions({
  stop,
  canRemove,
  removing,
  disabled,
  onRemove,
}: {
  stop: TripStop;
  canRemove: boolean;
  removing: boolean;
  disabled: boolean;
  onRemove: (stopId: string) => void;
}) {
  return (
    <div
      className="flex shrink-0 items-start gap-2"
      // Chặn sensor kéo khi bấm Maps / Xóa (mobile + desktop)
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}>
      {typeof stop.lat === "number" && typeof stop.lng === "number" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 px-2 text-xs"
          onClick={() => {
            window.open(
              `https://www.google.com/maps?q=${stop.lat},${stop.lng}`,
              "_blank",
              "noopener,noreferrer"
            );
          }}>
          <ExternalLink className="h-3.5 w-3.5" />
          Maps
        </Button>
      ) : null}
      {canRemove ? (
        <Button
          variant="danger"
          size="sm"
          loading={removing}
          disabled={disabled}
          onClick={() => onRemove(stop.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

function SortableStopRow({
  stop,
  index,
  purposeLabel,
  removing,
  disabled,
  onRemove,
}: {
  stop: TripStop;
  index: number;
  purposeLabel: Record<string, string>;
  removing: boolean;
  disabled: boolean;
  onRemove: (stopId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stop.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        // Quan trọng trên mobile: tránh browser chiếm gesture để scroll
        touchAction: disabled ? undefined : "none",
      }}
      className={cn(
        "flex cursor-grab items-start justify-between gap-3 rounded-lg border border-[var(--color-border-subtle)] p-3 text-sm select-none active:cursor-grabbing",
        isDragging &&
          "z-10 border-teal-600 bg-[var(--color-surface)] shadow-md opacity-95",
        disabled && !isDragging && "cursor-default opacity-70"
      )}
      aria-label="Giữ và kéo để đổi thứ tự"
      {...attributes}
      {...listeners}>
      <StopContent stop={stop} index={index} purposeLabel={purposeLabel} />
      <StopActions
        stop={stop}
        canRemove
        removing={removing}
        disabled={disabled}
        onRemove={onRemove}
      />
    </div>
  );
}

function StaticStopRow({
  stop,
  index,
  purposeLabel,
}: {
  stop: TripStop;
  index: number;
  purposeLabel: Record<string, string>;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-border-subtle)] p-3 text-sm">
      <StopContent stop={stop} index={index} purposeLabel={purposeLabel} />
      <StopActions
        stop={stop}
        canRemove={false}
        removing={false}
        disabled={false}
        onRemove={() => {}}
      />
    </div>
  );
}

export function SortableTripStops({
  stops,
  canReorder,
  purposeLabel,
  removingStopId = null,
  reordering = false,
  onReorder,
  onRemove,
}: SortableTripStopsProps) {
  const [items, setItems] = useState(stops);

  useEffect(() => {
    setItems(stops);
  }, [stops]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    // TouchSensor riêng — PointerSensor thường fail trên iOS/Android scroll parent
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const ids = useMemo(() => items.map((s) => s.id), [items]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex).map((stop, i) => ({
      ...stop,
      seq: i + 1,
    }));
    setItems(next);
    await onReorder(next.map((s) => s.id));
  }

  if (!items.length) return null;

  if (!canReorder) {
    return (
      <div className="space-y-3">
        {items.map((stop, index) => (
          <StaticStopRow
            key={stop.id}
            stop={stop}
            index={index}
            purposeLabel={purposeLabel}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        {items.length > 1 ? (
          <p className="text-xs text-[var(--color-text-inverse)]">
            Giữ điểm dừng ~0,2s rồi kéo để đổi thứ tự
          </p>
        ) : null}
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((stop, index) => (
              <SortableStopRow
                key={stop.id}
                stop={stop}
                index={index}
                purposeLabel={purposeLabel}
                removing={removingStopId === stop.id}
                disabled={reordering}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </DndContext>
  );
}
