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
  unitPrice: number;
  lineTotal: number;
};

export type LineItemInput = {
  productId: string;
  quantity: number;
  unitPrice?: number;
};

export type Quote = {
  id: string;
  code: string;
  dealerId: string | null;
  dealerName?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: LineItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  note: string;
  validUntil: string | null;
  orderId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
};

export type QuoteInput = {
  dealerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: LineItemInput[];
  discount?: number;
  status?: Quote["status"];
  note?: string;
  validUntil?: string | null;
};

export type Order = {
  id: string;
  code: string;
  dealerId: string | null;
  dealerName?: string;
  quoteId: string | null;
  warehouseId: string | null;
  warehouseName?: string;
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
    draftQuotes: number;
    pendingOrders: number;
    completedOrders: number;
    totalProducts: number;
    revenue: number;
    lowStockCount: number;
  };
  recentLeads: Lead[];
  recentOrders: Pick<Order, "id" | "code" | "customerName" | "total" | "status" | "createdAt">[];
  lowStock: { productId: string; productName: string; quantity: number }[];
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
