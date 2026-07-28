import type { UserRole } from "@/lib/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Quản trị",
  sales: "Kinh doanh",
  warehouse: "Kho",
  accountant: "Kế toán",
};

/** Mô tả ngắn dưới tên app trên sidebar */
export const ROLE_WORKSPACE_SUBTITLE: Record<UserRole, string> = {
  admin: "Toàn hệ thống",
  sales: "Lead · đại lý · đơn hàng",
  warehouse: "Kho · tồn · xuất nhập",
  accountant: "Tài chính · nhân sự · lương",
};

/** Dòng mô tả trên trang tổng quan */
export const DASHBOARD_HERO_SUBTITLE: Record<UserRole, string> = {
  admin: "Doanh số, thu chi và vận hành toàn công ty.",
  accountant: "Doanh số, công nợ, quyết toán chuyến và bảng lương.",
  sales: "Lead, đại lý và đơn hàng trong phạm vi công việc của bạn.",
  warehouse: "Đơn cần xử lý, tồn kho và chuyến giao hàng.",
};

const NAV_BY_ROLE: Record<UserRole, string[]> = {
  admin: [
    "/dashboard",
    "/reports",
    "/leads",
    "/dealers",
    "/orders",
    "/product-categories",
    "/products",
    "/warehouses",
    "/inventory",
    "/news",
    "/employees",
    "/trips",
    "/payroll",
    "/users",
    "/settings/telegram",
  ],
  sales: [
    "/dashboard",
    "/leads",
    "/dealers",
    "/orders",
    "/products",
    "/news",
    "/trips",
  ],
  warehouse: [
    "/dashboard",
    "/orders",
    "/warehouses",
    "/inventory",
    "/products",
    "/trips",
  ],
  accountant: [
    "/dashboard",
    "/reports",
    "/dealers",
    "/orders",
    "/employees",
    "/trips",
    "/payroll",
  ],
};

export function canAccessPath(role: UserRole | undefined | null, href: string) {
  if (!role) return false;
  if (href === "/quotes" || href.startsWith("/quotes/")) return false;
  if (role === "admin") return true;
  return (NAV_BY_ROLE[role] || []).some(
    (path) => href === path || href.startsWith(`${path}/`)
  );
}

/** Báo cáo doanh số toàn công ty — chỉ quản trị & kế toán */
export function canViewReports(role?: UserRole | null) {
  return role === "admin" || role === "accountant";
}

/** KPI / biểu đồ doanh thu, công nợ công ty */
export function canViewCompanyFinancials(role?: UserRole | null) {
  return canViewReports(role);
}

/** Trang danh sách hồ sơ nhân viên (HR) */
export function canViewEmployeesPage(role?: UserRole | null) {
  return role === "admin" || role === "accountant";
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

export function canManageUsers(role?: UserRole | null) {
  return role === "admin";
}

export function canManageTelegram(role?: UserRole | null) {
  return role === "admin";
}

export function canManageEmployees(role?: UserRole | null) {
  return role === "admin" || role === "accountant";
}

export function canManageTripsFinance(role?: UserRole | null) {
  return role === "admin" || role === "accountant";
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
    employeeId?: string | null;
  } | null
) {
  if (!trip || !user?.id) return false;
  if (canManageTripsFinance(user.role)) return true;
  if (trip.createdBy && trip.createdBy === user.id) return true;
  const employeeId = user.employeeId;
  if (!employeeId) return false;
  if (trip.memberIds?.includes(employeeId)) return true;
  return Boolean(trip.members?.some((member) => member.id === employeeId));
}

export function canManagePayroll(role?: UserRole | null) {
  return role === "admin" || role === "accountant";
}
