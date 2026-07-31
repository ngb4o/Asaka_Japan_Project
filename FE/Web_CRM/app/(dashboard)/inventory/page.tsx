"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ImageIcon,
  Pencil,
  Plus,
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
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
import {
  SearchableSelect,
  STATUS_OPTIONS,
} from "@/components/ui/searchable-select";
import { PageHeader } from "@/components/layout/PageHeader";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getImageUrl } from "@/lib/api/uploads";
import {
  exportStock,
  getInventoryTransactions,
  getWarehouseStocks,
  importStock,
} from "@/lib/api/inventory";
import { getProducts } from "@/lib/api/products";
import {
  createWarehouse,
  deleteWarehouse,
  getWarehouses,
  updateWarehouse,
} from "@/lib/api/warehouses";
import type {
  InventoryTransaction,
  Product,
  Warehouse,
  WarehouseStock,
} from "@/lib/types";
import { ApiClientError } from "@/lib/api/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { useMobilePagedList } from "@/lib/hooks/useMobilePagedList";
import {
  formatMovementQuantity,
  formatStockDisplay,
  toUnitsPerCase,
} from "@/lib/inventoryUnits";
import { statusBadgeVariant } from "@/lib/status-badge";
import { cn } from "@/lib/utils";
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
};

const EMPTY_WAREHOUSE_FORM: WarehouseFormValues = {
  name: "",
  status: "active",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

export default function InventoryPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const isAdmin = user?.role === "admin";

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [search, setSearch] = useState("");
  const [movementType, setMovementType] = useState<"import" | "export" | null>(null);
  const [movementForm, setMovementForm] = useState<InventoryMovementFormValues>(
    EMPTY_MOVEMENT_FORM
  );
  const [submitting, setSubmitting] = useState(false);

  // Warehouse management
  const [warehouseSectionOpen, setWarehouseSectionOpen] = useState(false);
  const [historySectionOpen, setHistorySectionOpen] = useState(false);
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseForm, setWarehouseForm] = useState<WarehouseFormValues>(EMPTY_WAREHOUSE_FORM);
  const [warehouseSubmitting, setWarehouseSubmitting] = useState(false);

  const activeWarehouses = warehouses.filter((item) => item.status === "active");

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
        warehouseId: warehouseFilter || undefined,
        page: pageNum,
        limit: DEFAULT_PAGE_SIZE,
      }),
    [warehouseFilter]
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
      const [warehousesResult, productsResult] = await Promise.all([
        getWarehouses({ status: "active", limit: 100, page: 1 }),
        getProducts({ limit: 100, page: 1 }),
      ]);
      setWarehouses(warehousesResult.items);
      setProducts(productsResult.items);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Không tải được dữ liệu"
      );
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

  async function handleDeleteWarehouse(item: Warehouse) {
    const confirmed = await confirm({
      title: "Xóa kho",
      description: `Bạn có chắc muốn xóa "${item.name}"? Hành động này không thể hoàn tác.`,
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteWarehouse(item.id);
      toast.success(`Đã xóa kho "${item.name}"`);
      await loadMasterData();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Xóa thất bại");
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
      await Promise.all([reloadStocks(), reloadTransactions()]);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Thao tác thất bại");
    } finally {
      setSubmitting(false);
    }
  }

  if (
    stockLoading &&
    stocks.length === 0 &&
    transactionLoading &&
    transactions.length === 0
  ) {
    return <PageSkeleton {...PAGE_SKELETONS.inventory} />;
  }

  return (
    <div className="space-y-0 md:space-y-6">
      <PageHeader
        title="Kho hàng"
        description="Quản lý kho, nhập xuất và theo dõi tồn kho"
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
        fab={[
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
        ]}
      />

      {activeWarehouses.length === 0 && (
        <p className="text-sm text-amber-700">
          Vui lòng tạo ít nhất một kho đang hoạt động trước khi nhập/xuất hàng.
        </p>
      )}

      {/* ── Warehouse management (collapsible) ── */}
      {isAdmin && (
        <Card>
          <CardHeader
            showOnMobile
            className="cursor-pointer select-none"
            onClick={() => setWarehouseSectionOpen((prev) => !prev)}
          >
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
          {warehouseSectionOpen && (
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={openCreateWarehouse}>
                  <Plus className="h-4 w-4" />
                  Thêm kho
                </Button>
              </div>

              {warehouses.length === 0 ? (
                <p className="text-sm text-[var(--color-text-inverse)]">Chưa có kho</p>
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
                            className="shrink-0"
                          >
                            {item.status === "active" ? "Hoạt động" : "Ngưng"}
                          </Badge>
                        </div>
                        {item.address ? (
                          <p className="mt-2 truncate text-xs text-[var(--color-text-inverse)]">
                            {item.address}
                          </p>
                        ) : null}
                        <div className="mt-2 flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditWarehouse(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteWarehouse(item)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </MobileRecordCard>
                    ))}
                  </div>

                  {/* Desktop */}
                  <div className="crm-table-scroll hidden md:block">
                    <table className="w-full min-w-[600px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                          <th className="px-2 py-3 font-medium">Tên kho</th>
                          <th className="px-2 py-3 font-medium">Mã</th>
                          <th className="px-2 py-3 font-medium">Địa chỉ</th>
                          <th className="px-2 py-3 font-medium">Trạng thái</th>
                          <th className="px-2 py-3 font-medium text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warehouses.map((item) => (
                          <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                            <td className="px-2 py-3 font-medium">{item.name}</td>
                            <td className="px-2 py-3 text-[var(--color-text-inverse)]">{item.code}</td>
                            <td className="max-w-xs truncate px-2 py-3 text-[var(--color-text-inverse)]">
                              {item.address || "—"}
                            </td>
                            <td className="px-2 py-3">
                              <Badge variant={item.status === "active" ? "success" : "muted"}>
                                {item.status === "active" ? "Hoạt động" : "Ngưng"}
                              </Badge>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditWarehouse(item)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => handleDeleteWarehouse(item)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tồn hiện tại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <SearchInput
              placeholder="Tìm theo tên sản phẩm, SKU..."
              value={search}
              onSearch={setSearch}
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
            />
          </div>

          {stocks.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có tồn kho</p>
          ) : (
            <div className="space-y-4">
              <MobileInfiniteList
                onRefresh={refreshStocks}
                onLoadMore={loadMoreStocks}
                hasMore={stockHasMore}
                loadingMore={stockLoadingMore}
                disabled={stockLoading}
              >
                <div className="flex flex-col gap-3">
                {stocks.map((item) => {
                  const thumb = item.productImage;
                  return (
                    <MobileMediaCard
                      key={item.id}
                      media={
                        thumb ? (
                          <Image
                            src={getImageUrl(thumb)}
                            alt={item.productName || "Sản phẩm"}
                            fill
                            className="object-cover"
                            unoptimized
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
                            Tồn {formatStockDisplay(item.quantity, item.unitsPerCase)}
                          </MobileMetaChip>
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
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-inverse)]">
                      <th className="px-2 py-3 font-medium">Ảnh</th>
                      <th className="px-2 py-3 font-medium">Kho</th>
                      <th className="px-2 py-3 font-medium">Sản phẩm</th>
                      <th className="px-2 py-3 font-medium">SKU</th>
                      <th className="px-2 py-3 font-medium">Tồn kho</th>
                      <th className="px-2 py-3 font-medium">Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stocks.map((item) => {
                      const thumb = item.productImage;
                      return (
                        <tr key={item.id} className="border-b border-[var(--color-border-subtle)]">
                          <td className="px-2 py-3">
                            <div className="relative h-11 w-11 overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]">
                              {thumb ? (
                                <Image
                                  src={getImageUrl(thumb)}
                                  alt={item.productName || "Sản phẩm"}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[var(--color-text-inverse)]">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          </td>
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
                      );
                    })}
                  </tbody>
                </table>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          showOnMobile
          className="max-md:cursor-pointer max-md:select-none"
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              window.matchMedia("(max-width: 767px)").matches
            ) {
              setHistorySectionOpen((prev) => !prev);
            }
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Lịch sử nhập xuất</CardTitle>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-[var(--color-text-inverse)] transition-transform md:hidden",
                historySectionOpen && "rotate-180"
              )}
            />
          </div>
        </CardHeader>
        <CardContent
          className={cn("space-y-4", !historySectionOpen && "max-md:hidden")}
        >
          {transactions.length === 0 ? (
            <p className="text-sm text-[var(--color-text-inverse)]">Chưa có giao dịch</p>
          ) : (
            <div className="space-y-4">
              <MobileInfiniteList
                onRefresh={refreshTransactions}
                onLoadMore={loadMoreTransactions}
                hasMore={transactionHasMore}
                loadingMore={transactionLoadingMore}
                disabled={transactionLoading}
              >
                <div className="flex flex-col gap-3">
                {transactions.map((item) => {
                  const thumb = item.productImage;
                  return (
                    <MobileMediaCard
                      key={item.id}
                      media={
                        thumb ? (
                          <Image
                            src={getImageUrl(thumb)}
                            alt={item.productName || "Sản phẩm"}
                            fill
                            className="object-cover"
                            unoptimized
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
                          className="shrink-0"
                        >
                          {item.type === "import" ? "Nhập" : "Xuất"}
                        </Badge>
                      }
                      meta={
                        <>
                          <MobileMetaChip>
                            SL{" "}
                            {formatMovementQuantity(
                              item.quantity,
                              item.unitType,
                              item.quantityBase,
                              item.unitsPerCase
                            )}
                          </MobileMetaChip>
                          <MobileMetaChip>
                            Tồn{" "}
                            {formatStockDisplay(item.balanceAfter, item.unitsPerCase)}
                          </MobileMetaChip>
                          {item.warehouseName ? (
                            <MobileMetaChip>Kho: {item.warehouseName}</MobileMetaChip>
                          ) : null}
                          <MobileMetaChip>{formatDate(item.createdAt)}</MobileMetaChip>
                        </>
                      }
                    >
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
                onPageChange={goToTransactionPage}
                disabled={transactionLoading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Warehouse dialog ── */}
      <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? "Sửa kho" : "Thêm kho"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleWarehouseSubmit} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="wh-address">Địa chỉ</Label>
              <Input
                id="wh-address"
                value={warehouseForm.address || ""}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-note">Ghi chú</Label>
              <Textarea
                id="wh-note"
                value={warehouseForm.note || ""}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, note: e.target.value })}
              />
            </div>
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setWarehouseDialogOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" loading={warehouseSubmitting}>
                Lưu
              </Button>
            </div>
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
