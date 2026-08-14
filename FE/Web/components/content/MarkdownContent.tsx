import { renderMarkdownContent } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  if (!content.trim()) return null;

  return (
    <div
      className={cn(
        "space-y-3 font-normal text-[length:var(--text-sm)] text-[var(--color-text-inverse)] sm:text-[length:var(--text-md)]",
        className
      )}
    >
      {renderMarkdownContent(content)}
    </div>
  );
}
