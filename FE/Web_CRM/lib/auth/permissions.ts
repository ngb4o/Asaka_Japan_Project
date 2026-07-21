import type { UserRole } from "@/lib/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Quản trị",
  sales: "Kinh doanh",
  warehouse: "Kho",
  accountant: "Kế toán",
};

const NAV_BY_ROLE: Record<UserRole, string[]> = {
  admin: [
    "/dashboard",
    "/leads",
    "/dealers",
    "/quotes",
    "/orders",
    "/product-categories",
    "/products",
    "/warehouses",
    "/inventory",
    "/news",
  ],
  sales: [
    "/dashboard",
    "/leads",
    "/dealers",
    "/quotes",
    "/orders",
    "/products",
    "/news",
  ],
  warehouse: ["/dashboard", "/orders", "/warehouses", "/inventory", "/products"],
  accountant: ["/dashboard", "/dealers", "/quotes", "/orders"],
};

export function canAccessPath(role: UserRole | undefined | null, href: string) {
  if (!role) return false;
  // Users management UI is hidden for now
  if (href === "/users" || href.startsWith("/users/")) return false;
  if (role === "admin") return true;
  return (NAV_BY_ROLE[role] || []).some(
    (path) => href === path || href.startsWith(`${path}/`)
  );
}

export function canManageOrders(role?: UserRole | null) {
  return role === "admin" || role === "sales" || role === "accountant";
}

export function canEditOrderItems(role?: UserRole | null) {
  return role === "admin" || role === "sales";
}

export function canManagePayments(role?: UserRole | null) {
  return role === "admin" || role === "sales" || role === "accountant";
}

export function canManageShipping(role?: UserRole | null) {
  return role === "admin" || role === "sales" || role === "warehouse";
}

export function canManageQuotes(role?: UserRole | null) {
  return role === "admin" || role === "sales";
}

export function canManageUsers(_role?: UserRole | null) {
  // Users management UI is hidden
  return false;
}
