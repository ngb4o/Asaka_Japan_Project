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
