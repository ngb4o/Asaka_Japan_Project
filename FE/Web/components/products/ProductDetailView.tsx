import Link from "next/link";
import { FlaskConical, Phone, Tag } from "lucide-react";
import { BackLink } from "@/components/detail/BackLink";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { formatProductDetailMarkdown } from "@/lib/markdown";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { DealerRegisterButton } from "@/components/dealer/DealerRegisterButton";
import { Button } from "@/components/ui/button";
import type { ApiProduct } from "@/lib/api/products";
import { getProductImages } from "@/lib/api/products";
import { COMPANY } from "@/lib/constants";

type ProductDetailViewProps = {
  product: ApiProduct;
};

type SpecItem = {
  label: string;
  value: string;
  icon: typeof FlaskConical;
};

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const images = getProductImages(product);

  const specs: SpecItem[] = [
    product.activeIngredient
      ? { label: "Hoạt chất", value: product.activeIngredient, icon: FlaskConical }
      : null,
    product.sku
      ? { label: "Mã SKU", value: product.sku, icon: Tag }
      : null,
  ].filter((item): item is SpecItem => item !== null);

  return (
    <main className="min-h-screen bg-[var(--color-surface-muted)] pt-24 pb-16 md:pt-28">
      <div className="container-wide px-[var(--space-6)]">
        <BackLink href="/products" label="sản phẩm" />

        <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="relative min-h-[20rem] border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] lg:min-h-full lg:border-b-0 lg:border-r">
              <ProductImageGallery
                images={images}
                alt={product.name}
                fit="contain"
                fill
              />
            </div>

            <div className="flex flex-col p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[length:var(--text-xs)] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
                  Sản phẩm
                </span>
                {product.categoryName ? (
                  <>
                    <span
                      className="text-[var(--color-text-inverse)]/40"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span className="inline-flex rounded-full bg-[var(--color-text-secondary)]/10 px-3 py-1 text-[length:var(--text-xs)] font-semibold text-[var(--color-text-secondary)]">
                      {product.categoryName}
                    </span>
                  </>
                ) : null}
              </div>

              <h1 className="mt-4 text-headline font-semibold text-[var(--color-text-primary)]">
                {product.name}
              </h1>

              {product.shortDescription ? (
                <p className="mt-4 max-w-xl text-[length:var(--text-md)] font-normal leading-relaxed text-[var(--color-text-inverse)]">
                  {product.shortDescription}
                </p>
              ) : null}

              {specs.length > 0 ? (
                <dl className="mt-8 grid gap-3 sm:grid-cols-2">
                  {specs.map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-4"
                    >
                      <dt className="flex items-center gap-2 text-[length:var(--text-xs)] font-semibold uppercase tracking-wide text-[var(--color-text-inverse)]">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        {label}
                      </dt>
                      <dd className="mt-3 text-[length:var(--text-sm)] font-normal leading-relaxed text-[var(--color-text-primary)] sm:text-[length:var(--text-md)]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <div className="mt-8 border-t border-[var(--color-border-subtle)] pt-8">
                <p className="text-[length:var(--text-sm)] font-normal text-[var(--color-text-inverse)]">
                  Cần tư vấn sử dụng hoặc báo giá? Đội ngũ ASAKA JAPAN sẵn sàng hỗ trợ.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 px-6 text-[length:var(--text-sm)] bg-[var(--color-text-secondary)] text-white hover:bg-[#016502] sm:h-12"
                  >
                    <Link href="/#contact">Liên hệ tư vấn</Link>
                  </Button>
                  <DealerRegisterButton
                    variant="outline"
                    size="lg"
                    className="h-11 px-6 text-[length:var(--text-sm)] sm:h-12"
                  >
                    Trở thành đại lý
                  </DealerRegisterButton>
                  <Button
                    asChild
                    variant="ghost"
                    size="lg"
                    className="h-11 px-6 text-[length:var(--text-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-text-secondary)]/10 hover:text-[#016502] sm:h-12"
                  >
                    <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>
                      <Phone className="mr-2 h-4 w-4" aria-hidden="true" />
                      {COMPANY.phone}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </article>

        {product.description?.trim() ? (
          <section className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
            <div className="border-b border-[var(--color-border-subtle)] px-6 py-5 sm:px-8">
              <h2 className="flex items-center gap-3 text-[length:var(--text-xl)] font-semibold text-[var(--color-text-primary)] sm:text-[length:var(--text-2xl)]">
                <span
                  className="h-6 w-1 rounded-full bg-[var(--color-text-secondary)]"
                  aria-hidden="true"
                />
                Mô tả chi tiết
              </h2>
            </div>
            <div className="px-6 py-6 text-sm text-[var(--color-text-primary)] sm:px-8 sm:py-8">
              <MarkdownContent
                content={formatProductDetailMarkdown(product.description)}
                className="space-y-2 text-sm text-[var(--color-text-primary)]"
              />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
