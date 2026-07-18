import { apiRequest, getImageUrl } from "@/lib/api/client";

export type ApiProduct = {
  id: string;
  name: string;
  sku?: string;
  categoryId: string;
  categoryName?: string;
  description?: string;
  shortDescription?: string;
  packaging?: string;
  activeIngredient?: string;
  image?: string;
  images?: string[];
  displayOrder?: number;
  status: "active" | "inactive";
};

export type PaginatedProducts = {
  items: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type FeaturedProductCard = {
  id: string;
  name: string;
  category: string;
  benefit: string;
  image: string;
  alt: string;
  displayOrder: number;
};

export function mapProductToCard(product: ApiProduct): FeaturedProductCard {
  const imagePath = product.image || product.images?.[0] || "";
  const benefit =
    product.shortDescription?.trim() ||
    product.packaging?.trim() ||
    "Giải pháp bảo vệ thực vật từ ASAKA JAPAN.";

  return {
    id: product.id,
    name: product.name,
    category: product.categoryName || "Sản phẩm",
    benefit,
    image: getImageUrl(imagePath),
    alt: product.name,
    displayOrder: product.displayOrder ?? 0,
  };
}

export async function getFeaturedProducts(limit = 12): Promise<FeaturedProductCard[]> {
  const query = new URLSearchParams({
    status: "active",
    page: "1",
    limit: String(limit),
  });

  const result = await apiRequest<PaginatedProducts>(`/products?${query.toString()}`);
  return (result.items || [])
    .map(mapProductToCard)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, "vi"));
}
