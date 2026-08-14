"use client";

import { MarkdownContentField } from "@/components/ui/markdown-content-field";
import {
  formatProductDetailMarkdown,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_DESCRIPTION_TEMPLATE,
} from "@/lib/productDescription";

type ProductDescriptionFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ProductDescriptionField({
  value,
  onChange,
}: ProductDescriptionFieldProps) {
  return (
    <MarkdownContentField
      id="description"
      label="Mô tả chi tiết (trang chi tiết sản phẩm)"
      value={value}
      onChange={onChange}
      maxLength={PRODUCT_DESCRIPTION_MAX}
      placeholder="Nhập mô tả chi tiết sản phẩm theo Markdown..."
      template={PRODUCT_DESCRIPTION_TEMPLATE}
      templateConfirmMessage="Thay nội dung hiện tại bằng mẫu mô tả sản phẩm?"
      normalizePreview={formatProductDetailMarkdown}
      className="md:col-span-2"
    />
  );
}
