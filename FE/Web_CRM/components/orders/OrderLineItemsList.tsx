"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import {
  MobileMediaCard,
  MobileMetaChip,
} from "@/components/ui/mobile-record-card";
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
      )}
    >
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

/** Mobile: product cards with image. Desktop: table with thumbnail. */
export function OrderLineItemsList({ items }: { items: LineItem[] }) {
  const isMobile = useIsMobile();

  if (!items.length) {
    return (
      <p className="text-sm text-[var(--color-text-inverse)]">Chưa có sản phẩm</p>
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
            }
          >
            <p className="mt-2 text-right text-sm font-semibold tabular-nums text-[var(--color-text-secondary)]">
              {formatCurrency(item.lineTotal)}
            </p>
          </MobileMediaCard>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border-subtle)]">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="bg-[var(--color-surface-muted)] text-[var(--color-text-inverse)]">
            <th className="px-3 py-2 font-medium">Ảnh</th>
            <th className="px-3 py-2 font-medium">Sản phẩm</th>
            <th className="px-3 py-2 font-medium text-right">SL</th>
            <th className="px-3 py-2 font-medium text-right">Đơn giá</th>
            <th className="px-3 py-2 font-medium text-right">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={`${item.productId}-${index}`}
              className="border-t border-[var(--color-border-subtle)]"
            >
              <td className="px-3 py-2">
                <ProductThumb
                  src={item.productImage}
                  alt={item.productName || "Sản phẩm"}
                  size="sm"
                />
              </td>
              <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">
                {item.productName || "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(item.unitPrice)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">
                {formatCurrency(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
