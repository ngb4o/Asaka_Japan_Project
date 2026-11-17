import { emitOfflineCacheHit, readApiCache, writeApiCache } from "@/lib/offline/api-cache";
import { clearToken, getToken } from "@/lib/session";
import type {
  AuthUser,
  Driver,
  DriverInput,
  DriverList,
  ItemInput,
  ItemList,
  LoginResult,
  MovementInput,
  MovementList,
  MovementResult,
  ExportSlip,
  ProposalSlip,
  ElectricProposal,
  OfficeProposal,
  WeldProposal,
  AdvanceProposal,
  PaymentRequest,
  ViettelProposal,
  UtilityProposal,
  RentalProposal,
  OngDiaProposal,
  PhucVinhProposal,
  TireProposal,
  Tire,
  TireList,
  TireEvent,
  TireMountInput,
  TireMoveInput,
  WarehouseItem,
  OilList,
  OilVehicle,
  OilKind,
  OilEvent,
} from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8018";

export class NetworkError extends Error {
  constructor() {
    super("Không kết nối được máy chủ.");
    this.name = "NetworkError";
  }
}

export function mediaUrl(path: string) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

async function readData<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && getToken()) {
    clearToken();
    window.dispatchEvent(new Event("kho-unauthorized"));
  }
  if (!response.ok) {
    throw new Error(body.message || "Yêu cầu thất bại");
  }
  return body.data as T;
}

function rememberGet(url: string, response: Response) {
  if (!response.ok || response.headers.get("X-Kho-Cache") === "1") return;
  const copy = response.clone();
  void copy
    .json()
    .then((body) => {
      if (!body || !("data" in body)) return;
      return writeApiCache(url, body.data);
    })
    .catch(() => undefined);
}

async function cachedGetResponse(url: string) {
  const cached = await readApiCache(url);
  if (!cached) return null;
  emitOfflineCacheHit(cached.savedAt);
  return new Response(JSON.stringify({ data: cached.data }), {
    status: 200,
    headers: { "Content-Type": "application/json", "X-Kho-Cache": "1" },
  });
}

async function authorizedFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const method = (init.method || "GET").toUpperCase();
  try {
    const response = await fetch(url, { ...init, headers, cache: "no-store" });
    if (method === "GET") rememberGet(url, response);
    return response;
  } catch {
    if (method === "GET") {
      const cached = await cachedGetResponse(url);
      if (cached) return cached;
    }
    throw new NetworkError();
  }
}

function toFormData(input: ItemInput) {
  const form = new FormData();
  form.append("name", input.name);
  if (input.quantity != null) form.append("quantity", String(input.quantity));
  form.append("unit", input.unit);
  if (input.column != null) form.append("column", String(input.column));
  if (input.image) form.append("image", input.image);
  return form;
}

export async function listItems(
  params: { q?: string; column?: string; stock?: string; unit?: string; qtyMin?: string; qtyMax?: string; page?: number; limit?: number } = {}
) {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 10));
  search.set("page", String(params.page ?? 1));
  if (params.q) search.set("q", params.q);
  if (params.column) search.set("column", params.column);
  if (params.stock) search.set("stock", params.stock);
  if (params.unit) search.set("unit", params.unit);
  if (params.qtyMin) search.set("qtyMin", params.qtyMin);
  if (params.qtyMax) search.set("qtyMax", params.qtyMax);

  const response = await authorizedFetch(`${API_URL}/api/v1/items?${search.toString()}`);
  return readData<ItemList>(response);
}

export async function createItem(input: ItemInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/items`, {
    method: "POST",
    body: toFormData(input),
  });
  return readData<WarehouseItem>(response);
}

export async function updateItem(id: string, input: ItemInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/items/${id}`, {
    method: "PUT",
    body: toFormData(input),
  });
  return readData<WarehouseItem>(response);
}

