import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/detail/BackLink";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { Button } from "@/components/ui/button";
import { getProductById, getProductImages } from "@/lib/api/products";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    return { title: "Không tìm thấy sản phẩm" };
  }

  const description =
    product.shortDescription?.trim() ||
    product.packaging?.trim() ||
    `Chi tiết sản phẩm ${product.name} từ ASAKA JAPAN.`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const images = getProductImages(product);

  return (
    <main className="min-h-screen bg-[var(--color-surface-muted)] pt-24 pb-16 md:pt-28">
      <div className="container-wide px-[var(--space-6)]">
        <BackLink href="/products" label="sản phẩm" />

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductImageGallery images={images} alt={product.name} />

          <div className="flex flex-col">
            {product.categoryName ? (
              <span className="mb-3 inline-flex w-fit rounded-full bg-[var(--color-text-secondary)] px-3 py-1 text-xs font-semibold text-white">
                {product.categoryName}
              </span>
            ) : null}

            <h1 className="text-headline font-semibold text-[var(--color-text-primary)]">
              {product.name}
            </h1>

            {product.shortDescription ? (
              <p className="mt-4 text-[length:var(--text-md)] font-normal leading-relaxed text-[var(--color-text-inverse)]">
                {product.shortDescription}
              </p>
            ) : null}

            <dl className="mt-6 space-y-3 text-[length:var(--text-sm)] sm:text-[length:var(--text-md)]">
              {product.packaging ? (
                <div>
                  <dt className="font-semibold text-[var(--color-text-primary)]">
                    Quy cách
                  </dt>
                  <dd className="mt-1 text-[var(--color-text-inverse)]">
                    {product.packaging}
                  </dd>
                </div>
              ) : null}
              {product.activeIngredient ? (
                <div>
                  <dt className="font-semibold text-[var(--color-text-primary)]">
                    Hoạt chất
                  </dt>
                  <dd className="mt-1 text-[var(--color-text-inverse)]">
                    {product.activeIngredient}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="h-10 px-5 text-[length:var(--text-sm)] bg-[var(--color-text-secondary)] text-white hover:bg-[#016502] md:h-14 md:px-10 md:text-[length:var(--text-lg)]"
              >
                <Link href="/#contact">Liên hệ tư vấn</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-10 px-5 text-[length:var(--text-sm)] md:h-14 md:px-10 md:text-[length:var(--text-lg)]"
              >
                <Link href="/#dealer">Trở thành đại lý</Link>
              </Button>
            </div>
          </div>
        </div>

        {product.description?.trim() ? (
          <section className="mt-12 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-6 sm:p-8">
            <h2 className="mb-6 text-xl font-medium text-[var(--color-text-primary)] sm:text-2xl">
              Mô tả chi tiết
            </h2>
            <MarkdownContent content={product.description} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
