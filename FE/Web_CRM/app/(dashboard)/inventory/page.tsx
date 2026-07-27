"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/components/providers/ToastProvider";
import {
  exportStock,
  getInventoryTransactions,
  getWarehouseStocks,
  importStock,
} from "@/lib/api/inventory";
import { getProducts } from "@/lib/api/products";
import { getWarehouses } from "@/lib/api/warehouses";
import type {
  InventoryTransaction,
  Product,
  Warehouse,
  WarehouseStock,
} from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE, shouldReloadPreviousPage } from "@/lib/pagination";
import {
  formatMovementQuantity,
  formatStockDisplay,
  toUnitsPerCase,
} from "@/lib/inventoryUnits";
import {
  buildInventoryMovementPayload,
  validateInventoryMovementForm,
  type InventoryMovementFormValues,
} from "@/lib/validation/payloads";

const EMPTY_MOVEMENT_FORM: InventoryMovementFormValues = {
  warehouseId: "",
  productId: "",
  quantity: "",
  unitType: "chai",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

export default function InventoryPage() {
  const toast = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<WarehouseStock[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [search, setSearch] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const [stockTotal, setStockTotal] = useState(0);
  const [stockTotalPages, setStockTotalPages] = useState(1);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionTotalPages, setTransactionTotalPages] = useState(1);
  const [movementType, setMovementType] = useState<"import" | "export" | null>(null);
  const [movementForm, setMovementForm] = useState<InventoryMovementFormValues>(
    EMPTY_MOVEMENT_FORM
  );
  const [submitting, setSubmitting] = useState(false);

  const activeWarehouses = warehouses.filter((item) => item.status === "active");

  const loadMasterData = useCallback(async () => {
    const [warehousesResult, productsResult] = await Promise.all([
      getWarehouses({ status: "active", limit: 100, page: 1 }),
      getProducts({ limit: 100, page: 1 }),
    ]);
    setWarehouses(warehousesResult.items);
    setProducts(productsResult.items);
  }, []);

  const loadStocks = useCallback(async () => {
    const result = await getWarehouseStocks({
      warehouseId: warehouseFilter || undefined,
      search: search || undefined,
      page: stockPage,
      limit: DEFAULT_PAGE_SIZE,
    });

    setStocks(result.items);
    if (shouldReloadPreviousPage(result, stockPage)) {
      setStockPage(result.totalPages);
      return;
    }
    setStockPage(result.page);
    setStockTotal(result.total);
    setStockTotalPages(result.totalPages);
  }, [warehouseFilter, search, stockPage]);

  const loadTransactions = useCallback(async () => {
    const result = await getInventoryTransactions({
      warehouseId: warehouseFilter || undefined,
      page: transactionPage,
      limit: DEFAULT_PAGE_SIZE,
    });

    setTransactions(result.items);
    if (shouldReloadPreviousPage(result, transactionPage)) {
      setTransactionPage(result.totalPages);
      return;
    }
    setTransactionPage(result.page);
    setTransactionTotal(result.total);
    setTransactionTotalPages(result.totalPages);
  }, [warehouseFilter, transactionPage]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await loadMasterData();
      await Promise.all([loadStocks(), loadTransactions()]);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được dữ liệu"
      );
    } finally {
      setLoading(false);
    }
  }, [loadMasterData, loadStocks, loadTransactions, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openMovement(type: "import" | "export") {
    if (activeWarehouses.length === 0) {
      toast.warning("Vui lòng tạo ít nhất một kho đang hoạt động trước.");
      return;
    }

    if (products.length === 0) {
      toast.warning("Vui lòng tạo ít nhất một sản phẩm trước.");
      return;
    }

    setMovementType(type);
    setMovementForm({
      warehouseId: activeWarehouses.length === 1 ? activeWarehouses[0].id : "",
      productId: products[0]?.id || "",
      quantity: "",
      unitType: "chai",
      note: "",
    });
  }

  const selectedProduct = products.find((item) => item.id === movementForm.productId);
  const selectedUnitsPerCase = toUnitsPerCase(selectedProduct?.unitsPerCase);
  const canUseCase = selectedUnitsPerCase > 1;

  function closeMovement() {
    setMovementType(null);
    setMovementForm(EMPTY_MOVEMENT_FORM);
  }

  async function handleMovementSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!movementType) return;

    const validationError = validateInventoryMovementForm(movementForm);
    if (validationError) {
      toast.warning(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const payload = buildInventoryMovementPayload(movementForm);

      if (movementType === "import") {
        await importStock(payload);
        toast.success("Đã nhập kho thành công");
      } else {
        await exportStock(payload);
        toast.success("Đã xuất kho thành công");
      }

      closeMovement();
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Thao tác thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && stocks.length === 0 && transactions.length === 0) {
    return <PageSkeleton {...PAGE_SKELETONS.inventory} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tồn kho"
        description="Quản lý nhập xuất và theo dõi tồn kho theo từng kho"
        actions={
          <>
            <Button onClick={() => openMovement("import")}>
              <ArrowDownToLine className="h-4 w-4" />
              Nhập kho
            </Button>
            <Button variant="outline" onClick={() => openMovement("export")}>
              <ArrowUpFromLine className="h-4 w-4" />
              Xuất kho
            </Button>
          </>
        }
      />

      {activeWarehouses.length === 0 && (
        <p className="text-sm text-amber-700">
          Vui lòng tạo ít nhất một kho đang hoạt động trước khi nhập/xuất hàng.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tồn hiện tại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Tìm theo tên sản phẩm, SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setStockPage(1);
              }}
            />
            <SearchableSelect
              options={[
                { value: "", label: "Tất cả kho" },
                ...warehouses.map((warehouse) => ({
                  value: warehouse.id,
                  label: warehouse.name,
                  description: warehouse.code,
                })),
              ]}
              value={warehouseFilter}
              onChange={(next) => {
                setWarehouseFilter(next);
                setStockPage(1);
                setTransactionPage(1);
              }}
              placeholder="Tất cả kho"
              searchPlaceholder="Tìm kho..."
              clearable
            />
          </div>

          {stocks.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có tồn kho</p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                      <th className="px-2 py-3 font-medium">Kho</th>
                      <th className="px-2 py-3 font-medium">Sản phẩm</th>
                      <th className="px-2 py-3 font-medium">SKU</th>
                      <th className="px-2 py-3 font-medium">Tồn kho</th>
                      <th className="px-2 py-3 font-medium">Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                        <td className="px-2 py-3 font-medium">{item.warehouseName || "—"}</td>
                        <td className="px-2 py-3">{item.productName || "—"}</td>
                        <td className="px-2 py-3 text-[var(--color-text-inverse)]">
                          {item.productSku || "—"}
                        </td>
                        <td className="px-2 py-3 font-medium">
                          {formatStockDisplay(item.quantity, item.unitsPerCase)}
                        </td>
                        <td className="px-2 py-3 text-[var(--color-text-inverse)]">
                          {formatDate(item.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={stockPage}
                totalPages={stockTotalPages}
                total={stockTotal}
                limit={DEFAULT_PAGE_SIZE}
                onPageChange={setStockPage}
                disabled={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử nhập xuất</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {transactions.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có giao dịch</p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                      <th className="px-2 py-3 font-medium">Thời gian</th>
                      <th className="px-2 py-3 font-medium">Loại</th>
                      <th className="px-2 py-3 font-medium">Kho</th>
                      <th className="px-2 py-3 font-medium">Sản phẩm</th>
                      <th className="px-2 py-3 font-medium">Số lượng</th>
                      <th className="px-2 py-3 font-medium">Tồn sau</th>
                      <th className="px-2 py-3 font-medium">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                        <td className="px-2 py-3 text-[var(--color-text-inverse)]">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-2 py-3">
                          <Badge variant={item.type === "import" ? "success" : "muted"}>
                            {item.type === "import" ? "Nhập" : "Xuất"}
                          </Badge>
                        </td>
                        <td className="px-2 py-3">{item.warehouseName || "—"}</td>
                        <td className="px-2 py-3">{item.productName || "—"}</td>
                        <td className="px-2 py-3 font-medium">
                          {formatMovementQuantity(
                            item.quantity,
                            item.unitType,
                            item.quantityBase,
                            item.unitsPerCase
                          )}
                        </td>
                        <td className="px-2 py-3">
                          {formatStockDisplay(item.balanceAfter, item.unitsPerCase)}
                        </td>
                        <td className="max-w-xs truncate px-2 py-3 text-[var(--color-text-inverse)]">
                          {item.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={transactionPage}
                totalPages={transactionTotalPages}
                total={transactionTotal}
                limit={DEFAULT_PAGE_SIZE}
                onPageChange={setTransactionPage}
                disabled={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={movementType !== null} onOpenChange={(open) => !open && closeMovement()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementType === "import" ? "Nhập kho" : "Xuất kho"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMovementSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="warehouseId">Kho *</Label>
              <SearchableSelect
                id="warehouseId"
                options={[
                  { value: "", label: "Chọn kho" },
                  ...activeWarehouses.map((warehouse) => ({
                    value: warehouse.id,
                    label: warehouse.name,
                    description: warehouse.code,
                  })),
                ]}
                value={movementForm.warehouseId}
                onChange={(next) =>
                  setMovementForm({ ...movementForm, warehouseId: next })
                }
                placeholder="Chọn kho"
                searchPlaceholder="Tìm kho..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productId">Sản phẩm *</Label>
              <SearchableSelect
                id="productId"
                options={[
                  { value: "", label: "Chọn sản phẩm" },
                  ...products.map((product) => ({
                    value: product.id,
                    label: product.name,
                    description: product.sku || undefined,
                  })),
                ]}
                value={movementForm.productId}
                onChange={(next) => {
                  const product = products.find((item) => item.id === next);
                  const nextCanUseCase = toUnitsPerCase(product?.unitsPerCase) > 1;
                  setMovementForm({
                    ...movementForm,
                    productId: next,
                    unitType:
                      movementForm.unitType === "thung" && !nextCanUseCase
                        ? "chai"
                        : movementForm.unitType,
                  });
                }}
                placeholder="Chọn sản phẩm"
                searchPlaceholder="Tìm sản phẩm, SKU..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="unitType">Đơn vị *</Label>
                <SearchableSelect
                  id="unitType"
                  options={[
                    { value: "chai", label: "Chai" },
                    ...(canUseCase
                      ? [
                          {
                            value: "thung",
                            label: "Thùng",
                            description: `1 thùng = ${selectedUnitsPerCase} chai`,
                          },
                        ]
                      : []),
                  ]}
                  value={movementForm.unitType}
                  onChange={(next) =>
                    setMovementForm({
                      ...movementForm,
                      unitType: next as "chai" | "thung",
                    })
                  }
                  placeholder="Chọn đơn vị"
                  searchPlaceholder="Tìm đơn vị..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Số lượng *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={movementForm.quantity}
                  onChange={(e) =>
                    setMovementForm({
                      ...movementForm,
                      quantity: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            {selectedProduct && (
              <p className="text-xs text-[var(--color-text-inverse)]">
                {canUseCase
                  ? `Quy cách: 1 thùng = ${selectedUnitsPerCase} chai. Tồn kho luôn lưu theo chai.`
                  : "Sản phẩm chưa cấu hình số chai/thùng — chỉ nhập/xuất theo chai."}
                {movementForm.unitType === "thung" &&
                  movementForm.quantity !== "" &&
                  ` → ${Number(movementForm.quantity) * selectedUnitsPerCase} chai.`}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                id="note"
                value={movementForm.note || ""}
                onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeMovement}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                {movementType === "import" ? "Nhập kho" : "Xuất kho"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
