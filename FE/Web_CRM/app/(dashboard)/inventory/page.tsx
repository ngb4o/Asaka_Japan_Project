"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ImageIcon,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import {
  FilterDrawer,
  FilterOptionList,
  FilterTrigger,
} from "@/components/ui/filter-drawer";
import { EmptyState } from "@/components/ui/empty-state";
import {
  InventoryFinanceFilterDrawer,
  InventoryFinanceFilterTrigger,
  InventoryFinanceProvider,
  InventoryFinanceReport,
} from "@/components/inventory/InventoryFinancePanel";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pagination } from "@/components/ui/pagination";
import { MobileInfiniteList } from "@/components/ui/mobile-infinite-list";
import {
  MobileMediaCard,
  MobileMetaChip,
  MobileRecordCard,
} from "@/components/ui/mobile-record-card";
import { PAGE_SKELETONS, PageSkeleton } from "@/components/ui/page-skeleton";
import { PreviewableImage } from "@/components/ui/previewable-image";
import { LocationCapture, type GeoLocationValue } from "@/components/trips/LocationCapture";
import {
  SearchableSelect,
  STATUS_OPTIONS,
} from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  canManageStockMovements,
  canViewInventoryValue,
  rolesOf,
} from "@/lib/auth/permissions";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { TabSwitcher } from "@/components/ui/tab-switcher";
import {
  exportStock,
  getInventoryStockValuation,
  getInventoryTransactions,
  getWarehouseStocks,
  importStock,
} from "@/lib/api/inventory";
import { getProduct, getProducts } from "@/lib/api/products";
import {
  createWarehouse,
  deleteWarehouse,
  getWarehouses,
  updateWarehouse,
} from "@/lib/api/warehouses";
import { getSuppliers } from "@/lib/api/suppliers";
import { DateInput } from "@/components/ui/date-input";
import { printInventoryTransaction } from "@/lib/print/inventorySlip";
import type {
  InventoryStockValuation,
  InventoryTransaction,
  Product,
  Supplier,
  Warehouse,
  WarehouseStock,
} from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import { useDeferredFilters } from "@/lib/hooks/useDeferredFilters";
import { useDeepLinkOpen } from "@/lib/hooks/useDeepLinkOpen";
import {
  formatMovementQuantity,
  formatStockDisplay,
  getMovementQuantityParts,
  getStockDisplayParts,
  toUnitsPerCase,
} from "@/lib/inventoryUnits";
import { statusBadgeVariant } from "@/lib/status-badge";
import { cn, formatCurrency } from "@/lib/utils";
import { VndInput } from "@/components/ui/vnd-input";
import {
  buildInventoryMovementPayload,
  buildWarehousePayload,
  validateInventoryMovementForm,
  validateWarehouseForm,
  type InventoryMovementFormValues,
  type WarehouseFormValues,
} from "@/lib/validation/payloads";

const EMPTY_MOVEMENT_FORM: InventoryMovementFormValues = {
  warehouseId: "",
  productId: "",
  quantity: "",
  unitType: "chai",
  unitCost: "",
  supplierId: "",
  dueDate: "",
  paymentStatus: "unpaid",
  note: "",
};

function suggestUnitCost(
  product: Product | undefined,
  unitType: "chai" | "thung"
): number | "" {
  if (!product) return "";
  const cost = Number(product.costPrice) || 0;
  if (cost <= 0) return "";
  if (unitType === "thung") {
    return Math.round(cost * toUnitsPerCase(product.unitsPerCase) * 100) / 100;
  }
  return cost;
}