export async function deleteItem(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/items/${id}`, {
    method: "DELETE",
  });
  return readData<{ id: string }>(response);
}

export async function listMovements(
  params: {
    q?: string;
    type?: string;
    from?: string;
    to?: string;
    itemId?: string;
    unassigned?: boolean;
    includeSlip?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 20));
  search.set("page", String(params.page ?? 1));
  if (params.q) search.set("q", params.q);
  if (params.type) search.set("type", params.type);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.itemId) search.set("itemId", params.itemId);
  if (params.unassigned) search.set("unassigned", "1");
  if (params.includeSlip) search.set("includeSlip", params.includeSlip);

  const response = await authorizedFetch(`${API_URL}/api/v1/movements?${search.toString()}`);
  return readData<MovementList>(response);
}

export type ExportSlipInput = {
  requester: string;
  driverId: string;
  driverName: string;
  plate: string;
  mooc: string;
  km: number;
  lines: { movementId: string; itemName: string; unit: string; quantity: number; note: string }[];
};

export async function listExportSlips() {
  const response = await authorizedFetch(`${API_URL}/api/v1/slips`);
  return readData<ExportSlip[]>(response);
}

export async function getExportSlip(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/slips/${id}`);
  return readData<ExportSlip>(response);
}

export async function createExportSlip(input: ExportSlipInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/slips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export type ProposalInput = {
  reportDate: string;
  content: string;
  lines: { date: string; itemName: string; unit: string; quantity: number; price: number; note: string }[];
};

export async function listProposals() {
  const response = await authorizedFetch(`${API_URL}/api/v1/proposals`);
  return readData<ProposalSlip[]>(response);
}

export async function getProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/proposals/${id}`);
  return readData<ProposalSlip>(response);
}

export async function createProposal(input: ProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export type TireProposalInput = {
  reportDate: string;
  subject: string;
  content: string;
  lines: { date: string; plate: string; itemName: string; unit: string; quantity: number; price: number; note: string }[];
};

export async function listTireProposals() {
  const response = await authorizedFetch(`${API_URL}/api/v1/tire-proposals`);
  return readData<TireProposal[]>(response);
}

export async function getTireProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/tire-proposals/${id}`);
  return readData<TireProposal>(response);
}

export async function createTireProposal(input: TireProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/tire-proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function updateTireProposal(id: string, input: TireProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/tire-proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export type ElectricProposalInput = {
  reportDate: string;
  subject: string;
  content: string;
  lines: { date: string; plate: string; itemName: string; unit: string; quantity: number; price: number; note: string }[];
};

export async function listElectricProposals() {
  const response = await authorizedFetch(`${API_URL}/api/v1/electric-proposals`);
  return readData<ElectricProposal[]>(response);
}

export async function getElectricProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/electric-proposals/${id}`);
  return readData<ElectricProposal>(response);
}

export async function createElectricProposal(input: ElectricProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/electric-proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function updateElectricProposal(id: string, input: ElectricProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/electric-proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export type PhucVinhProposalInput = {
  reportDate: string;
  subject: string;
  content: string;
  lines: { itemName: string; unit: string; quantity: number; price: number | null; stock: number | null; supplier: string; receiver: string }[];
};

export async function listPhucVinhProposals() {
  const response = await authorizedFetch(`${API_URL}/api/v1/phuc-vinh-proposals`);
  return readData<PhucVinhProposal[]>(response);
}

export async function getPhucVinhProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/phuc-vinh-proposals/${id}`);
  return readData<PhucVinhProposal>(response);
}

export async function createPhucVinhProposal(input: PhucVinhProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/phuc-vinh-proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function updatePhucVinhProposal(id: string, input: PhucVinhProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/phuc-vinh-proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export type OfficeProposalInput = {
  reportDate: string;
  subject: string;
  content: string;
  lines: { date: string; itemName: string; unit: string; quantity: number; price: number; note: string }[];
};

export async function listOfficeProposals() {
  const response = await authorizedFetch(`${API_URL}/api/v1/office-proposals`);
  return readData<OfficeProposal[]>(response);
}

export async function getOfficeProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/office-proposals/${id}`);
  return readData<OfficeProposal>(response);
}

export async function createOfficeProposal(input: OfficeProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/office-proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function updateOfficeProposal(id: string, input: OfficeProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/office-proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export type RentalProposalInput = {
  reportDate: string;
  subject: string;
  content: string;
  lines: { date: string; itemName: string; unit: string; quantity: number; price: number; note: string }[];
};

export async function listRentalProposals() {
  const response = await authorizedFetch(`${API_URL}/api/v1/rental-proposals`);
  return readData<RentalProposal[]>(response);
}

export async function getRentalProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/rental-proposals/${id}`);
  return readData<RentalProposal>(response);
}

