export type WarehouseItem = {
  id: string;
  name: string;
  image: string;
  quantity: number;
  unit: string;
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
  quantity?: number;
  unit: string;
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
  available?: number;
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

export type ExportSlipLine = {
  movementId: string;
  itemName: string;
  unit: string;
  quantity: number;
  available?: number;
  note: string;
};

export type ProposalLine = {
  date: string;
  itemName: string;
  unit: string;
  quantity: number;
  price: number;
  note: string;
};

export type TireProposalLine = {
  date: string;
  plate: string;
  itemName: string;
  unit: string;
  quantity: number;
  price: number;
  note: string;
};

export type PhucVinhProposalLine = {
  itemName: string;
  unit: string;
  quantity: number;
  price: number | null;
  stock: number | null;
  supplier: string;
  receiver: string;
};

export type RentalProposalLine = {
  date: string;
  itemName: string;
  unit: string;
  quantity: number;
  price: number;
  note: string;
};

export type RentalProposal = {
  id: string;
  reportDate: string;
  subject: string;
  content: string;
  lines: RentalProposalLine[];
  createdAt: string;
  updatedAt?: string;
};

export type OngDiaProposalLine = {
  itemName: string;
  unit: string;
  quantity: number;
  price: number;
  note: string;
};

export type OngDiaProposal = {
  id: string;
  reportDate: string;
  subject: string;
  content: string;
  lines: OngDiaProposalLine[];
  createdAt: string;
  updatedAt?: string;
};

export type WeldProposalLine = {
  date: string;
  itemName: string;
  unit: string;
  quantity: number;
  price: number;
  note: string;
};

export type WeldProposal = {
  id: string;
  reportDate: string;
  subject: string;
  content: string;
  lines: WeldProposalLine[];
  createdAt: string;
  updatedAt?: string;
};

export type ViettelProposalLine = {
  date: string;
  receiver: string;
  fee: number;
  note: string;
};

export type ViettelProposal = {
  id: string;
  reportDate: string;
  subject: string;
  content: string;
  lines: ViettelProposalLine[];
  createdAt: string;
  updatedAt?: string;
};

export type UtilityProposal = {
  id: string;
  reportDate: string;
  period: string;
  subject: string;
  content: string;
  paymentTitle: string;
  amountWords: string;
  electricStart: number;
  electricEnd: number;
  electricPrice: number;
  electricNote: string;
  waterStart: number;
  waterEnd: number;
  waterPrice: number;
  waterNote: string;
  sanitationFee: number;
  sanitationNote: string;
  internetFee: number;
  internetNote: string;
  createdAt: string;
  updatedAt?: string;
};

export type OfficeProposalLine = {
  date: string;
  itemName: string;
  unit: string;
  quantity: number;
  price: number;
  note: string;
};

export type OfficeProposal = {
  id: string;
  reportDate: string;
  subject: string;
  content: string;
  lines: OfficeProposalLine[];
  createdAt: string;
  updatedAt?: string;
};

export type PhucVinhProposal = {
  id: string;
  reportDate: string;
  subject: string;
  content: string;
  lines: PhucVinhProposalLine[];
  createdAt: string;
  updatedAt?: string;
};

export type ElectricProposalLine = {
  date: string;
  plate: string;
  itemName: string;
  unit: string;
  quantity: number;
  price: number;
  note: string;
};

export type ElectricProposal = {
  id: string;
  reportDate: string;
  subject: string;
  content: string;
  lines: ElectricProposalLine[];
  createdAt: string;
  updatedAt?: string;
};

export type TireProposal = {
  id: string;
  reportDate: string;
  subject: string;
  content: string;
  lines: TireProposalLine[];
  createdAt: string;
  updatedAt?: string;
};

export type ProposalSlip = {
  id: string;
  reportDate: string;
  content: string;
  lines: ProposalLine[];
  createdAt: string;
  updatedAt?: string;
};

export type ExportSlip = {
  id: string;
  status: "draft";
  requester: string;
  driverId: string;
  driverName: string;
  plate: string;
  mooc: string;
  km: number;
  lines: ExportSlipLine[];
  createdAt: string;
  updatedAt?: string;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  plate: string;
  mooc: string;
  note: string;
};

export type DriverInput = {
  name: string;
  phone: string;
  plate: string;
  mooc: string;
  note: string;
};

export type DriverList = {
  items: Driver[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
