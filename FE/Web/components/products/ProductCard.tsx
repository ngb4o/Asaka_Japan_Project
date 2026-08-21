import Image from "next/image";
import Link from "next/link";
import type { FeaturedProductCard } from "@/lib/api/products";

type ProductCardProps = {
  product: FeaturedProductCard;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)] transition-all duration-[400ms] hover:border-[var(--color-text-secondary)]/25 hover:shadow-[var(--shadow-elevated)]"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--color-surface-muted)] sm:aspect-[4/5]">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.alt}
            fill
            className="object-cover transition-transform duration-[600ms] group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized={
              product.image.startsWith("http") || product.image.includes("localhost")
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-inverse)]">
            Chưa có ảnh
          </div>
        )}
        <div className="absolute left-4 top-4">
          <span className="inline-flex rounded-full bg-[var(--color-text-secondary)] px-3 py-1.5 text-[length:var(--text-xs)] font-semibold text-white">
            {product.category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <h3 className="line-clamp-2 text-[length:var(--text-lg)] font-semibold leading-tight text-[var(--color-text-primary)] sm:text-[length:var(--text-xl)]">
          {product.name}
        </h3>
        <p className="line-clamp-2 text-[length:var(--text-sm)] font-normal leading-relaxed text-[var(--color-text-inverse)] sm:text-[length:var(--text-md)]">
          {product.benefit}
        </p>
      </div>
    </Link>
  );
}