export async function createRentalProposal(input: RentalProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/rental-proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function updateRentalProposal(id: string, input: RentalProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/rental-proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function deleteRentalProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/rental-proposals/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export type OngDiaProposalInput = {
  reportDate: string;
  subject: string;
  content: string;
  lines: { itemName: string; unit: string; quantity: number; price: number; note: string }[];
};

export async function listOngDiaProposals() {
  const response = await authorizedFetch(`${API_URL}/api/v1/ong-dia-proposals`);
  return readData<OngDiaProposal[]>(response);
}

export async function getOngDiaProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/ong-dia-proposals/${id}`);
  return readData<OngDiaProposal>(response);
}

export async function createOngDiaProposal(input: OngDiaProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/ong-dia-proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function updateOngDiaProposal(id: string, input: OngDiaProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/ong-dia-proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function deleteOngDiaProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/ong-dia-proposals/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export type AdvanceProposalInput = {
  reportDate: string;
  fullName: string;
  department: string;
  content: string;
  amount: number;
  amountWords: string;
  bankAccount: string;
};

export async function listAdvanceProposals() {
  const response = await authorizedFetch(`${API_URL}/api/v1/advance-proposals`);
  return readData<AdvanceProposal[]>(response);
}

export async function getAdvanceProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/advance-proposals/${id}`);
  return readData<AdvanceProposal>(response);
}

