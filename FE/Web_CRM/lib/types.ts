export type ApiResponse<T> = {
  message: string;
  data: T;
};

export type AuthResult = {
  userId: string;
  token: string;
};

export type UserRole = "admin" | "sales" | "warehouse" | "accountant";

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  role: UserRole;
  employeeId?: string | null;
  employeeName?: string | null;
  employeeCode?: string | null;
  temporaryPassword?: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "active" | "inactive";
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName?: string;
  description: string;
  shortDescription: string;
  unit: string;
  unitsPerCase: number;
  price: number;
  costPrice: number;
  activeIngredient: string;
  packaging: string;
  image: string;
  images: string[];
  displayOrder: number;
  status: "active" | "inactive";
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
  totalStock?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  skip: number;
  totalPages: number;
};

export type ProductCategoryInput = {
  name: string;
  description?: string;
  status?: "active" | "inactive";
};

export type ProductInput = {
  name: string;
  sku?: string;
  categoryId: string;
  description?: string;
  shortDescription?: string;
  unit?: string;
  unitsPerCase?: number;
  price: number;
  costPrice?: number;
  activeIngredient?: string;
  packaging?: string;
  image?: string;
  images?: string[];
  displayOrder?: number;
  status?: "active" | "inactive";
};

export type News = {
  id: string;
  title: string;
  slug: string;
  content: string;
  image: string;
  displayOrder: number;
  status: "active" | "inactive";
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
};

export type NewsInput = {
  title: string;
  content: string;
  image?: string;
  displayOrder?: number;
  status?: "active" | "inactive";
};

export type Warehouse = {
  id: string;
  name: string;
  code: string;
  address: string;
  note: string;
  status: "active" | "inactive";
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
};

export type WarehouseInput = {
  name: string;
  code?: string;
  address?: string;
  note?: string;
  status?: "active" | "inactive";
};

export type WarehouseStock = {
  id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  updatedAt: string;
  warehouseName?: string;
  productName?: string;
  productSku?: string;
  productUnit?: string;
  productImage?: string;
  unitsPerCase?: number;
};

export type InventoryUnitType = "chai" | "thung";

export type InventoryTransaction = {
  id: string;
  type: "import" | "export";
  warehouseId: string;
  productId: string;
  quantity: number;
  unitType?: InventoryUnitType;
  quantityBase?: number;
  unitsPerCase?: number;
  note: string;
  balanceAfter: number;
  createdBy: string;
  createdAt: string;
  warehouseName?: string;
  productName?: string;
  productImage?: string;
};

export type InventoryMovementInput = {
  warehouseId: string;
  productId: string;
  quantity: number;
  unitType?: InventoryUnitType;
  note?: string;
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  region: string;
  message: string;
  type: "contact" | "dealer";
  source: string;
  status: "new" | "contacted" | "qualified" | "converted" | "closed";
  note: string;
  dealerId: string | null;
  dealerName?: string;
  createdAt: string;
  updatedAt: string | null;
};

export type LeadInput = {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  region?: string;
  message?: string;
  type?: "contact" | "dealer";
  source?: string;
};

export type LeadUpdateInput = {
  status?: Lead["status"];
  note?: string;
  dealerId?: string | null;
};

export type Dealer = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  region: string;
  tier: "standard" | "silver" | "gold";
  discountPercent: number;
  status: "pending" | "active" | "inactive";
  note: string;
  leadId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
};

export type DealerInput = {
  name: string;
  contactName?: string;
  phone: string;
  email?: string;
  address?: string;
  region?: string;
  tier?: Dealer["tier"];
  discountPercent?: number;
  status?: Dealer["status"];
  note?: string;
  leadId?: string;
};

export type LineItem = {
  productId: string;
  productName?: string;
  quantity: number;
  unitType?: InventoryUnitType;
  quantityBase?: number;
  unitPrice: number;
  lineTotal: number;
};

export type LineItemInput = {
  productId: string;
  quantity: number;
  unitType?: InventoryUnitType;
  unitPrice?: number;
};

export type Order = {
  id: string;
  code: string;
  dealerId: string | null;
  dealerName?: string;
  quoteId: string | null;
  warehouseId: string | null;
  warehouseName?: string;
  tripId?: string | null;
  tripCode?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: LineItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: "pending" | "confirmed" | "delivering" | "completed" | "cancelled";
  note: string;
  inventoryExported: boolean;
  paymentStatus: "unpaid" | "partial" | "paid";
  paidAmount: number;
  remainingAmount?: number;
  paymentNote: string;
  shippingAddress: string;
  shippingContactName: string;
  shippingPhone: string;
  carrier: string;
  deliveryEmployeeIds?: string[];
  deliveryEmployeeNames?: string[];
  deliveryEmployeeId?: string | null;
  deliveryEmployeeName?: string;
  trackingCode: string;
  shippingDate: string | null;
  deliveredAt: string | null;
  shippingFee: number;
  shippingNote: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
};

export type OrderInput = {
  dealerId?: string;
  quoteId?: string;
  warehouseId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: LineItemInput[];
  discount?: number;
  status?: Order["status"];
  note?: string;
  paymentStatus?: Order["paymentStatus"];
  paidAmount?: number;
  paymentNote?: string;
  shippingAddress?: string;
  shippingContactName?: string;
  shippingPhone?: string;
  carrier?: string;
  deliveryEmployeeIds?: string[];
  deliveryEmployeeId?: string | null;
  trackingCode?: string;
  shippingDate?: string | null;
  deliveredAt?: string | null;
  shippingFee?: number;
  shippingNote?: string;
};

