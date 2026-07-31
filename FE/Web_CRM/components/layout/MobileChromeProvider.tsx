"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";

type MobileChromeContextValue = {
  /** Chrome (header / bottom nav / FAB) visible on mobile */
  visible: boolean;
  setVisible: (visible: boolean) => void;
};

const MobileChromeContext = createContext<MobileChromeContextValue>({
  visible: true,
  setVisible: () => {},
});

export function useMobileChrome() {
  return useContext(MobileChromeContext);
}

const DOWN_THRESHOLD = 10;
const UP_THRESHOLD = 8;
const TOP_REVEAL = 32;

type MobileChromeProviderProps = {
  children: ReactNode;
  /** Scroll container — typically the dashboard `<main>` */
  scrollRef: RefObject<HTMLElement | null>;
};

export function MobileChromeProvider({
  children,
  scrollRef,
}: MobileChromeProviderProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
  }, [pathname]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let lastY = el.scrollTop;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = el.scrollTop;
        const delta = y - lastY;

        if (y <= TOP_REVEAL) {
          setVisible(true);
        } else if (delta > DOWN_THRESHOLD) {
          setVisible(false);
        } else if (delta < -UP_THRESHOLD) {
          setVisible(true);
        }

        lastY = y;
        ticking = false;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef, pathname]);

  const setVisibleStable = useCallback((next: boolean) => {
    setVisible(next);
  }, []);

  const value = useMemo(
    () => ({ visible, setVisible: setVisibleStable }),
    [visible, setVisibleStable]
  );

  return (
    <MobileChromeContext.Provider value={value}>
      {children}
    </MobileChromeContext.Provider>
  );
}
