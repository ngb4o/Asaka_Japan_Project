import { createElement, type ReactNode } from "react";

const FIELD_LABELS = new Set(
  [
    "Tên sản phẩm",
    "Thể tích thực",
    "Đặc trị",
    "Tính năng nổi bật",
    "Công dụng",
    "Liều lượng",
    "Cách pha",
    "Lượng nước",
    "Thời điểm phun",
    "Thời gian cách ly",
    "Cảnh báo",
    "An toàn chung",
    "Sơ cứu",
    "Nhà sản xuất",
    "Đăng ký",
    "Gia công, đóng gói",
    "Đơn vị phân phối",
    "SĐK",
    "Hạn sử dụng",
    "Phụ gia",
    "Phụ gia & dung môi",
    "Hoạt chất",
  ].map((item) => item.toLowerCase())
);

function isPlaceholderValue(value: string) {
  const text = value.replace(/[.\s]+$/g, "").trim().toLowerCase();
  return /thông tin không|không nêu cụ thể|không hiển thị|không ghi cụ thể/.test(
    text
  );
}

function cleanValue(value: string) {
  const text = value.replace(/[.\s]+$/g, "").trim();
  if (!text || isPlaceholderValue(text)) return "—";
  return text;
}

function splitItems(value: string) {
  if (!value.includes(";")) return [value];
  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isSectionTitle(line: string) {
  if (/^#{1,3}\s+/.test(line)) return true;
  return /^\d+\.\s+[^:]{2,80}$/.test(line);
}

function parseLabelLine(line: string) {
  const match = line.match(/^([^:\n]{1,80}):\s*(.*)$/);
  if (!match) return null;
  if (/^https?:/i.test(line) || line.startsWith("**")) return null;
  return { label: match[1].trim(), value: match[2].trim() };
}

/** Chuẩn hóa mô tả sản phẩm OCR/plain-text thành Markdown dễ đọc. */
export function formatProductDetailMarkdown(raw: string) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inComposition = false;
  let pendingGroup: string | null = null;

  const flushGroup = () => {
    pendingGroup = null;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }

    if (
      trimmed.startsWith("## ") ||
      trimmed.startsWith("# ") ||
      trimmed.startsWith("### ") ||
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      trimmed.startsWith("**")
    ) {
      flushGroup();
      out.push(trimmed);
      continue;
    }

    const headingText = trimmed.replace(/^#{1,3}\s+/, "");
    if (isSectionTitle(trimmed)) {
      flushGroup();
      inComposition = /thành phần/i.test(headingText);
      const title = headingText.replace(/^\d+\.\s+/, (m) => m);
      out.push(`## ${title}`);
      out.push("");
      continue;
    }

    if (inComposition && trimmed.includes(";")) {
      splitItems(trimmed).forEach((item) => {
        const nested = parseLabelLine(item);
        out.push(
          nested
            ? `- **${nested.label}:** ${cleanValue(nested.value)}`
            : `- ${cleanValue(item)}`
        );
      });
      continue;
    }

    const parsed = parseLabelLine(trimmed);
    if (parsed) {
      const { label } = parsed;
      let value = cleanValue(parsed.value);
      const known = FIELD_LABELS.has(label.toLowerCase());
      const items = value === "—" ? [] : splitItems(parsed.value).map(cleanValue);

      if (!parsed.value && known) {
        pendingGroup = label;
        out.push(`**${label}:**`);
        continue;
      }

      if (pendingGroup && !known) {
        out.push(`- **${label}:** ${value}`);
        continue;
      }

      flushGroup();

      if (inComposition || /thành phần/i.test(label)) {
        if (items.length > 1) {
          items.forEach((item) => {
            const nested = parseLabelLine(item);
            out.push(
              nested
                ? `- **${nested.label}:** ${cleanValue(nested.value)}`
                : `- ${item}`
            );
          });
        } else {
          out.push(`- **${label}:** ${value}`);
        }
        continue;
      }

      if (items.length > 1 && (known || /đặc trị|liều lượng|cách pha/i.test(label))) {
        out.push(`**${label}:**`);
        items.forEach((item) => out.push(`- ${item}`));
        continue;
      }

      out.push(`**${label}:** ${value}`);
      continue;
    }

    if (pendingGroup || inComposition) {
      const items = splitItems(trimmed).map(cleanValue);
      items.forEach((item) => {
        const nested = parseLabelLine(item);
        out.push(
          nested
            ? `- **${nested.label}:** ${cleanValue(nested.value)}`
            : `- ${item}`
        );
      });
      continue;
    }

    flushGroup();
    out.push(trimmed);
  }

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*)/g;
  const parts = text.split(pattern);

  parts.forEach((part, index) => {
    if (!part) return;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      nodes.push(
        createElement(
          "strong",
          { key: `b-${index}`, className: "font-medium" },
          part.slice(2, -2)
        )
      );
      return;
    }
    nodes.push(part);
  });

  return nodes;
}

export function renderMarkdownContent(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let listItems: string[] = [];
  let paragraph: string[] = [];
  let key = 0;

  function flushParagraph() {
    if (!paragraph.length) return;
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (!text) return;
    nodes.push(
      createElement(
        "p",
        { key: `p-${key++}`, className: "leading-relaxed" },
        ...renderInline(text)
      )
    );
  }

  function flushList() {
    if (!listItems.length) return;
    nodes.push(
      createElement(
        "ul",
        {
          key: `ul-${key++}`,
          className: "list-disc space-y-1 pl-5 leading-relaxed",
        },
        listItems.map((item, index) =>
          createElement("li", { key: `li-${index}` }, ...renderInline(item))
        )
      )
    );
    listItems = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      flushParagraph();
      const level = heading[1].length;
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      const className =
        level === 1
          ? "mt-4 text-lg font-semibold text-[var(--color-text-primary)] first:mt-0"
          : level === 2
            ? "mt-3 text-base font-semibold text-[var(--color-text-primary)]"
            : "mt-2 text-sm font-semibold text-[var(--color-text-primary)]";
      nodes.push(
        createElement(Tag, { key: `h-${key++}`, className }, ...renderInline(heading[2]))
      );
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
      continue;
    }

    const defMatch = trimmed.match(/^\*\*(.+?):\*\*\s*(.*)$/);
    if (defMatch) {
      flushList();
      flushParagraph();
      nodes.push(
        createElement(
          "div",
          {
            key: `def-${key++}`,
            className:
              "grid gap-1 border-b border-[var(--color-border-subtle)] py-2 last:border-b-0 sm:grid-cols-[minmax(8rem,11rem)_minmax(0,1fr)] sm:gap-4",
          },
          createElement(
            "div",
            {
              className:
                "text-xs font-semibold text-[var(--color-text-primary)]",
            },
            defMatch[1]
          ),
          createElement(
            "div",
            { className: "leading-relaxed" },
            ...(defMatch[2] ? renderInline(defMatch[2]) : ["—"])
          )
        )
      );
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushList();
  flushParagraph();

  return nodes;
}
