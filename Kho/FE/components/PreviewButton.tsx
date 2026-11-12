import { Eye, PenLine } from "lucide-react";

const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-4 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]";

export function PreviewButton({ showing, onToggle }: { showing: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={buttonClass} onClick={onToggle}>
      {showing ? <PenLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      {showing ? "Nhập phiếu" : "Xem trước"}
    </button>
  );
}