const EMPTY_WAREHOUSE_FORM: WarehouseFormValues = {
  name: "",
  code: "",
  address: "",
  lat: null,
  lng: null,
  note: "",
  status: "active",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function formatDateLines(value: string) {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("vi-VN"),
    time: date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

const EMPTY_HISTORY_FILTERS = { warehouseId: "", type: "" };

export default function InventoryPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const isMobile = useIsMobile();
  const isAdmin = Boolean(user && rolesOf(user).includes("admin"));
  const userRoles = rolesOf(user);
  const canMoveStock = canManageStockMovements(userRoles);
  const canViewValue = canViewInventoryValue(userRoles);

  const mobileTabs = (() => {
    const tabs: string[] = [];
    if (isAdmin) tabs.push("Kho");
    tabs.push("Tồn kho");
    tabs.push("Lịch sử");
    return tabs;
  })();
  const warehouseTabIndex = isAdmin ? 0 : -1;
  const stockTabIndex = isAdmin ? 1 : 0;
  const historyTabIndex = isAdmin ? 2 : 1;
  const [mobileTab, setMobileTab] = useState(stockTabIndex >= 0 ? stockTabIndex : 0);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [search, setSearch] = useState("");
  const historyFilters = useDeferredFilters(EMPTY_HISTORY_FILTERS);
  const [movementType, setMovementType] = useState<"import" | "export" | null>(null);
  const [movementForm, setMovementForm] = useState<InventoryMovementFormValues>(
    EMPTY_MOVEMENT_FORM
  );
  const [submitting, setSubmitting] = useState(false);

  // Warehouse management
  const [warehouseSectionOpen, setWarehouseSectionOpen] = useState(false);
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseForm, setWarehouseForm] = useState<WarehouseFormValues>(EMPTY_WAREHOUSE_FORM);
  const [warehouseSubmitting, setWarehouseSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [printId, setPrintId] = useState<string | null>(null);
  const [valuation, setValuation] = useState<InventoryStockValuation | null>(
    null
  );
  const [masterReady, setMasterReady] = useState(false);

  useEffect(() => {
    setMobileTab((prev) => {
      const max = mobileTabs.length - 1;
      if (prev > max) return stockTabIndex >= 0 ? stockTabIndex : 0;
      return prev;
    });
  }, [isAdmin, mobileTabs.length, stockTabIndex]);

  useDeepLinkOpen(async (id) => {
    try {
      const product = await getProduct(id);
      setSearch(product.name || "");
      setMobileTab(stockTabIndex >= 0 ? stockTabIndex : 0);
      toast.success(`Đang lọc: ${product.name}`);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : "Không tìm thấy sản phẩm"
      );
      throw err;
    }
  });

  const activeWarehouses = warehouses.filter((item) => item.status === "active");
  const showWarehousePanel = !isMobile || mobileTab === warehouseTabIndex;
  const showStockPanel = !isMobile || mobileTab === stockTabIndex;
  const showHistoryPanel = !isMobile || mobileTab === historyTabIndex;
  const warehousePanelOpen = isMobile || warehouseSectionOpen;

  const loadValuation = useCallback(async () => {
    if (!canViewValue) {
      setValuation(null);
      return;
    }
    try {
      const data = await getInventoryStockValuation({
        warehouseId: warehouseFilter || undefined,
      });
      setValuation(data);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : "Không tải được vốn tồn kho"
      );
    }
  }, [canViewValue, warehouseFilter, toast]);

  useEffect(() => {
    void loadValuation();
  }, [loadValuation]);

  const onError = useCallback(
    (err: unknown) => {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được dữ liệu"
      );
    },
    [toast]
  );

  const fetchStocksPage = useCallback(
    (pageNum: number) =>
      getWarehouseStocks({
        warehouseId: warehouseFilter || undefined,
        search: search || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [warehouseFilter, search]
  );

  const fetchTransactionsPage = useCallback(
    (pageNum: number) =>
      getInventoryTransactions({
        warehouseId: historyFilters.applied.warehouseId || undefined,
        type:
          (historyFilters.applied.type as "import" | "export") || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [historyFilters.applied.warehouseId, historyFilters.applied.type]
  );

  const {
    items: stocks,
    page: stockPage,
    total: stockTotal,
    totalPages: stockTotalPages,
    loading: stockLoading,
    loadingMore: stockLoadingMore,
    hasMore: stockHasMore,
    reload: reloadStocks,
    refresh: refreshStocks,
    loadMore: loadMoreStocks,
    goToPage: goToStockPage,
  } = useMobilePagedList<WarehouseStock>({
    fetchPage: fetchStocksPage,
    onError,
  });

  const {
    items: transactions,
    page: transactionPage,
    total: transactionTotal,
    totalPages: transactionTotalPages,
    loading: transactionLoading,
    loadingMore: transactionLoadingMore,
    hasMore: transactionHasMore,
    reload: reloadTransactions,
    refresh: refreshTransactions,
    loadMore: loadMoreTransactions,
    goToPage: goToTransactionPage,
  } = useMobilePagedList<InventoryTransaction>({
    fetchPage: fetchTransactionsPage,
    onError,
  });

  const loadMasterData = useCallback(async () => {
    try {
      const [warehousesResult, productsResult, suppliersResult] =
        await Promise.all([
          getWarehouses({ limit: 100, page: 1 }),
          getProducts({ limit: 100, page: 1, status: "active" }),
          getSuppliers({ limit: 100, page: 1, status: "active" }),
        ]);
      setWarehouses(warehousesResult.items);
      setProducts(productsResult.items);
      setSuppliers(suppliersResult.items);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được dữ liệu"
      );
    } finally {
      setMasterReady(true);
    }
  }, [toast]);

  useEffect(() => {
    void loadMasterData();
  }, [loadMasterData]);

  // ── Warehouse CRUD ──

  function openCreateWarehouse() {
    setEditingWarehouse(null);
    setWarehouseForm(EMPTY_WAREHOUSE_FORM);
    setWarehouseDialogOpen(true);
  }

  function openEditWarehouse(item: Warehouse) {
    setEditingWarehouse(item);
    setWarehouseForm({
      name: item.name,
      code: item.code,
      address: item.address,
      lat: item.lat ?? null,
      lng: item.lng ?? null,
      note: item.note,
      status: item.status,
    });
    setWarehouseDialogOpen(true);
  }

  async function handleWarehouseSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationError = validateWarehouseForm(warehouseForm);
    if (validationError) {
      toast.warning(validationError);
      return;
    }

    setWarehouseSubmitting(true);

    try {
      const payload = buildWarehousePayload(warehouseForm);

      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, payload);
        toast.success("Đã cập nhật kho");
      } else {
        await createWarehouse(payload);
        toast.success("Đã thêm kho");
      }
      setWarehouseDialogOpen(false);
      await loadMasterData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Lưu thất bại");
    } finally {
      setWarehouseSubmitting(false);
    }
  }

  async function handleQuickWarehouseStatus(
    item: Warehouse,
    status: Warehouse["status"]
  ) {
    if (status === item.status) return;

    setActionId(`status:${item.id}`);
    setWarehouses((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, status } : row))
    );

    try {
      await updateWarehouse(item.id, {
        name: item.name,
        code: item.code,
        address: item.address,
        note: item.note,
        status,
      });
      toast.success("Đã cập nhật trạng thái kho");
    } catch (err) {
      setWarehouses((prev) =>
        prev.map((row) => (row.id === item.id ? item : row))
      );
      toast.error(
        err instanceof ApiClientError ? err.message : "Cập nhật thất bại"
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleDeleteWarehouse(item: Warehouse) {
    const confirmed = await confirm({
      title: "Xóa kho",
      description: `Bạn có chắc muốn xóa "${item.name}"? Hành động này không thể hoàn tác.`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    setActionId(item.id);
    try {
      await deleteWarehouse(item.id);
      toast.success(`Đã xóa kho "${item.name}"`);
      await loadMasterData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
    } finally {
      setActionId(null);
    }
  }

  useEffect(() => {
    void reloadStocks();
    // Reload when filter query changes (fetchPage identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStocksPage]);

  useEffect(() => {
    void reloadTransactions();
    // Reload when filter query changes (fetchPage identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTransactionsPage]);

  function openMovement(type: "import" | "export") {
    if (!canMoveStock) {
      toast.warning("Chỉ quản trị hoặc kho được nhập/xuất kho.");
      return;
    }
    if (activeWarehouses.length === 0) {
      toast.warning("Vui lòng tạo ít nhất một kho đang hoạt động trước.");
      return;
    }

    if (products.length === 0) {
      toast.warning("Vui lòng tạo ít nhất một sản phẩm trước.");
      return;
    }

    setMovementType(type);
    const firstProduct = products[0];
    setMovementForm({
      warehouseId: activeWarehouses.length === 1 ? activeWarehouses[0].id : "",
      productId: firstProduct?.id || "",
      quantity: "",
      unitType: "chai",
      unitCost: type === "import" ? suggestUnitCost(firstProduct, "chai") : "",
      supplierId: "",
      dueDate: "",
      paymentStatus: "unpaid",
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

  async function handlePrintTransaction(item: InventoryTransaction) {
    setPrintId(item.id);
    try {
      printInventoryTransaction(item, {
        showCost: canViewValue,
        quantityLabel: formatMovementQuantity(
          item.quantity,
          item.unitType,
          item.quantityBase,
          item.unitsPerCase
        ),
        balanceAfterLabel: formatStockDisplay(
          item.balanceAfter,
          item.unitsPerCase
        ),
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Không in được phiếu kho"
      );
    } finally {
      setPrintId(null);
    }
  }

  async function handleMovementSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!movementType) return;
    if (!canMoveStock) {
      toast.warning("Chỉ quản trị hoặc kho được nhập/xuất kho.");
      return;
    }

    const validationError = validateInventoryMovementForm(
      movementForm,
      movementType
    );
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
      await Promise.all([
        reloadStocks(),
        reloadTransactions(),
        loadValuation(),
      ]);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Thao tác thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  if (
    !masterReady ||
    (stockLoading && stocks.length === 0) ||
    (transactionLoading && transactions.length === 0)
  ) {
    return <PageSkeleton {...PAGE_SKELETONS.inventory} />;
  }

  return (
    <div className="space-y-0 md:space-y-6">
      <PageHeader
        title="Kho hàng"
        description={
          canMoveStock
            ? "Quản lý kho, nhập xuất và theo dõi tồn kho"
            : "Xem tồn kho và lịch sử (nhập/xuất do kho phụ trách)"
        }
        actions={
          canMoveStock ? (
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
          ) : null
        }
        fab={
          canMoveStock
            ? [
                {
                  onClick: () => openMovement("import"),
                  label: "Nhập kho",
                  icon: <ArrowDownToLine className="h-5 w-5" />,
                },
                {
                  onClick: () => openMovement("export"),
                  label: "Xuất kho",
                  icon: <ArrowUpFromLine className="h-5 w-5" />,
                },
              ]
            : null
        }
      />

      {activeWarehouses.length === 0 && (
        <p className="px-3 text-sm text-amber-700 md:px-0">
          Vui lòng tạo ít nhất một kho đang hoạt động trước khi nhập/xuất hàng.
        </p>
      )}

      <div className="sticky top-0 z-10 bg-[var(--color-surface-elevated)] px-3 py-2 md:hidden">
        <TabSwitcher
          tabs={[...mobileTabs]}
          selectedIndex={mobileTab}
          onTabSelected={setMobileTab}
        />
      </div>

      {/* ── Warehouse management (collapsible on desktop; tab on mobile) ── */}
      {isAdmin && showWarehousePanel && (
        <Card>
          <CardHeader
            className="hidden cursor-pointer select-none md:flex"
            onClick={() => setWarehouseSectionOpen((prev) => !prev)}>
            <div className="flex items-center justify-between">
              <CardTitle>Quản lý kho</CardTitle>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-[var(--color-text-inverse)] transition-transform",
                  warehouseSectionOpen && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
          {warehousePanelOpen && (
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={openCreateWarehouse}>
                  <Plus className="h-4 w-4" />
                  Thêm kho
                </Button>
              </div>

              {warehouses.length === 0 ? (
                <EmptyState title="Chưa có kho" />
              ) : (
                <>
                  {/* Mobile */}
                  <div className="flex flex-col gap-3 md:hidden">
                    {warehouses.map((item) => (
                      <MobileRecordCard key={item.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold tracking-tight text-[var(--color-text-primary)]">
                              {item.name}
                            </p>
                            <p className="mt-0.5 truncate text-sm text-[var(--color-text-inverse)]">
                              {item.code}
                            </p>
                          </div>
                          <Badge
                            variant={statusBadgeVariant(item.status)}
                            className="shrink-0">
                            {item.status === "active" ? "Hoạt động" : "Ngưng"}
                          </Badge>
                        </div>
                        {item.address ? (
                          <p className="mt-2 truncate text-xs text-[var(--color-text-inverse)]">
                            {item.address}
                          </p>
                        ) : null}
                        <div className="mt-2 flex justify-end gap-2">
                          <SearchableSelect
                            options={STATUS_OPTIONS.warehouse}
                            value={item.status}
                            onChange={(value) =>
                              void handleQuickWarehouseStatus(
                                item,
                                value as Warehouse["status"]
                              )
                            }
                            searchable={false}
                            placeholder="Đổi trạng thái"
                            disabled={actionId === `status:${item.id}`}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                title="Đổi trạng thái"
                                loading={actionId === `status:${item.id}`}>
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditWarehouse(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={actionId === item.id}
                            onClick={() => handleDeleteWarehouse(item)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </MobileRecordCard>
                    ))}
                  </div>

                  {/* Desktop */}
                  <div className="crm-table-scroll hidden md:block">
                    <div className="crm-table-frame">
                      <table className="crm-data-table min-w-[600px]">
                      <thead>
                        <tr>
                          <th className="font-medium">Tên kho</th>
                          <th className="font-medium">Mã</th>
                          <th className="font-medium">Địa chỉ</th>
                          <th className="font-medium">Trạng thái</th>
                          <th className="font-medium text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warehouses.map((item) => (
                          <tr key={item.id}>
                            <td className="font-medium">{item.name}</td>
                            <td className="text-[var(--color-text-inverse)]">{item.code}</td>
                            <td className="max-w-xs truncate text-[var(--color-text-inverse)]">
                              {item.address || "—"}
                            </td>
                            <td>
                              <div className="w-[140px]">
                                <SearchableSelect
                                  options={STATUS_OPTIONS.warehouse}
                                  value={item.status}
                                  onChange={(value) =>
                                    void handleQuickWarehouseStatus(
                                      item,
                                      value as Warehouse["status"]
                                    )
                                  }
                                  searchable={false}
                                  disabled={actionId === `status:${item.id}`}
                                  triggerClassName="h-8 text-xs"
                                />
                              </div>
                            </td>
                            <td>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditWarehouse(item)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  loading={actionId === item.id}
                                  onClick={() => handleDeleteWarehouse(item)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {showStockPanel && (
      <Card>
        <CardHeader>
          <CardTitle>Tồn hiện tại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canViewValue ? (
            <InventoryFinanceProvider
              warehouses={warehouses}
              onWarehouseIdChange={setWarehouseFilter}>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <SearchInput
                    placeholder="Tìm sản phẩm, SKU..."
                    value={search}
                    onSearch={setSearch}
                    className="min-w-0 flex-1"
                  />
                  <InventoryFinanceFilterTrigger />
                </div>
                <InventoryFinanceFilterDrawer />
                <InventoryFinanceReport />
              </div>
            </InventoryFinanceProvider>
          ) : (
            <div className="flex gap-2 md:grid md:grid-cols-2 md:gap-3">
              <SearchInput
                placeholder="Tìm sản phẩm, SKU..."
                value={search}
                onSearch={setSearch}
                className="min-w-0 flex-1"
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
                onChange={setWarehouseFilter}
                placeholder="Tất cả kho"
                searchPlaceholder="Tìm kho..."
                clearable
                className="w-[38%] shrink-0 md:w-full"
              />
            </div>
          )}

          {!stockLoading && stocks.length === 0 ? (
            <EmptyState title="Chưa có tồn kho" />
          ) : stocks.length === 0 ? null : (
            <div className="space-y-4">
              <MobileInfiniteList
                onRefresh={refreshStocks}
                onLoadMore={loadMoreStocks}
                hasMore={stockHasMore}
                loadingMore={stockLoadingMore}
                disabled={stockLoading}>
                <div className="flex flex-col gap-3">
                {stocks.map((item) => {
                  const thumb = item.productImage;
                  return (
                    <MobileMediaCard
                      key={item.id}
                      media={
                        thumb ? (
                          <PreviewableImage
                            src={thumb}
                            alt={item.productName || "Sản phẩm"}
                            fill
                            className="rounded-xl border-0"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[var(--color-text-inverse)]">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )
                      }
                      title={item.productName || "—"}
                      subtitle={item.productSku || undefined}
                      meta={
                        <>
                          <MobileMetaChip>
                            {
                              getStockDisplayParts(
                                item.quantity,
                                item.unitsPerCase
                              ).primary
                            }
                          </MobileMetaChip>
                          {canViewValue ? (
                            <MobileMetaChip>
                              Vốn {formatCurrency(item.stockValue || 0)}
                            </MobileMetaChip>
                          ) : null}
                          {item.warehouseName ? (
                            <MobileMetaChip>Kho: {item.warehouseName}</MobileMetaChip>
                          ) : null}
                          <MobileMetaChip>{formatDate(item.updatedAt)}</MobileMetaChip>
                        </>
                      }
                    />
                  );
                })}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden md:block">
                <div className="crm-table-frame">
                  <table className="crm-data-table min-w-[1080px]">
                  <thead>
                    <tr>
                      <th className="font-medium">Ảnh</th>
                      <th className="font-medium">Kho</th>
                      <th className="font-medium">Sản phẩm</th>
                      <th className="font-medium">SKU</th>
                      <th className="font-medium">Tồn kho</th>
                      {canViewValue ? (
                        <>
                          <th className="font-medium">Giá vốn/chai</th>
                          <th className="font-medium">Thành tiền</th>
                        </>
                      ) : null}
                      <th className="font-medium">Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((item) => {
                      const thumb = item.productImage;
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="relative h-11 w-11 overflow-hidden rounded-lg">
                              {thumb ? (
                                <PreviewableImage
                                  src={thumb}
                                  alt={item.productName || "Sản phẩm"}
                                  fill
                                  className="rounded-lg"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] text-[var(--color-text-inverse)]">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="font-medium">{item.warehouseName || "—"}</td>
                          <td>{item.productName || "—"}</td>
                          <td className="text-[var(--color-text-inverse)]">
                            {item.productSku || "—"}
                          </td>
                          <td className="font-medium">
                            {(() => {
                              const stock = getStockDisplayParts(
                                item.quantity,
                                item.unitsPerCase
                              );
                              return (
                                <span className="flex flex-col leading-tight">
                                  <span>{stock.primary}</span>
                                  {stock.secondary ? (
                                    <span className="text-xs text-[var(--color-text-inverse)]">
                                      ({stock.secondary})
                                    </span>
                                  ) : null}
                                </span>
                              );
                            })()}
                          </td>
                          {canViewValue ? (
                            <>
                              <td className="text-[var(--color-text-inverse)]">
                                {item.costPrice
                                  ? formatCurrency(item.costPrice)
                                  : "—"}
                              </td>
                              <td className="font-medium">
                                {formatCurrency(item.stockValue || 0)}
                              </td>
                            </>
                          ) : null}
                          <td className="text-[var(--color-text-inverse)]">
                            {formatDate(item.updatedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>

              <Pagination
                page={stockPage}
                totalPages={stockTotalPages}
                total={stockTotal}
                limit={DEFAULT_PAGE_SIZE}
                onPageChange={goToStockPage}
                disabled={stockLoading}
              />
            </div>
          )}

          {canViewValue && valuation ? (
            <div className="flex items-baseline justify-between gap-3 border-t border-[var(--color-border-subtle)] pt-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Vốn tồn kho
                </p>
              </div>
              <p className="text-lg font-semibold tabular-nums tracking-tight text-[var(--color-text-primary)]">
                {formatCurrency(valuation.totalValue)}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
      )}

      {showHistoryPanel && (
      <Card>
        <CardHeader
          showOnMobile
          className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Lịch sử nhập xuất</CardTitle>
          <FilterTrigger
            open={historyFilters.open}
            activeCount={historyFilters.appliedCount}
            onClick={() => historyFilters.setOpen(true)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterDrawer
            open={historyFilters.open}
            onOpenChange={historyFilters.setOpen}
            title="Bộ lọc lịch sử"
            onClear={historyFilters.clearDraft}
            onApply={historyFilters.apply}
            draftCount={historyFilters.draftCount}>
            <FilterOptionList
              label="Kho"
              value={historyFilters.draft.warehouseId}
              onChange={(value) =>
                historyFilters.setDraftValue("warehouseId", value)
              }
              searchable
              searchPlaceholder="Tìm kho..."
              options={[
                { value: "", label: "Tất cả kho" },
                ...warehouses.map((warehouse) => ({
                  value: warehouse.id,
                  label: warehouse.name,
                })),
              ]}
            />
            <FilterOptionList
              label="Loại phiếu"
              value={historyFilters.draft.type}
              onChange={(value) => historyFilters.setDraftValue("type", value)}
              options={[
                { value: "", label: "Tất cả loại" },
                ...STATUS_OPTIONS.inventoryTxn,
              ]}
            />
          </FilterDrawer>
          {!transactionLoading && transactions.length === 0 ? (
            <EmptyState title="Chưa có giao dịch" />
          ) : transactions.length === 0 ? null : (
            <div className="space-y-4">
              <MobileInfiniteList
                onRefresh={refreshTransactions}
                onLoadMore={loadMoreTransactions}
                hasMore={transactionHasMore}
                loadingMore={transactionLoadingMore}
                disabled={transactionLoading}>
                <div className="flex flex-col gap-3">
                {transactions.map((item) => {
                  const thumb = item.productImage;
                  return (
                    <MobileMediaCard
                      key={item.id}
                      media={
                        thumb ? (
                          <PreviewableImage
                            src={thumb}
                            alt={item.productName || "Sản phẩm"}
                            fill
                            className="rounded-xl border-0"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[var(--color-text-inverse)]">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )
                      }
                      title={item.productName || "—"}
                      badge={
                        <Badge
                          variant={statusBadgeVariant(item.type)}
                          className="shrink-0">
                          {item.type === "import" ? "Nhập" : "Xuất"}
                        </Badge>
                      }
                      meta={
                        <>
                          <MobileMetaChip>
                            {
                              getMovementQuantityParts(
                                item.quantity,
                                item.unitType,
                                item.quantityBase
                              ).primary
                            }
                          </MobileMetaChip>
                          {item.warehouseName ? (
                            <MobileMetaChip>{item.warehouseName}</MobileMetaChip>
                          ) : null}
                          <MobileMetaChip>
                            {formatDateLines(item.createdAt).date}
                          </MobileMetaChip>
                          {canViewValue && (item.totalCost || 0) > 0 ? (
                            <MobileMetaChip>
                              {formatCurrency(item.totalCost || 0)}
                            </MobileMetaChip>
                          ) : null}
                        </>
                      }
                      actions={
                        <Button
                          size="sm"
                          variant="outline"
                          title="In phiếu"
                          loading={printId === item.id}
                          onClick={() => void handlePrintTransaction(item)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                      }>
                      {item.note ? (
                        <p className="truncate text-xs text-[var(--color-text-inverse)]">
                          {item.note}
                        </p>
                      ) : null}
                    </MobileMediaCard>
                  );
                })}
                </div>
              </MobileInfiniteList>

              <div className="crm-table-scroll hidden md:block">
                <div className="crm-table-frame">
                  <table className="crm-data-table min-w-[820px]">
                  <thead>
                    <tr>
                      <th className="font-medium">Thời gian</th>
                      <th className="font-medium">Loại</th>
                      <th className="font-medium">Sản phẩm</th>
                      <th className="font-medium">Số lượng</th>
                      {canViewValue ? (
                        <th className="font-medium">Thành tiền</th>
                      ) : null}
                      <th className="font-medium">Ghi chú</th>
                      <th className="text-right font-medium">In</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((item) => {
                      const when = formatDateLines(item.createdAt);
                      const qty = getMovementQuantityParts(
                        item.quantity,
                        item.unitType,
                        item.quantityBase
                      );
                      return (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap text-[var(--color-text-inverse)]">
                          <span className="flex flex-col leading-tight">
                            <span>{when.date}</span>
                            <span className="text-xs">{when.time}</span>
                          </span>
                        </td>
                        <td>
                          <Badge variant={item.type === "import" ? "success" : "muted"}>
                            {item.type === "import" ? "Nhập" : "Xuất"}
                          </Badge>
                        </td>
                        <td className="min-w-0 max-w-[220px]">
                          <p className="truncate font-medium">
                            {item.productName || "—"}
                          </p>
                          {item.warehouseName ? (
                            <p className="truncate text-xs text-[var(--color-text-inverse)]">
                              {item.warehouseName}
                            </p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap">
                          <p className="font-medium leading-tight">{qty.primary}</p>
                          {qty.secondary ? (
                            <p className="text-xs leading-tight text-[var(--color-text-inverse)]">
                              ({qty.secondary})
                            </p>
                          ) : null}
                        </td>
                        {canViewValue ? (
                          <td className="whitespace-nowrap font-medium">
                            {(item.totalCost || 0) > 0
                              ? formatCurrency(item.totalCost || 0)
                              : "—"}
                          </td>
                        ) : null}
                        <td className="max-w-[160px] truncate text-[var(--color-text-inverse)]">
                          {item.note || "—"}
                        </td>
                        <td>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              title="In phiếu"
                              loading={printId === item.id}
                              onClick={() => void handlePrintTransaction(item)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>

              <Pagination
                page={transactionPage}
                totalPages={transactionTotalPages}
                total={transactionTotal}
                limit={DEFAULT_PAGE_SIZE}
                onPageChange={goToTransactionPage}
                disabled={transactionLoading}
              />
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* ── Warehouse dialog ── */}
      <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? "Sửa kho" : "Thêm kho"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWarehouseSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wh-name">Tên kho *</Label>
                <Input
                  id="wh-name"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-code">Mã kho</Label>
                <Input
                  id="wh-code"
                  placeholder="Tự sinh từ tên nếu để trống"
                  value={warehouseForm.code || ""}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-address">Địa chỉ</Label>
              <Input
                id="wh-address"
                value={warehouseForm.address || ""}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
              />
            </div>
            <LocationCapture
              label="GPS kho"
              value={
                typeof warehouseForm.lat === "number" &&
                typeof warehouseForm.lng === "number" &&
                Number.isFinite(warehouseForm.lat) &&
                Number.isFinite(warehouseForm.lng)
                  ? {
                      lat: warehouseForm.lat,
                      lng: warehouseForm.lng,
                      locationSource: "manual",
                    }
                  : null
              }
              onChange={(geo: GeoLocationValue | null) =>
                setWarehouseForm({
                  ...warehouseForm,
                  lat: geo?.lat ?? null,
                  lng: geo?.lng ?? null,
                })
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wh-status">Trạng thái</Label>
                <SearchableSelect
                  id="wh-status"
                  options={STATUS_OPTIONS.warehouse}
                  value={warehouseForm.status || "active"}
                  onChange={(next) =>
                    setWarehouseForm({
                      ...warehouseForm,
                      status: next as "active" | "inactive",
                    })
                  }
                  searchable={false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-note">Ghi chú</Label>
                <Input
                  id="wh-note"
                  value={warehouseForm.note || ""}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, note: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWarehouseDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={warehouseSubmitting}>
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Movement dialog ── */}
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
                  const nextUnitType =
                    movementForm.unitType === "thung" && !nextCanUseCase
                      ? "chai"
                      : movementForm.unitType;
                  setMovementForm({
                    ...movementForm,
                    productId: next,
                    unitType: nextUnitType,
                    unitCost:
                      movementType === "import"
                        ? suggestUnitCost(product, nextUnitType)
                        : "",
                  });
                }}
                placeholder="Chọn sản phẩm"
                searchPlaceholder="Tìm sản phẩm, SKU..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                  onChange={(next) => {
                    const unitType = next as "chai" | "thung";
                    setMovementForm({
                      ...movementForm,
                      unitType,
                      unitCost:
                        movementType === "import"
                          ? suggestUnitCost(selectedProduct, unitType)
                          : "",
                    });
                  }}
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
            {movementType === "import" ? (
              <div className="space-y-2">
                <Label htmlFor="unitCost">
                  Giá nhập / {movementForm.unitType === "thung" ? "thùng" : "chai"} *
                </Label>
                <VndInput
                  id="unitCost"
                  value={movementForm.unitCost ?? ""}
                  onValueChange={(unitCost) =>
                    setMovementForm({ ...movementForm, unitCost })
                  }
                />
                {movementForm.quantity !== "" &&
                movementForm.unitCost !== "" &&
                movementForm.unitCost !== undefined ? (
                  <p className="text-xs text-[var(--color-text-inverse)]">
                    Thành tiền nhập:{" "}
                    {formatCurrency(
                      Number(movementForm.quantity) * Number(movementForm.unitCost)
                    )}
                    . Giá vốn SP cập nhật theo bình quân gia quyền.
                  </p>
                ) : (
                  <p className="text-xs text-[var(--color-text-inverse)]">
                    Bắt buộc để tính vốn tồn kho. Mặc định lấy giá vốn hiện tại của SP.
                  </p>
                )}
              </div>
            ) : null}
            {movementType === "import" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nhà cung cấp</Label>
                  <SearchableSelect
                    options={[
                      { value: "", label: "Không gắn NCC" },
                      ...suppliers.map((supplier) => ({
                        value: supplier.id,
                        label: supplier.name,
                        description: supplier.phone,
                      })),
                    ]}
                    value={movementForm.supplierId || ""}
                    onChange={(supplierId) =>
                      setMovementForm({
                        ...movementForm,
                        supplierId,
                        paymentStatus: supplierId
                          ? movementForm.paymentStatus || "unpaid"
                          : "unpaid",
                        dueDate: supplierId ? movementForm.dueDate : "",
                      })
                    }
                    placeholder="Không gắn NCC"
                    searchPlaceholder="Tìm NCC..."
                    clearable
                  />
                  <p className="text-xs text-[var(--color-text-inverse)]">
                    Gắn NCC sẽ tạo phiếu nhập mua (công nợ hoặc đã thanh toán).
                  </p>
                </div>
                {movementForm.supplierId ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Thanh toán NCC *</Label>
                      <SearchableSelect
                        options={[
                          { value: "unpaid", label: "Chưa thanh toán" },
                          { value: "paid", label: "Đã thanh toán" },
                        ]}
                        value={movementForm.paymentStatus || "unpaid"}
                        onChange={(paymentStatus) =>
                          setMovementForm({
                            ...movementForm,
                            paymentStatus: paymentStatus as "unpaid" | "paid",
                            dueDate:
                              paymentStatus === "paid"
                                ? ""
                                : movementForm.dueDate,
                          })
                        }
                        searchable={false}
                      />
                    </div>
                    {movementForm.paymentStatus !== "paid" ? (
                      <div className="space-y-2">
                        <Label>Hạn thanh toán</Label>
                        <DateInput
                          value={movementForm.dueDate || ""}
                          onChange={(dueDate) =>
                            setMovementForm({ ...movementForm, dueDate })
                          }
                          clearable
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Trạng thái phiếu</Label>
                        <p className="flex h-10 items-center text-sm text-[var(--color-text-inverse)]">
                          Phiếu nhập mua sẽ ghi đã trả đủ.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeMovement}>
                Hủy
              </Button>
              <Button type="submit" loading={submitting}>
                {movementType === "import" ? "Nhập kho" : "Xuất kho"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
