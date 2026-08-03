import type { UserRole } from "@/lib/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Quản trị",
  sales: "Kinh doanh",
  warehouse: "Kho",
  accountant: "Kế toán",
};

export const ALL_USER_ROLES: UserRole[] = [
  "admin",
  "sales",
  "warehouse",
  "accountant",
];

/** Mô tả ngắn dưới tên app trên sidebar */
export const ROLE_WORKSPACE_SUBTITLE: Record<UserRole, string> = {
  admin: "Toàn hệ thống",
  sales: "Kinh doanh · kho · đơn hàng",
  warehouse: "Kinh doanh · kho · đơn hàng",
  accountant: "Tài chính · nhân sự · lương",
};

/** Dòng mô tả trên trang tổng quan */
export const DASHBOARD_HERO_SUBTITLE: Record<UserRole, string> = {
  admin: "Doanh số, thu chi và vận hành toàn công ty.",
  accountant: "Doanh số, công nợ, quyết toán chuyến và bảng lương.",
  sales: "Lead, đại lý, đơn hàng, kho và chuyến giao hàng.",
  warehouse: "Lead, đại lý, đơn hàng, kho và chuyến giao hàng.",
};

export type RoleInput = UserRole | UserRole[] | null | undefined;

/** Normalize profile.role / profile.roles into a unique roles array. */
export function resolveRoles(
  roleOrRoles: RoleInput,
  fallbackRoles?: UserRole[] | null
): UserRole[] {
  if (Array.isArray(roleOrRoles) && roleOrRoles.length) {
    return Array.from(new Set(roleOrRoles.filter(Boolean)));
  }
  if (typeof roleOrRoles === "string" && roleOrRoles) {
    return [roleOrRoles];
  }
  if (fallbackRoles?.length) {
    return Array.from(new Set(fallbackRoles.filter(Boolean)));
  }
  return [];
}

/** Roles from a user profile (roles[] preferred, else legacy role). */
export function rolesOf(
  user?: {
    role?: UserRole | null;
    roles?: UserRole[] | null;
  } | null
): UserRole[] {
  if (!user) return [];
  if (user.roles?.length) return resolveRoles(user.roles);
  if (user.role) return [user.role];
  return [];
}

export function primaryRole(
  roleOrRoles: RoleInput,
  fallback?: UserRole | null
): UserRole | null {
  return resolveRoles(roleOrRoles)[0] || fallback || null;
}

export function hasRole(roleOrRoles: RoleInput, role: UserRole): boolean {
  return resolveRoles(roleOrRoles).includes(role);
}

/** Admin always wins; otherwise any listed role matches. */
export function hasAnyRole(
  roleOrRoles: RoleInput,
  ...allowed: UserRole[]
): boolean {
  const roles = resolveRoles(roleOrRoles);
  if (!roles.length) return false;
  if (roles.includes("admin")) return true;
  return allowed.some((role) => roles.includes(role));
}

/** Sales & Kho dùng chung menu vận hành */
const OPS_NAV = [
  "/dashboard",
  "/leads",
  "/dealers",
  "/orders",
  "/receivables",
  "/products",
  "/inventory",
  "/news",
  "/trips",
  "/payroll",
] as const;

const NAV_BY_ROLE: Record<UserRole, string[]> = {
  admin: [
    "/dashboard",
    "/reports",
    "/leads",
    "/dealers",
    "/orders",
    "/receivables",
    "/product-categories",
    "/products",
    "/inventory",
    "/news",
    "/employees",
    "/trips",
    "/payroll",
    "/users",
  ],
  sales: [...OPS_NAV],
  warehouse: [
    "/dashboard",
    "/leads",
    "/dealers",
    "/orders",
    "/products",
    "/inventory",
    "/news",
    "/trips",
    "/payroll",
  ],
  accountant: [
    "/dashboard",
    "/reports",
    "/dealers",
    "/orders",
    "/receivables",
    "/employees",
    "/trips",
    "/payroll",
  ],
};

export function canAccessPath(roleOrRoles: RoleInput, href: string) {
  const roles = resolveRoles(roleOrRoles);
  if (!roles.length) return false;
  if (href === "/quotes" || href.startsWith("/quotes/")) return false;
  if (roles.includes("admin")) return true;
  const allowed = new Set<string>();
  for (const role of roles) {
    for (const path of NAV_BY_ROLE[role] || []) allowed.add(path);
  }
  return Array.from(allowed).some(
    (path) => href === path || href.startsWith(`${path}/`)
  );
}

/** Báo cáo doanh số toàn công ty — chỉ quản trị & kế toán */
export function canViewReports(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "accountant");
}

/** Xem giá vốn / lãi gộp — admin & kế toán */
export function canViewProfit(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "accountant");
}

/** Sổ công nợ đại lý — admin, kế toán, sales */
export function canViewReceivables(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "accountant", "sales");
}

/** KPI / biểu đồ doanh thu, công nợ công ty */
export function canViewCompanyFinancials(roleOrRoles?: RoleInput) {
  return canViewReports(roleOrRoles);
}

/** Trang danh sách hồ sơ nhân viên (HR) */
export function canViewEmployeesPage(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "accountant");
}

export function canManageOrders(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "sales", "warehouse", "accountant");
}

export function canEditOrderItems(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "sales", "warehouse");
}

/** Đơn hoàn tất / hủy — khóa form sửa (vẫn xem / thu tiền nếu còn nợ). */
export function isOrderEditable(order?: { status?: string } | null) {
  if (!order?.status) return false;
  return order.status !== "completed" && order.status !== "cancelled";
}

/** Xác nhận đơn + xuất kho — chỉ admin / kho (Phase B) */
export function canConfirmAndExport(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "warehouse");
}

/** Nhập / xuất kho thủ công trên trang Kho — chỉ admin / kho */
export function canManageStockMovements(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "warehouse");
}

/** CRUD đại lý — sales / kho (kế toán chỉ xem) */
export function canManageDealers(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "sales", "warehouse");
}

/** Thu tiền / ghi nhận thanh toán — sales + kế toán (kho không thu) */
export function canManagePayments(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "sales", "accountant");
}

/** Hủy đơn đã xuất kho (hoàn tồn) — chỉ admin / kho */
export function canCancelExportedOrder(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "warehouse");
}

export function canManageShipping(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "sales", "warehouse");
}

export function canManageUsers(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles);
}

/** CRUD sản phẩm / loại sản phẩm — chỉ admin */
export function canManageProducts(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles);
}

export function canManageEmployees(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "accountant");
}

export function canManageTripsFinance(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "accountant");
}

/** Sales/warehouse may edit only trips they created or belong to as member. */
export function canOperateTrip(
  trip: {
    createdBy?: string | null;
    memberIds?: string[];
    members?: { id: string }[];
  } | null | undefined,
  user?: {
    id?: string;
    role?: UserRole | null;
    roles?: UserRole[] | null;
    employeeId?: string | null;
  } | null
) {
  if (!trip || !user?.id) return false;
  if (canManageTripsFinance(user.roles ?? user.role)) return true;
  if (trip.createdBy && trip.createdBy === user.id) return true;
  const employeeId = user.employeeId;
  if (!employeeId) return false;
  if (trip.memberIds?.includes(employeeId)) return true;
  return Boolean(trip.members?.some((member) => member.id === employeeId));
}

export function canManagePayroll(roleOrRoles?: RoleInput) {
  return hasAnyRole(roleOrRoles, "accountant");
}
