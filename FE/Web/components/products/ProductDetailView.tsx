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
    <main className="min-h-screen bg-[var(--color-surface-elevated)] pt-16 pb-16 md:pt-24 lg:pt-28">
      <div className="container-wide px-[var(--space-6)]">
        <BackLink href="/products" label="sản phẩm" />

        <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="relative aspect-[4/5] w-full border-b border-[var(--color-border-subtle)] bg-white sm:aspect-auto sm:min-h-[22rem] lg:min-h-full lg:border-b-0 lg:border-r">
              <ProductImageGallery
                images={images}
                alt={product.name}
                fit="contain"
                fill
              />
            </div>

            <div className="flex flex-col p-5 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[length:var(--text-sm)] font-semibold uppercase tracking-widest text-[var(--color-text-secondary)]">
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
                    <span className="inline-flex rounded-full bg-[var(--color-text-secondary)]/10 px-3 py-1 text-[length:var(--text-sm)] font-semibold text-[var(--color-text-secondary)]">
                      {product.categoryName}
                    </span>
                  </>
                ) : null}
              </div>

              <h1 className="mt-3 text-[length:var(--text-2xl)] font-semibold leading-tight text-[var(--color-text-primary)] sm:mt-4 sm:text-headline">
                {product.name}
              </h1>

              {product.shortDescription ? (
                <p className="mt-4 max-w-xl text-[length:var(--text-lg)] font-normal leading-relaxed text-[var(--color-text-inverse)] sm:text-[length:var(--text-xl)]">
                  {product.shortDescription}
                </p>
              ) : null}

              {specs.length > 0 ? (
                <dl className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2">
                  {specs.map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-[var(--color-border-subtle)] bg-white p-4 sm:p-5"
                    >
                      <dt className="flex items-center gap-2 text-[length:var(--text-sm)] font-semibold uppercase tracking-wide text-[var(--color-text-inverse)]">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        {label}
                      </dt>
                      <dd className="mt-3 text-[length:var(--text-md)] font-normal leading-relaxed text-[var(--color-text-primary)] sm:text-[length:var(--text-lg)]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <div className="mt-6 border-t border-[var(--color-border-subtle)] pt-6 sm:mt-8 sm:pt-8">
                <p className="text-[length:var(--text-md)] font-normal text-[var(--color-text-inverse)]">
                  Cần tư vấn sử dụng hoặc báo giá? Đội ngũ ASAKA JAPAN sẵn sàng hỗ trợ.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 px-6 text-[length:var(--text-md)] bg-[var(--color-text-secondary)] text-white hover:bg-[#016502] sm:h-12"
                  >
                    <Link href="/#contact">Liên hệ tư vấn</Link>
                  </Button>
                  <DealerRegisterButton
                    variant="outline"
                    size="lg"
                    className="h-12 px-6 text-[length:var(--text-md)] sm:h-12"
                  >
                    Trở thành đại lý
                  </DealerRegisterButton>
                  <Button
                    asChild
                    variant="ghost"
                    size="lg"
                    className="h-12 px-6 text-[length:var(--text-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-text-secondary)]/10 hover:text-[#016502] sm:h-12"
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
          <section className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)] sm:mt-8">
            <div className="border-b border-[var(--color-border-subtle)] px-5 py-4 sm:px-8 sm:py-5">
              <h2 className="flex items-center gap-3 text-[length:var(--text-xl)] font-semibold text-[var(--color-text-primary)] sm:text-[length:var(--text-2xl)]">
                <span
                  className="h-6 w-1 rounded-full bg-[var(--color-text-secondary)]"
                  aria-hidden="true"
                />
                Mô tả chi tiết
              </h2>
            </div>
            <div className="px-5 py-5 text-[length:var(--text-md)] text-[var(--color-text-primary)] sm:px-8 sm:py-8">
              <MarkdownContent
                content={formatProductDetailMarkdown(product.description)}
                className="space-y-3 text-[length:var(--text-md)] leading-relaxed text-[var(--color-text-primary)] sm:text-[length:var(--text-lg)]"
              />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
