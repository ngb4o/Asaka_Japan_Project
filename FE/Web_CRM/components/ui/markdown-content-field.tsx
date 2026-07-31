"use client";

import { useState } from "react";
import { Eye, FileText, Wand2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { renderMarkdownContent } from "@/lib/productDescription";

type MarkdownContentFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  template?: string;
  templateConfirmMessage?: string;
  className?: string;
};

export function MarkdownContentField({
  id,
  label,
  value,
  onChange,
  maxLength,
  placeholder = "Nhập nội dung theo Markdown...",
  template,
  templateConfirmMessage = "Thay nội dung hiện tại bằng mẫu?",
  className,
}: MarkdownContentFieldProps) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const length = value.length;
  const nearLimit = length > maxLength * 0.9;

  function applyTemplate() {
    if (!template) return;
    if (value.trim() && !window.confirm(templateConfirmMessage)) {
      return;
    }
    onChange(template);
    setTab("edit");
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex flex-wrap items-center gap-2">
          {template ? (
            <Button type="button" variant="outline" size="sm" onClick={applyTemplate}>
              <Wand2 className="h-3.5 w-3.5" />
              Chèn mẫu
            </Button>
          ) : null}
          <div className="flex rounded-lg border border-[var(--color-border-subtle)] p-0.5">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                tab === "edit"
                  ? "bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]"
                  : "text-[var(--color-text-inverse)] hover:text-[var(--color-text-primary)]"
              )}
              onClick={() => setTab("edit")}
            >
              <FileText className="h-3.5 w-3.5" />
              Soạn
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                tab === "preview"
                  ? "bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]"
                  : "text-[var(--color-text-inverse)] hover:text-[var(--color-text-primary)]"
              )}
              onClick={() => setTab("preview")}
            >
              <Eye className="h-3.5 w-3.5" />
              Xem trước
            </button>
          </div>
        </div>
      </div>

      {tab === "edit" ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          className="min-h-[320px] font-mono text-[13px] leading-relaxed"
          placeholder={placeholder}
        />
      ) : (
        <div className="min-h-[320px] rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-primary)]">
          {value.trim() ? (
            <div className="space-y-2">{renderMarkdownContent(value)}</div>
          ) : (
            <p className="text-[var(--color-text-inverse)]">Chưa có nội dung để xem trước</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-[var(--color-text-inverse)]">
        <p>
          Hỗ trợ Markdown:{" "}
          <code className="rounded bg-[var(--color-surface-muted)] px-1">## Tiêu đề</code>,{" "}
          <code className="rounded bg-[var(--color-surface-muted)] px-1">**đậm**</code>,{" "}
          <code className="rounded bg-[var(--color-surface-muted)] px-1">- danh sách</code>.
          Xuống dòng để tách đoạn.
        </p>
        <span className={cn(nearLimit && "font-semibold text-amber-600")}>
          {length.toLocaleString("vi-VN")}/{maxLength.toLocaleString("vi-VN")}
        </span>
      </div>
    </div>
  );
}
