import { apiRequest, getImageUrl, ApiClientError } from "@/lib/api/client";

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
  price?: number;
  unit?: string;
  unitsPerCase?: number;
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
  const result = await getProducts({ page: 1, limit });
  return result.items.sort(
    (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, "vi")
  );
}

export async function getProducts(params?: {
  search?: string;
  categoryId?: string;
  pestType?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams({
    status: "active",
    page: String(params?.page ?? 1),
    limit: String(params?.limit ?? 12),
  });

  if (params?.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params?.categoryId) {
    query.set("categoryId", params.categoryId);
  }
  if (params?.pestType) {
    query.set("pestType", params.pestType);
  }

  const result = await apiRequest<PaginatedProducts>(`/products?${query.toString()}`);
  return {
    ...result,
    items: (result.items || []).map(mapProductToCard),
  };
}

export async function getProductById(id: string): Promise<ApiProduct | null> {
  try {
    const product = await apiRequest<ApiProduct>(`/products/${id}`);
    if (product.status !== "active") return null;
    return product;
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export function getProductImages(product: ApiProduct) {
  const paths = product.images?.length
    ? product.images
    : product.image
      ? [product.image]
      : [];

  return paths.map((path) => getImageUrl(path)).filter(Boolean);
}
