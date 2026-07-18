export type ApiResponse<T> = {
  message: string;
  data: T;
};

export type AuthResult = {
  userId: string;
  token: string;
};

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  avatar: string | null;
  createdAt: string;
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
