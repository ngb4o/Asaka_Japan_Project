export type WarehouseItem = {
  id: string;
  name: string;
  image: string;
  quantity: number;
  column: number | null;
  createdAt?: string;
  updatedAt?: string | null;
};

export type ItemList = {
  items: WarehouseItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  columns: number[];
  summary: {
    totalItems: number;
    totalQuantity: number;
    columnCount: number;
  };
};

export type ItemInput = {
  name: string;
  quantity: number;
  column: number | null;
  image: File | null;
};

export type MovementType = "in" | "out";

export type StockMovement = {
  id: string;
  itemId: string;
  itemName: string;
  type: MovementType;
  quantity: number;
  note: string;
  createdBy: string;
  balanceAfter: number;
  createdAt: string;
};

export type MovementList = {
  items: StockMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type MovementInput = {
  type: MovementType;
  quantity: number;
  note: string;
};

export type MovementResult = {
  movement: StockMovement;
  item: WarehouseItem;
};

export type AuthUser = {
  id: string;
  username: string;
  name: string;
};

export type LoginResult = {
  token: string;
  user: AuthUser;
};
