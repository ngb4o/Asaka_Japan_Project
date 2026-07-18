import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatVndInput(value: number | "") {
  if (value === "") return "";
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function parseVndInput(value: string): number | "" {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : "";
}
