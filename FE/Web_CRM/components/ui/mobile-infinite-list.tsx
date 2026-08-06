"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileInfiniteListProps = {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore?: boolean;
  className?: string;
  /** Disable gestures while a blocking load is in progress */
  disabled?: boolean;
};

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return current;
    }
    current = current.parentElement;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/**
 * Mobile-only list chrome: pull-to-refresh + infinite scroll sentinel.
 * Hidden from `md` up — desktop keeps classic Pagination.
 */
export function MobileInfiniteList({
  children,
  onRefresh,
  onLoadMore,
  hasMore,
  loadingMore = false,
  className,
  disabled = false,
}: MobileInfiniteListProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef<number | null>(null);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const loadMoreLock = useRef(false);

  const canPull = useCallback(() => {
    if (disabled || refreshing) return false;
    const scrollParent = getScrollParent(rootRef.current);
    return (scrollParent?.scrollTop ?? 0) <= 0;
  }, [disabled, refreshing]);

  const handleTouchStart = (event: ReactTouchEvent) => {
    if (!canPull()) {
      pullStartY.current = null;
      pulling.current = false;
      return;
    }
    pullStartY.current = event.touches[0]?.clientY ?? null;
    pulling.current = true;
  };

  const handleTouchMove = (event: ReactTouchEvent) => {
    if (!pulling.current || pullStartY.current == null || refreshing) return;
    if (!canPull()) {
      pullStartY.current = null;
      pulling.current = false;
      setPullDistance(0);
      return;
    }

    const currentY = event.touches[0]?.clientY ?? pullStartY.current;
    const delta = currentY - pullStartY.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }

    // Resistive pull
    const distance = Math.min(96, delta * 0.45);
    setPullDistance(distance);
  };

  const handleTouchEnd = async () => {
    if (!pulling.current) return;
    pulling.current = false;
    pullStartY.current = null;

    const shouldRefresh = pullDistance >= 56 && !disabled && !refreshing;
    setPullDistance(0);
    if (!shouldRefresh) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (disabled || refreshing || loadingMore || loadMoreLock.current) return;

        loadMoreLock.current = true;
        onLoadMore();
        // Keep lock until loading finishes; fallback unlock if parent didn't start
        window.setTimeout(() => {
          if (!loadingMore) loadMoreLock.current = false;
        }, 800);
      },
      {
        root: getScrollParent(rootRef.current),
        rootMargin: "120px 0px",
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [disabled, hasMore, loadingMore, onLoadMore, refreshing]);

  useEffect(() => {
    if (!loadingMore && !refreshing) {
      loadMoreLock.current = false;
    }
  }, [loadingMore, refreshing]);

  const indicatorOffset = refreshing ? 44 : pullDistance;
  const readyToRefresh = pullDistance >= 56;

  return (
    <div
      ref={rootRef}
      className={cn("relative md:hidden", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => void handleTouchEnd()}
      onTouchCancel={() => {
        pulling.current = false;
        pullStartY.current = null;
        setPullDistance(0);
      }}>
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: indicatorOffset }}
        aria-hidden={!refreshing && pullDistance === 0}>
        <div
          className={cn(
            "flex items-center gap-2 text-xs font-medium text-[var(--color-text-inverse)]",
            (readyToRefresh || refreshing) && "text-[var(--color-text-secondary)]"
          )}>
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw
              className={cn(
                "h-4 w-4 transition-transform",
                readyToRefresh && "rotate-180"
              )}
            />
          )}
          <span>
            {refreshing
              ? "Đang tải lại..."
              : readyToRefresh
                ? "Thả để tải lại"
                : "Kéo để tải lại"}
          </span>
        </div>
      </div>

      {children}

      <div ref={sentinelRef} className="h-4 w-full" aria-hidden />

      {loadingMore ? (
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-[var(--color-text-inverse)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải thêm...
        </div>
      ) : null}
    </div>
  );
}
