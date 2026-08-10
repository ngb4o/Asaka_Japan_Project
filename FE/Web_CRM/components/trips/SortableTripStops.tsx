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
  /** Hiện nút Thu trên điểm dừng (thường purpose=collection hoặc còn đơn nợ) */
  canCollect?: boolean;
  collectableStopIds?: Set<string> | string[];
  onCollect?: (stop: TripStop) => void;
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
  canCollect,
  onCollect,
}: {
  stop: TripStop;
  canRemove: boolean;
  removing: boolean;
  disabled: boolean;
  onRemove: (stopId: string) => void;
  canCollect?: boolean;
  onCollect?: (stop: TripStop) => void;
}) {
  return (
    <div
      className="flex shrink-0 items-start gap-2"
      // Chặn sensor kéo khi bấm Maps / Thu / Xóa (mobile + desktop)
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}>
      {canCollect && onCollect ? (
        <Button
          type="button"
          size="sm"
          className="h-8 px-2.5 text-xs"
          disabled={disabled}
          onClick={() => onCollect(stop)}>
          Thu
        </Button>
      ) : null}
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
  canCollect,
  onCollect,
}: {
  stop: TripStop;
  index: number;
  purposeLabel: Record<string, string>;
  removing: boolean;
  disabled: boolean;
  onRemove: (stopId: string) => void;
  canCollect?: boolean;
  onCollect?: (stop: TripStop) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 py-3",
        isDragging && "z-10 opacity-90 shadow-md"
      )}
      {...attributes}
      {...listeners}>
      <StopContent stop={stop} index={index} purposeLabel={purposeLabel} />
      <StopActions
        stop={stop}
        canRemove
        removing={removing}
        disabled={disabled}
        onRemove={onRemove}
        canCollect={canCollect}
        onCollect={onCollect}
      />
    </div>
  );
}

function StaticStopRow({
  stop,
  index,
  purposeLabel,
  canCollect,
  onCollect,
}: {
  stop: TripStop;
  index: number;
  purposeLabel: Record<string, string>;
  canCollect?: boolean;
  onCollect?: (stop: TripStop) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 py-3">
      <StopContent stop={stop} index={index} purposeLabel={purposeLabel} />
      <StopActions
        stop={stop}
        canRemove={false}
        removing={false}
        disabled={false}
        onRemove={() => {}}
        canCollect={canCollect}
        onCollect={onCollect}
      />
    </div>
  );
}

export function SortableTripStops({
  stops,
  canReorder,
  purposeLabel,
  removingStopId,
  reordering,
  onReorder,
  onRemove,
  canCollect = false,
  collectableStopIds,
  onCollect,
}: SortableTripStopsProps) {
  const [items, setItems] = useState(stops);

  useEffect(() => {
    setItems(stops);
  }, [stops]);

  const collectSet = useMemo(() => {
    if (!collectableStopIds) return null;
    return collectableStopIds instanceof Set
      ? collectableStopIds
      : new Set(collectableStopIds);
  }, [collectableStopIds]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
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

  function stopCanCollect(stop: TripStop) {
    if (!canCollect || !onCollect) return false;
    if (collectSet) return collectSet.has(stop.id);
    return stop.purpose === "collection";
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
            canCollect={stopCanCollect(stop)}
            onCollect={onCollect}
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
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((stop, index) => (
            <SortableStopRow
              key={stop.id}
              stop={stop}
              index={index}
              purposeLabel={purposeLabel}
              removing={removingStopId === stop.id}
              disabled={Boolean(reordering)}
              onRemove={onRemove}
              canCollect={stopCanCollect(stop)}
              onCollect={onCollect}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
