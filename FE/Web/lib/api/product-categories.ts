import { apiRequest } from "@/lib/api/client";

export type PestTypeOption = {
  value: string;
  label: string;
};

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: "active" | "inactive";
  pestTypes?: PestTypeOption[];
};

export type PaginatedCategories = {
  items: ProductCategory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function getProductCategories() {
  const query = new URLSearchParams({
    status: "active",
    page: "1",
    limit: "100",
  });

  const result = await apiRequest<PaginatedCategories>(
    `/product-categories?${query.toString()}`
  );

  return result.items.sort((a, b) => a.name.localeCompare(b.name, "vi"));
}
