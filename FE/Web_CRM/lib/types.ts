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
  /** Primary role (first of roles) — for display / legacy */
  role: UserRole;
  /** All assigned roles — source of truth for permissions */
  roles: UserRole[];
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
  lat?: number | null;
  lng?: number | null;
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
  lat?: number | null;
  lng?: number | null;
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
  /** Giá vốn / chai hiện tại */
  costPrice?: number;
  /** quantity × costPrice */
  stockValue?: number;
};

export type InventoryStockValuation = {
  totalValue: number;
  totalQuantity: number;
  lineCount: number;
  zeroCostLines: number;
  byWarehouse: Array<{
    warehouseId: string;
    warehouseName: string;
    totalValue: number;
    totalQuantity: number;
    lineCount: number;
  }>;
};

export type InventoryFlowProductRow = {
  productId: string;
  productName: string;
  productSku: string;
  totalValue: number;
  totalQuantityBase: number;
  txnCount: number;
};

export type InventoryFlowCapitalRow = {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  costPrice: number;
  stockValue: number;
  exportValueInPeriod: number;
};

export type InventoryFlowReport = {
  from: string;
  to: string;
  dayCount: number;
  warehouseId: string | null;
  importValue: number;
  exportValue: number;
  importQuantityBase: number;
  exportQuantityBase: number;
  importTxnCount: number;
  exportTxnCount: number;
  netFlowValue: number;
  openingValue: number;
  closingValue: number;
  avgValue: number;
  turnoverTimes: number;
  daysOfInventory: number | null;
  zeroCostLines: number;
  series: Array<{ date: string; importValue: number; exportValue: number }>;
  topImports: InventoryFlowProductRow[];
  topExports: InventoryFlowProductRow[];
  topCapital: InventoryFlowCapitalRow[];
  slowMoving: InventoryFlowCapitalRow[];
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
  unitCost?: number;
  totalCost?: number;
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
  unitCost?: number;
  supplierId?: string;
  dueDate?: string;
  /** unpaid | paid — khi gắn NCC */
  paymentStatus?: "unpaid" | "paid";
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
  lat?: number | null;
  lng?: number | null;
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
  lat?: number | null;
  lng?: number | null;
  tier?: Dealer["tier"];
  discountPercent?: number;
  status?: Dealer["status"];
  note?: string;
  leadId?: string;
};

export type LineItem = {
  productId: string;
  productName?: string;
  productImage?: string;
  quantity: number;
  unitType?: InventoryUnitType;
  quantityBase?: number;
  unitPrice: number;
  lineTotal: number;
  /** Snapshot giá vốn / đơn vị bán lúc tạo dòng */
  unitCost?: number;
  lineCost?: number;
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
  /** Tổng giá vốn snapshot */
  costTotal?: number;
  /** Lãi gộp = total − costTotal (đơn hủy = 0) */
  grossProfit?: number;
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
  invoiceEmailSentAt?: string | null;
  invoiceEmailSentTo?: string;
  invoiceEmailError?: string;
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
  /** Ảnh đính nhật ký khi đổi sang đang giao / hoàn tất — không lưu trên đơn */
  statusPhotos?: string[];
};

export type OrderAuditAction =
  | "created"
  | "status_changed"
  | "confirmed_exported"
  | "cancelled"
  | "payment_recorded"
  | "invoice_emailed"
  | "deleted";

export type OrderAudit = {
  id: string;
  orderId: string;
  orderCode: string;
  action: OrderAuditAction;
  meta: Record<string, unknown>;
  actorUserId: string | null;
  actorName: string;
  actorEmail?: string;
  actorCode?: string;
  createdAt: string;
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
    monthCostTotal?: number;
    monthGrossProfit?: number;
    inventoryStockValue?: number;
    inventoryZeroCostLines?: number;
    supplierDebt?: number;
    revenueChangePercent: number;
    orderChangePercent: number;
    grossProfitChangePercent?: number;
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

export type ReceivableDealerSummary = {
  dealerId: string;
  dealerName: string;
  contactName: string;
  phone: string;
  region: string;
  status: string | null;
  orderTotal: number;
  paidAmount: number;
  debtAmount: number;
  debtOrderCount: number;
};

export type ReceivablesSummary = {
  totals: {
    debtAmount: number;
    paidAmount: number;
    orderTotal: number;
    dealerCount: number;
    debtOrderCount: number;
  };
  items: ReceivableDealerSummary[];
};

export type Supplier = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  taxCode: string;
  status: "active" | "inactive";
  note: string;
  createdAt: string;
  updatedAt?: string | null;
};

