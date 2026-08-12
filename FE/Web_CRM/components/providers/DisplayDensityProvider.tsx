"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type DisplayDensity = "sm" | "md" | "lg";

export const DISPLAY_DENSITY_OPTIONS: {
  value: DisplayDensity;
  label: string;
  hint: string;
}[] = [
  {
    value: "sm",
    label: "Nhỏ",
    hint: "Gọn hơn — phù hợp màn hình nhỏ",
  },
  {
    value: "md",
    label: "Trung bình",
    hint: "Mặc định — dễ đọc trên hầu hết thiết bị",
  },
  {
    value: "lg",
    label: "Lớn",
    hint: "Chữ to hơn — dễ nhìn từ xa",
  },
];

const STORAGE_KEY = "crm_density";
const DEFAULT_DENSITY: DisplayDensity = "md";

type DisplayDensityContextValue = {
  density: DisplayDensity;
  setDensity: (density: DisplayDensity) => void;
};

const DisplayDensityContext = createContext<DisplayDensityContextValue | null>(
  null
);

function isDensity(value: string | null): value is DisplayDensity {
  return value === "sm" || value === "md" || value === "lg";
}

function applyDensity(density: DisplayDensity) {
  document.documentElement.setAttribute("data-density", density);
}

export function DisplayDensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<DisplayDensity>(DEFAULT_DENSITY);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const next = isDensity(stored) ? stored : DEFAULT_DENSITY;
    setDensityState(next);
    applyDensity(next);
    setMounted(true);
  }, []);

  const setDensity = useCallback((next: DisplayDensity) => {
    setDensityState(next);
    applyDensity(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return (
    <DisplayDensityContext.Provider
      value={{ density: mounted ? density : DEFAULT_DENSITY, setDensity }}>
      {children}
    </DisplayDensityContext.Provider>
  );
}

export function useDisplayDensity() {
  const context = useContext(DisplayDensityContext);
  if (!context) {
    throw new Error("useDisplayDensity must be used within DisplayDensityProvider");
  }
  return context;
}
