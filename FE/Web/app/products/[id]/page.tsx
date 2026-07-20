import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailView } from "@/components/products/ProductDetailView";
import { getProductById } from "@/lib/api/products";

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

  return <ProductDetailView product={product} />;
}
