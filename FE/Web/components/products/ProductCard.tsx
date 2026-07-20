import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { FeaturedProductCard } from "@/lib/api/products";

type ProductCardProps = {
  product: FeaturedProductCard;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] transition-all duration-[400ms] hover:border-[var(--color-text-secondary)]/25"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--color-surface-muted)] sm:aspect-square">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.alt}
            fill
            className="object-cover transition-transform duration-[600ms] group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized={
              product.image.startsWith("http") || product.image.includes("localhost")
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-inverse)]">
            Chưa có ảnh
          </div>
        )}
        <div className="absolute left-3 top-3">
          <span className="inline-flex rounded-full bg-[var(--color-text-secondary)] px-2.5 py-1 text-[10px] font-semibold text-white sm:text-[length:var(--text-xs)]">
            {product.category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 border-t border-[var(--color-border-subtle)] p-4">
        <h3 className="line-clamp-2 text-[length:var(--text-sm)] font-semibold leading-tight text-[var(--color-text-primary)] sm:text-[length:var(--text-lg)]">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-[length:var(--text-xs)] font-normal leading-relaxed text-[var(--color-text-inverse)] sm:text-[length:var(--text-sm)]">
          {product.benefit}
        </p>
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[length:var(--text-sm)] font-semibold text-[var(--color-text-secondary)] transition-colors group-hover:text-[#016502]">
          Xem chi tiết
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
