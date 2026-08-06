import type { ReactNode } from "react";
import {
  MobileRecordCard,
  MobileRecordCardHeader,
  MobileRecordRow,
} from "@/components/ui/mobile-record-card";

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*)/g;
  const parts = text.split(pattern);

  parts.forEach((part, index) => {
    if (!part) return;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      nodes.push(<strong key={`b-${index}`}>{part.slice(2, -2)}</strong>);
      return;
    }
    nodes.push(part);
  });

  return nodes;
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return [];
  return trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = parseTableRow(line);
  if (!cells.length) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

type Block =
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

function splitBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let tableLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", lines: [...paragraph] });
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push({ type: "list", items: [...listItems] });
    listItems = [];
  };

  const flushTable = () => {
    if (tableLines.length < 2) {
      paragraph.push(...tableLines);
      tableLines = [];
      return;
    }

    const headers = parseTableRow(tableLines[0]);
    const bodyStart = isTableSeparator(tableLines[1]) ? 2 : 1;
    const rows = tableLines
      .slice(bodyStart)
      .map(parseTableRow)
      .filter((row) => row.length > 0);

    if (headers.length >= 2 && rows.length > 0) {
      blocks.push({ type: "table", headers, rows });
    } else {
      paragraph.push(...tableLines);
    }
    tableLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushTable();
      flushList();
      flushParagraph();
      continue;
    }

    if (trimmed.startsWith("|")) {
      flushList();
      flushParagraph();
      tableLines.push(trimmed);
      continue;
    }

    flushTable();

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushTable();
  flushList();
  flushParagraph();

  return blocks;
}

function pickTitleColumn(headers: string[]): number {
  const idx = headers.findIndex((header) =>
    /^(mã|mã|code|tên|ten|name|sản phẩm|san pham|đơn|don)/i.test(header.trim())
  );
  return idx >= 0 ? idx : 0;
}

function RecordCards({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  const titleCol = pickTitleColumn(headers);

  return (
    <div className="my-2 flex flex-col gap-2">
      {rows.map((row, rowIndex) => {
        const title = row[titleCol]?.trim() || `#${rowIndex + 1}`;
        const detailHeaders = headers
          .map((header, colIndex) => ({ header, colIndex }))
          .filter(({ colIndex }) => colIndex !== titleCol);

        return (
          <MobileRecordCard
            key={`card-${rowIndex}`}
            className="border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-3 shadow-none">
            <MobileRecordCardHeader
              title={<span>{renderInline(title)}</span>}
            />
            {detailHeaders.length ? (
              <div className="mt-2 divide-y divide-[var(--color-border-subtle)]">
                {detailHeaders.map(({ header, colIndex }) => {
                  const value = row[colIndex]?.trim() || "—";
                  return (
                    <MobileRecordRow
                      key={`field-${colIndex}`}
                      label={header}
                      className="py-1.5 sm:grid-cols-[5.5rem_1fr]">
                      <span>{renderInline(value)}</span>
                    </MobileRecordRow>
                  );
                })}
              </div>
            ) : null}
          </MobileRecordCard>
        );
      })}
    </div>
  );
}

function ListCards({ items }: { items: string[] }) {
  return (
    <div className="my-2 flex flex-col gap-2">
      {items.map((item, itemIndex) => (
        <MobileRecordCard
          key={`list-card-${itemIndex}`}
          className="border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-3 shadow-none">
          <p className="text-sm leading-relaxed text-[var(--color-text-primary)]">
            {renderInline(item)}
          </p>
        </MobileRecordCard>
      ))}
    </div>
  );
}

/** Markdown renderer for chat bubbles: paragraphs, list/table → cards, bold. */
export function renderChatMarkdown(markdown: string): ReactNode[] {
  const blocks = splitBlocks(markdown);

  return blocks.map((block, index) => {
    if (block.type === "paragraph") {
      return (
        <p key={`p-${index}`} className="whitespace-pre-wrap">
          {renderInline(block.lines.join("\n"))}
        </p>
      );
    }

    if (block.type === "list") {
      return <ListCards key={`list-cards-${index}`} items={block.items} />;
    }

    return (
      <RecordCards
        key={`cards-${index}`}
        headers={block.headers}
        rows={block.rows}
      />
    );
  });
}
