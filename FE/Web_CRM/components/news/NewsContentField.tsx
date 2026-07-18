"use client";

import { MarkdownContentField } from "@/components/ui/markdown-content-field";
import {
  NEWS_CONTENT_MAX,
  NEWS_CONTENT_TEMPLATE,
} from "@/lib/productDescription";

type NewsContentFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function NewsContentField({ value, onChange }: NewsContentFieldProps) {
  return (
    <MarkdownContentField
      id="content"
      label="Nội dung tin tức (hiển thị trên web) *"
      value={value}
      onChange={onChange}
      maxLength={NEWS_CONTENT_MAX}
      placeholder="Nhập nội dung tin tức theo Markdown..."
      template={NEWS_CONTENT_TEMPLATE}
      templateConfirmMessage="Thay nội dung hiện tại bằng mẫu tin tức?"
    />
  );
}
