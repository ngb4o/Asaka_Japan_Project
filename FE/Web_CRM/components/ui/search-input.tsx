"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const DEFAULT_DEBOUNCE_MS = 500;

type SearchInputProps = {
  /** Committed search query (drives API). */
  value: string;
  /** Called when search commits (debounce / Enter / blur / clear). */
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Auto-search after typing pauses. Default 500ms. Set 0 to disable. */
  debounceMs?: number;
  /** Commit on blur (mobile keyboard "Done"). Default true. */
  commitOnBlur?: boolean;
};

/**
 * Search box with debounce — stops typing ~500ms then searches.
 * Enter / Done / clear still commit immediately.
 */
export function SearchInput({
  value,
  onSearch,
  placeholder = "Tìm kiếm...",
  className,
  inputClassName,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  commitOnBlur = true,
}: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchRef = useRef(onSearch);
  const valueRef = useRef(value);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    valueRef.current = value;
    if (!focused.current) setDraft(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const commit = (next: string) => {
    clearTimer();
    const trimmed = next.trim();
    setDraft(trimmed);
    if (trimmed === valueRef.current.trim()) return;
    onSearchRef.current(trimmed);
  };

  const scheduleCommit = (next: string) => {
    clearTimer();
    if (debounceMs <= 0) {
      commit(next);
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      commit(next);
    }, debounceMs);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setDraft(next);
    scheduleCommit(next);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(draft);
      e.currentTarget.blur();
    }
  };

  const handleBlur = () => {
    focused.current = false;
    if (commitOnBlur) commit(draft);
  };

  const handleClear = () => {
    clearTimer();
    setDraft("");
    if (valueRef.current) onSearchRef.current("");
  };

  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
      <Input
        type="text"
        enterKeyHint="search"
        inputMode="search"
        placeholder={placeholder}
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={handleBlur}
        className={cn("pl-9 pr-9 shadow-none", inputClassName)}
        aria-label={placeholder}
      />
      {draft ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Xóa tìm kiếm"
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--color-text-inverse)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClear}>
              <X className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Xóa tìm kiếm</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
