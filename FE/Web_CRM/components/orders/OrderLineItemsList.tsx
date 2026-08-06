"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import {
  MobileMediaCard,
  MobileMetaChip,
} from "@/components/ui/mobile-record-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getImageUrl } from "@/lib/api/uploads";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type { LineItem } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

function ProductThumb({
  src,
  alt,
  size = "md",
}: {
  src?: string;
  alt: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-11 w-11 rounded-lg" : "h-full w-full";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]",
        box
      )}>
      {src ? (
        <Image
          src={getImageUrl(src)}
          alt={alt}
          fill
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[var(--color-text-inverse)]">
          <ImageIcon className={size === "sm" ? "h-4 w-4" : "h-6 w-6"} />
        </div>
      )}
    </div>
  );
}

type OrderLineItemsListProps = {
  items: LineItem[];
  /** Default true — set false for compact debt dialogs */
  showImages?: boolean;
};

/** Mobile: product cards. Desktop: table. */
export function OrderLineItemsList({
  items,
  showImages = true,
}: OrderLineItemsListProps) {
  const isMobile = useIsMobile();

  if (!items.length) {
    return <EmptyState title="Chưa có sản phẩm" size="sm" />;
  }

  if (!showImages) {
    return (
      <div className="overflow-hidden rounded-xl border border-[var(--color-border-subtle)]">
        {items.map((item, index) => (
          <div
            key={`${item.productId}-${index}`}
            className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] px-3 py-2.5 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                {item.productName || "—"}
              </p>
              <p className="mt-0.5 truncate text-xs text-[var(--color-text-inverse)]">
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
              {formatCurrency(item.lineTotal)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col gap-3">
        {items.map((item, index) => (
          <MobileMediaCard
            key={`${item.productId}-${index}`}
            media={
              <ProductThumb
                src={item.productImage}
                alt={item.productName || "Sản phẩm"}
              />
            }
            title={item.productName || "—"}
            meta={
              <>
                <MobileMetaChip>SL: {item.quantity}</MobileMetaChip>
                <MobileMetaChip>
                  Đơn giá: {formatCurrency(item.unitPrice)}
                </MobileMetaChip>
              </>
            }>
            <p className="mt-2 text-right text-sm font-semibold tabular-nums text-[var(--color-text-secondary)]">
              {formatCurrency(item.lineTotal)}
            </p>
          </MobileMediaCard>
        ))}
      </div>
    );
  }

  return (
    <div className="crm-table-frame overflow-x-auto">
      <table className="crm-data-table min-w-[520px]">
        <thead>
          <tr>
            <th className="font-medium">Ảnh</th>
            <th className="font-medium">Sản phẩm</th>
            <th className="font-medium text-right">SL</th>
            <th className="font-medium text-right">Đơn giá</th>
            <th className="font-medium text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.productId}-${index}`}>
              <td>
                <ProductThumb
                  src={item.productImage}
                  alt={item.productName || "Sản phẩm"}
                  size="sm"
                />
              </td>
              <td className="font-medium text-[var(--color-text-primary)]">
                {item.productName || "—"}
              </td>
              <td className="text-right tabular-nums">{item.quantity}</td>
              <td className="text-right tabular-nums">
                {formatCurrency(item.unitPrice)}
              </td>
              <td className="text-right tabular-nums font-medium">
                {formatCurrency(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