export async function createAdvanceProposal(input: AdvanceProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/advance-proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function updateAdvanceProposal(id: string, input: AdvanceProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/advance-proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function deleteAdvanceProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/advance-proposals/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export type PaymentRequestInput = AdvanceProposalInput;

export async function listPaymentRequests() {
  const response = await authorizedFetch(`${API_URL}/api/v1/payment-requests`);
  return readData<PaymentRequest[]>(response);
}

export async function getPaymentRequest(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/payment-requests/${id}`);
  return readData<PaymentRequest>(response);
}

export async function createPaymentRequest(input: PaymentRequestInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/payment-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function updatePaymentRequest(id: string, input: PaymentRequestInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/payment-requests/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function deletePaymentRequest(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/payment-requests/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export type WeldProposalInput = {
  reportDate: string;
  subject: string;
  content: string;
  lines: { date: string; itemName: string; unit: string; quantity: number; price: number; note: string }[];
};

export async function listWeldProposals() {
  const response = await authorizedFetch(`${API_URL}/api/v1/weld-proposals`);
  return readData<WeldProposal[]>(response);
}

export async function getWeldProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/weld-proposals/${id}`);
  return readData<WeldProposal>(response);
}

export async function createWeldProposal(input: WeldProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/weld-proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function updateWeldProposal(id: string, input: WeldProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/weld-proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function deleteWeldProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/weld-proposals/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export type ViettelProposalInput = {
  reportDate: string;
  subject: string;
  content: string;
  lines: { date: string; receiver: string; fee: number; note: string }[];
};

export async function listViettelProposals() {
  const response = await authorizedFetch(`${API_URL}/api/v1/viettel-proposals`);
  return readData<ViettelProposal[]>(response);
}

export async function getViettelProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/viettel-proposals/${id}`);
  return readData<ViettelProposal>(response);
}

export async function createViettelProposal(input: ViettelProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/viettel-proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function updateViettelProposal(id: string, input: ViettelProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/viettel-proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function deleteViettelProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/viettel-proposals/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export type UtilityProposalInput = {
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
};

export async function listUtilityProposals() {
  const response = await authorizedFetch(`${API_URL}/api/v1/utility-proposals`);
  return readData<UtilityProposal[]>(response);
}

export async function getUtilityProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/utility-proposals/${id}`);
  return readData<UtilityProposal>(response);
}

export async function createUtilityProposal(input: UtilityProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/utility-proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function updateUtilityProposal(id: string, input: UtilityProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/utility-proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function deleteUtilityProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/utility-proposals/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export async function deleteOfficeProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/office-proposals/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export async function deletePhucVinhProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/phuc-vinh-proposals/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export async function deleteElectricProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/electric-proposals/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export async function deleteTireProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/tire-proposals/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export async function deleteProposal(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/proposals/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export async function updateProposal(id: string, input: ProposalInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/proposals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function deleteExportSlip(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/slips/${id}`, { method: "DELETE" });
  return readData<{ id: string }>(response);
}

export async function updateExportSlip(id: string, input: ExportSlipInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/slips/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<{ id: string }>(response);
}

export async function createMovement(itemId: string, input: MovementInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/movements/items/${itemId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<MovementResult>(response);
}

export async function login(username: string, password: string) {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  return readData<LoginResult>(response);
}

export async function listTires(
  params: { q?: string; kind?: string; plate?: string; page?: number; limit?: number } = {}
) {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 50));
  search.set("page", String(params.page ?? 1));
  if (params.q) search.set("q", params.q);
  if (params.kind) search.set("kind", params.kind);
  if (params.plate) search.set("plate", params.plate);
  const response = await authorizedFetch(`${API_URL}/api/v1/tires?${search.toString()}`);
  return readData<TireList>(response);
}

export async function getTire(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/tires/${id}`);
  return readData<{ tire: Tire; events: TireEvent[] }>(response);
}

export async function mountTires(input: TireMountInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/tires/mount`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<Tire[]>(response);
}

export async function correctTire(id: string, input: { serial: string; brand: string; wear: number }) {
  const response = await authorizedFetch(`${API_URL}/api/v1/tires/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<Tire>(response);
}

export async function moveTire(id: string, input: TireMoveInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/tires/${id}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<Tire>(response);
}

export async function listOils() {
  const response = await authorizedFetch(`${API_URL}/api/v1/oils`);
  return readData<OilList>(response);
}

export async function getOil(driverId: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/oils/${driverId}`);
  return readData<{ vehicle: OilVehicle; events: OilEvent[] }>(response);
}

export async function setOilKm(driverId: string, input: { km: number; date: string }) {
  const response = await authorizedFetch(`${API_URL}/api/v1/oils/${driverId}/km`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<OilVehicle>(response);
}

export async function recordOilChange(
  driverId: string,
  input: { kind: OilKind; km: number; date: string; note: string }
) {
  const response = await authorizedFetch(`${API_URL}/api/v1/oils/${driverId}/changes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<OilVehicle>(response);
}

export async function listDrivers(
  params: { q?: string; page?: number; limit?: number } = {}
) {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 20));
  search.set("page", String(params.page ?? 1));
  if (params.q) search.set("q", params.q);
  const response = await authorizedFetch(`${API_URL}/api/v1/drivers?${search.toString()}`);
  return readData<DriverList>(response);
}

export async function createDriver(input: DriverInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/drivers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<Driver>(response);
}

export async function updateDriver(id: string, input: DriverInput) {
  const response = await authorizedFetch(`${API_URL}/api/v1/drivers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readData<Driver>(response);
}

export async function deleteDriver(id: string) {
  const response = await authorizedFetch(`${API_URL}/api/v1/drivers/${id}`, {
    method: "DELETE",
  });
  return readData<{ id: string }>(response);
}

export async function currentUser() {
  const response = await authorizedFetch(`${API_URL}/api/v1/auth/me`);
  return readData<AuthUser>(response);
}
