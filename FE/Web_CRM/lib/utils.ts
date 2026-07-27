import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(value || 0)} ₫`;
}

export function formatVndInput(value: number | "") {
  if (value === "") return "";
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function parseVndInput(value: string): number | "" {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : "";
}

/** Format any date-like value as dd/mm/yyyy */
export function formatDateDisplay(value?: string | Date | null) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    // Already dd/mm/yyyy?
    if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return value;
    }
    return "";
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Convert dd/mm/yyyy → yyyy-mm-dd (ISO date input value) */
export function parseDateDisplay(value: string): string {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (
    date.getFullYear() !== Number(yyyy) ||
    date.getMonth() !== Number(mm) - 1 ||
    date.getDate() !== Number(dd)
  ) {
    return "";
  }
  return `${yyyy}-${mm}-${dd}`;
}

/** Normalize API/ISO date to yyyy-mm-dd */
export function toDateValue(value?: string | Date | null) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}