export type SupplierInput = {
  name: string;
  contactName?: string;
  phone: string;
  email?: string;
  address?: string;
  taxCode?: string;
  status?: "active" | "inactive";
  note?: string;
};

export type PurchaseInvoice = {
  id: string;
  code: string;
  supplierId: string;
  warehouseId?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  items: Array<{
    productId: string;
    productName?: string;
    quantity: number;
    unitType?: "chai" | "thung";
    quantityBase?: number;
    unitCost?: number;
    totalCost?: number;
    transactionId?: string | null;
  }>;
  total: number;
  paidAmount: number;
  remainingAmount?: number;
  paymentStatus: "unpaid" | "partial" | "paid";
  status: "open" | "cancelled";
  note: string;
  createdAt: string;
  supplierName?: string;
  supplierPhone?: string;
};

export type PayableSupplierSummary = {
  supplierId: string;
  supplierName: string;
  contactName: string;
  phone: string;
  taxCode: string;
  status: string | null;
  invoiceTotal: number;
  paidAmount: number;
  debtAmount: number;
  debtInvoiceCount: number;
};

export type PayablesSummary = {
  totals: {
    debtAmount: number;
    paidAmount: number;
    invoiceTotal: number;
    supplierCount: number;
    debtInvoiceCount: number;
  };
  items: PayableSupplierSummary[];
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
  costTotal?: number;
  grossProfit?: number;
  completedCount: number;
  completedRevenue: number;
  avgOrderValue: number;
  revenueChangePercent: number;
  orderChangePercent: number;
  paidChangePercent: number;
  grossProfitChangePercent?: number;
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
  /** Thứ tự trên chuyến (1-based) */
  seq?: number;
  date: string;
  dealerId: string | null;
  dealerName?: string;
  /** Đơn gắn điểm giao (nếu tạo từ đơn) */
  orderId?: string | null;
  location: string;
  purpose: "delivery" | "collection" | "meeting" | "other";
  note: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  locationCapturedAt?: string | null;
  locationSource?: "gps" | "manual" | "dealer" | "geocode" | null;
};

export type TripAdvance = {
  id: string;
  amount: number;
  note: string;
  receiptUrl?: string;
  receiptUrls?: string[];
  createdBy: string;
  createdAt: string;
};

export type TripExpense = {
  id: string;
  category: "fuel" | "food" | "lodging" | "toll" | "parking" | "other";
  amount: number;
  date: string;
  funding: "advance" | "reimburse";
  /** NV trong chuyến đã tự bỏ tiền (funding=reimburse) */
  paidByEmployeeId?: string | null;
  paidByEmployeeName?: string;
  receiptUrl: string;
  receiptUrls?: string[];
  note: string;
  status: "pending" | "approved" | "rejected";
  createdBy: string | null;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  locationCapturedAt?: string | null;
  locationSource?: "gps" | "manual" | null;
};

export type TripSettlementPreview = {
  advanceTotal: number;
  expenseAdvanceTotal: number;
  expenseReimburseTotal: number;
  employeeReturn: number;
  companyPay: number;
  balance: number;
  companyPayByEmployee?: { employeeId: string; amount: number }[];
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
    costTotal?: number;
    grossProfit?: number;
    status: string;
    paymentStatus?: string;
    paidAmount?: number;
    customerName: string;
    customerPhone?: string;
    dealerId?: string | null;
    dealerName?: string;
    warehouseName?: string;
    shippingAddress?: string;
    shippingContactName?: string;
    shippingPhone?: string;
    shippingNote?: string;
    shippingDate?: string | null;
    deliveredAt?: string | null;
    deliveryEmployeeName?: string;
    deliveryEmployeeNames?: string[];
    itemCount?: number;
  }[];
  stops: TripStop[];
  /** Kho xuất phát (GPS) — lấy từ đơn gắn chuyến */
  originWarehouse?: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null;
  advances: TripAdvance[];
  expenses: TripExpense[];
  settlementPreview: TripSettlementPreview;
  settlement: (TripSettlementPreview & {
    note: string;
    settledAt: string;
    settledBy: string;
  }) | null;
  /** Lãi chuyến: lãi gộp đơn − chi phí đi đường đã duyệt */
  profitSummary?: {
    orderRevenue: number;
    orderCostTotal: number;
    orderGrossProfit: number;
    tripExpenseTotal: number;
    tripNetProfit: number;
  };
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
  type: "lead" | "dealer_lead" | "dealer" | "order" | "stock" | "trip" | "payment";
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
    trips: number;
  };
  items: AppNotification[];
};