export type DashboardSummary = {
  stats: {
    newLeads: number;
    totalLeads: number;
    activeDealers: number;
    totalDealers: number;
    pendingOrders: number;
    completedOrders: number;
    totalProducts: number;
    revenue: number;
    lowStockCount: number;
    monthRevenue: number;
    monthPaid: number;
    monthDebt: number;
    monthOrders: number;
    revenueChangePercent: number;
    orderChangePercent: number;
  };
  revenueSeries: ReportSeriesPoint[];
  statusBreakdown: ReportStatusItem[];
  paymentBreakdown: ReportPaymentItem[];
  recentLeads: Lead[];
  recentOrders: Pick<
    Order,
    "id" | "code" | "customerName" | "total" | "status" | "paymentStatus" | "createdAt"
  >[];
  lowStock: { productId: string; productName: string; quantity: number }[];
};

export type ReportSeriesPoint = {
  key: string;
  label: string;
  revenue: number;
  paidAmount: number;
  orderCount: number;
};

export type ReportStatusItem = {
  status: Order["status"];
  count: number;
  revenue: number;
};

export type ReportPaymentItem = {
  status: Order["paymentStatus"];
  count: number;
  total: number;
  paidAmount: number;
};

export type ReportKpis = {
  orderCount: number;
  revenue: number;
  paidAmount: number;
  debt: number;
  completedCount: number;
  completedRevenue: number;
  avgOrderValue: number;
  revenueChangePercent: number;
  orderChangePercent: number;
  paidChangePercent: number;
};

export type SalesReport = {
  period: {
    preset: string;
    groupBy: string;
    from: string;
    to: string;
  };
  kpis: ReportKpis;
  series: ReportSeriesPoint[];
  statusBreakdown: ReportStatusItem[];
  paymentBreakdown: ReportPaymentItem[];
  topDealers: {
    dealerId: string;
    dealerName: string;
    region: string;
    revenue: number;
    paidAmount: number;
    orderCount: number;
  }[];
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  topStaff: {
    userId: string;
    staffName: string;
    employeeCode: string;
    revenue: number;
    paidAmount: number;
    orderCount: number;
  }[];
};

export type Employee = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  title: string;
  department: string;
  userId: string | null;
  userName?: string;
  baseSalary: number;
  commissionPercent: number;
  allowance: number;
  bankAccount: string;
  bankName: string;
  bankQrImage: string;
  status: "active" | "inactive";
  note: string;
  createdAt: string;
  updatedAt: string | null;
};

export type EmployeeInput = {
  code?: string;
  fullName: string;
  phone?: string;
  email?: string;
  title?: string;
  department?: string;
  userId?: string | null;
  baseSalary?: number;
  commissionPercent?: number;
  allowance?: number;
  bankAccount?: string;
  bankName?: string;
  bankQrImage?: string;
  status?: Employee["status"];
  note?: string;
};

export type TripStop = {
  id: string;
  date: string;
  dealerId: string | null;
  dealerName?: string;
  location: string;
  purpose: "delivery" | "collection" | "meeting" | "other";
  note: string;
};

export type TripAdvance = {
  id: string;
  amount: number;
  note: string;
  createdBy: string;
  createdAt: string;
};

export type TripExpense = {
  id: string;
  category: "fuel" | "food" | "lodging" | "toll" | "parking" | "other";
  amount: number;
  date: string;
  funding: "advance" | "reimburse";
  receiptUrl: string;
  note: string;
  status: "pending" | "approved" | "rejected";
  createdBy: string | null;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type TripSettlementPreview = {
  advanceTotal: number;
  expenseAdvanceTotal: number;
  expenseReimburseTotal: number;
  employeeReturn: number;
  companyPay: number;
  balance: number;
};

export type Trip = {
  id: string;
  code: string;
  title: string;
  region: string;
  startDate: string;
  endDate: string;
  status: "draft" | "in_progress" | "settlement" | "closed" | "cancelled";
  memberIds: string[];
  orderIds: string[];
  members: { id: string; fullName: string }[];
  orders: {
    id: string;
    code: string;
    total: number;
    status: string;
    customerName: string;
  }[];
  stops: TripStop[];
  advances: TripAdvance[];
  expenses: TripExpense[];
  settlementPreview: TripSettlementPreview;
  settlement: (TripSettlementPreview & {
    note: string;
    settledAt: string;
    settledBy: string;
  }) | null;
  note: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string | null;
};

export type TripInput = {
  title?: string;
  region?: string;
  startDate: string;
  endDate: string;
  status?: Trip["status"];
  memberIds: string[];
  orderIds?: string[];
  note?: string;
};

export type PayrollLine = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  baseSalary: number;
  allowance: number;
  commissionPercent: number;
  salesTotal: number;
  commission: number;
  tripReimburse: number;
  net: number;
};

export type PayrollPeriod = {
  id: string;
  period: string;
  status: "draft" | "locked";
  lines: PayrollLine[];
  note: string;
  createdAt: string;
  updatedAt: string | null;
  lockedAt: string | null;
};

export type AppNotification = {
  id: string;
  type: "lead" | "dealer_lead" | "dealer" | "order" | "stock";
  title: string;
  message: string;
  href: string;
  createdAt: string;
  unread: boolean;
};

export type NotificationSummary = {
  unreadCount: number;
  counts: {
    leads: number;
    dealers: number;
    orders: number;
    stock: number;
  };
  items: AppNotification[];
};
