import { createElement, type ReactNode } from "react";

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
          ? "mt-6 text-xl font-medium text-[var(--color-text-primary)] first:mt-0 sm:text-2xl"
          : level === 2
            ? "mt-5 text-lg font-medium text-[var(--color-text-primary)] sm:text-xl"
            : "mt-4 text-base font-medium text-[var(--color-text-primary)]";
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

    flushList();
    paragraph.push(trimmed);
  }

  flushList();
  flushParagraph();

  return nodes;
}
