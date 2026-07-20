import type { Metadata } from "next";
import { ProductsPageContent } from "@/components/products/ProductsPageContent";

export const metadata: Metadata = {
  title: "Sản phẩm",
  description:
    "Danh mục sản phẩm bảo vệ thực vật ASAKA JAPAN — tìm kiếm và lọc theo loại sản phẩm.",
};

export default function ProductsPage() {
  return <ProductsPageContent />;
}
