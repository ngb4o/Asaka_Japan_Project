"use client";

import { useRef, useState, type ComponentType } from "react";
import {
  Bold,
  CornerDownLeft,
  Eye,
  FileText,
  Heading2,
  Heading3,
  List,
  Wand2,
} from "@/components/ui/icons";
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
  normalizePreview?: (value: string) => string;
};

type ToolbarAction = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  run: () => void;
};

function clampMarkdown(next: string, maxLength: number) {
  return next.length > maxLength ? next.slice(0, maxLength) : next;
}

function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string,
  maxLength: number
) {
  const selected = value.slice(start, end);
  const inner = selected || placeholder;
  const insertion = `${before}${inner}${after}`;
  const next = clampMarkdown(
    value.slice(0, start) + insertion + value.slice(end),
    maxLength
  );
  const cursorStart = start + before.length;
  const cursorEnd = Math.min(cursorStart + inner.length, next.length);
  return { next, cursorStart, cursorEnd };
}

function prefixSelectedLines(
  value: string,
  start: number,
  end: number,
  prefix: string,
  maxLength: number
) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEndIndex = value.indexOf("\n", end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const rewritten = lines
    .map((line) => {
      const trimmed = line.trimStart();
      if (!trimmed) return line;
      if (trimmed.startsWith(prefix)) return line;
      // Replace existing heading prefix when applying another heading
      if (prefix.startsWith("#")) {
        const withoutHeading = trimmed.replace(/^#{1,3}\s+/, "");
        return `${prefix}${withoutHeading}`;
      }
      return `${prefix}${trimmed}`;
    })
    .join("\n");
  const next = clampMarkdown(
    value.slice(0, lineStart) + rewritten + value.slice(lineEnd),
    maxLength
  );
  return {
    next,
    cursorStart: lineStart,
    cursorEnd: Math.min(lineStart + rewritten.length, next.length),
  };
}

function insertParagraphBreak(
  value: string,
  start: number,
  end: number,
  maxLength: number
) {
  const insertion = "\n\n";
  const next = clampMarkdown(
    value.slice(0, start) + insertion + value.slice(end),
    maxLength
  );
  const cursor = Math.min(start + insertion.length, next.length);
  return { next, cursorStart: cursor, cursorEnd: cursor };
}

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
  normalizePreview,
}: MarkdownContentFieldProps) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  function applyEdit(
    result: { next: string; cursorStart: number; cursorEnd: number }
  ) {
    onChange(result.next);
    setTab("edit");
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(result.cursorStart, result.cursorEnd);
    });
  }

  function withSelection(
    transform: (
      start: number,
      end: number
    ) => { next: string; cursorStart: number; cursorEnd: number }
  ) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    applyEdit(transform(start, end));
  }

  const toolbarActions: ToolbarAction[] = [
    {
      key: "bold",
      label: "Đậm",
      icon: Bold,
      run: () =>
        withSelection((start, end) =>
          wrapSelection(value, start, end, "**", "**", "chữ đậm", maxLength)
        ),
    },
    {
      key: "h2",
      label: "Tiêu đề",
      icon: Heading2,
      run: () =>
        withSelection((start, end) =>
          prefixSelectedLines(value, start, end, "## ", maxLength)
        ),
    },
    {
      key: "h3",
      label: "Phụ đề",
      icon: Heading3,
      run: () =>
        withSelection((start, end) =>
          prefixSelectedLines(value, start, end, "### ", maxLength)
        ),
    },
    {
      key: "list",
      label: "Danh sách",
      icon: List,
      run: () =>
        withSelection((start, end) =>
          prefixSelectedLines(value, start, end, "- ", maxLength)
        ),
    },
    {
      key: "break",
      label: "Xuống đoạn",
      icon: CornerDownLeft,
      run: () =>
        withSelection((start, end) =>
          insertParagraphBreak(value, start, end, maxLength)
        ),
    },
  ];

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

      <div className="overflow-hidden rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-sm">
        {tab === "edit" ? (
          <>
            <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-2 py-1.5">
              {toolbarActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.key}
                    type="button"
                    title={action.label}
                    aria-label={action.label}
                    onClick={action.run}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-elevated)]"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">{action.label}</span>
                  </button>
                );
              })}
            </div>
            <Textarea
              ref={textareaRef}
              id={id}
              value={value}
              onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
              className="min-h-[320px] resize-y rounded-none border-0 bg-transparent font-mono text-[14px] leading-relaxed shadow-none focus-visible:ring-0"
              placeholder={placeholder}
            />
          </>
        ) : (
          <div className="min-h-[320px] bg-[var(--color-surface-muted)]/40 px-4 py-3 text-sm text-[var(--color-text-primary)]">
            {value.trim() ? (
              <div className="space-y-2">
                {renderMarkdownContent(
                  normalizePreview ? normalizePreview(value) : value
                )}
              </div>
            ) : (
              <p className="text-[var(--color-text-inverse)]">
                Chưa có nội dung để xem trước
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-[var(--color-text-inverse)]">
        <p>
          Dùng thanh công cụ hoặc Markdown:{" "}
          <code className="rounded bg-[var(--color-surface-muted)] px-1">## Tiêu đề</code>,{" "}
          <code className="rounded bg-[var(--color-surface-muted)] px-1">**đậm**</code>,{" "}
          <code className="rounded bg-[var(--color-surface-muted)] px-1">- danh sách</code>.
        </p>
        <span className={cn(nearLimit && "font-semibold text-amber-600")}>
          {length.toLocaleString("vi-VN")}/{maxLength.toLocaleString("vi-VN")}
        </span>
      </div>
    </div>
  );
}
