"use client";

import { useCallback, useState } from "react";

type StringRecord = Record<string, string>;

function countActive(values: StringRecord) {
  return Object.values(values).filter(Boolean).length;
}

/**
 * Draft filters edited in the panel; applied only when pressing "Xong".
 * Closing without apply discards draft (re-synced from applied on next open).
 */
export function useDeferredFilters<T extends StringRecord>(empty: T) {
  const [applied, setApplied] = useState<T>(empty);
  const [draft, setDraft] = useState<T>(empty);
  const [open, setOpenState] = useState(false);

  const setOpen = useCallback(
    (next: boolean) => {
      if (next) {
        setDraft(applied);
        setOpenState(true);
        return;
      }
      setOpenState(false);
    },
    [applied]
  );

  const setDraftValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const apply = useCallback(() => {
    setApplied(draft);
    setOpenState(false);
  }, [draft]);

  const clearDraft = useCallback(() => {
    setDraft(empty);
  }, [empty]);

  return {
    open,
    setOpen,
    applied,
    draft,
    setDraftValue,
    apply,
    clearDraft,
    appliedCount: countActive(applied),
    draftCount: countActive(draft),
  };
}
