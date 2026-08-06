"use client";

import { cn } from "@/lib/utils";

type TabSwitcherProps = {
  tabs: string[];
  selectedIndex: number;
  onTabSelected: (index: number) => void;
  className?: string;
  /** Gap between tabs. Default matches Flutter (8px between items) */
  tabGap?: boolean;
};

/**
 * Segmented control / pill tab switcher (mobile-first).
 * Inspired by Flutter `TabSwitcher`.
 */
export function TabSwitcher({
  tabs,
  selectedIndex,
  onTabSelected,
  className,
  tabGap = true,
}: TabSwitcherProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex h-10 items-center gap-0 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-0.5 shadow-[var(--shadow-soft)]",
        className
      )}>
      {tabs.map((tab, index) => {
        const isSelected = selectedIndex === index;
        return (
          <button
            key={`${tab}-${index}`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onTabSelected(index)}
            title={tab}
            className={cn(
              "relative flex h-full min-w-0 flex-1 items-center justify-center rounded-md px-1.5 text-sm font-semibold transition-all duration-200 ease-in-out",
              tabGap && index < tabs.length - 1 && "mr-1",
              isSelected
                ? "bg-[var(--color-text-secondary)] text-[var(--color-text-tertiary)] shadow-sm"
                : "bg-transparent text-[var(--color-text-inverse)] hover:text-[var(--color-text-primary)]"
            )}>
            <span className="truncate">{tab}</span>
          </button>
        );
      })}
    </div>
  );
}
