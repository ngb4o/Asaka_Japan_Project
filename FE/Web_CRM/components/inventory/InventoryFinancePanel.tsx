"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DateRangeInput } from "@/components/ui/date-range-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import {
  FilterDrawer,
  FilterOptionList,
  FilterTrigger,
} from "@/components/ui/filter-drawer";
import { getInventoryFlowReport } from "@/lib/api/inventory";
import { ApiClientError } from "@/lib/api/client";
import { useToast } from "@/components/providers/ToastProvider";
import { useDeferredFilters } from "@/lib/hooks/useDeferredFilters";
import type { InventoryFlowReport, Warehouse } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function toIsoLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function thisMonthRange() {
  const now = new Date();
  return {
    from: toIsoLocal(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toIsoLocal(now),
  };
}

const VIEW_OPTIONS = [
  { value: "topImports", label: "Nhập nhiều tiền nhất" },
  { value: "topExports", label: "Xuất nhiều vốn nhất" },
  { value: "topCapital", label: "Đang chiếm nhiều vốn tồn" },
  { value: "slowMoving", label: "Có tồn nhưng chưa xuất" },
] as const;

type FinanceView = "" | (typeof VIEW_OPTIONS)[number]["value"];

function emptyFinanceFilters(warehouseId = "") {
  const range = thisMonthRange();
  return {
    view: "" as FinanceView,
    warehouseId,
    from: range.from,
    to: range.to,
  };
}

type FinanceFilterContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  appliedCount: number;
  draftCount: number;
  draft: ReturnType<typeof emptyFinanceFilters>;
  setDraftValue: <K extends keyof ReturnType<typeof emptyFinanceFilters>>(
    key: K,
    value: ReturnType<typeof emptyFinanceFilters>[K]
  ) => void;
  clearDraft: () => void;
  apply: () => void;
  warehouses: Warehouse[];
  view: FinanceView;
  report: InventoryFlowReport | null;
  loading: boolean;
};

const FinanceFilterContext = createContext<FinanceFilterContextValue | null>(
  null
);

function useFinanceFilter() {
  const ctx = useContext(FinanceFilterContext);
  if (!ctx) {
    throw new Error("InventoryFinance* must be used within InventoryFinanceProvider");
  }
  return ctx;
}

type InventoryFinanceProviderProps = {
  warehouses: Warehouse[];
  onWarehouseIdChange: (warehouseId: string) => void;
  children: ReactNode;
};

export function InventoryFinanceProvider({
  warehouses,
  onWarehouseIdChange,
  children,
}: InventoryFinanceProviderProps) {
  const toast = useToast();
  const emptyFilters = useMemo(() => emptyFinanceFilters(""), []);
  const filters = useDeferredFilters(emptyFilters);
  const [report, setReport] = useState<InventoryFlowReport | null>(null);
  const [loading, setLoading] = useState(false);

  const view = (filters.applied.view || "") as FinanceView;

  const appliedCount = [
    filters.applied.view,
    filters.applied.warehouseId,
  ].filter(Boolean).length;
  const draftCount = [
    filters.draft.view,
    filters.draft.warehouseId,
  ].filter(Boolean).length;

  const loadReport = useCallback(async () => {
    if (!filters.applied.view) {
      setReport(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getInventoryFlowReport({
        from: filters.applied.from,
        to: filters.applied.to,
        warehouseId: filters.applied.warehouseId || undefined,
      });
      setReport(data);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : "Không tải được báo cáo dòng vốn"
      );
    } finally {
      setLoading(false);
    }
  }, [
    filters.applied.view,
    filters.applied.from,
    filters.applied.to,
    filters.applied.warehouseId,
    toast,
  ]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const apply = useCallback(() => {
    onWarehouseIdChange(filters.draft.warehouseId);
    filters.apply();
  }, [filters, onWarehouseIdChange]);

  const value = useMemo<FinanceFilterContextValue>(
    () => ({
      open: filters.open,
      setOpen: filters.setOpen,
      appliedCount,
      draftCount,
      draft: filters.draft,
      setDraftValue: filters.setDraftValue,
      clearDraft: filters.clearDraft,
      apply,
      warehouses,
      view,
      report,
      loading,
    }),
    [
      filters.open,
      filters.setOpen,
      filters.draft,
      filters.setDraftValue,
      filters.clearDraft,
      appliedCount,
      draftCount,
      apply,
      warehouses,
      view,
      report,
      loading,
    ]
  );

  return (
    <FinanceFilterContext.Provider value={value}>
      {children}
    </FinanceFilterContext.Provider>
  );
}

export function InventoryFinanceFilterTrigger() {
  const { open, setOpen, appliedCount } = useFinanceFilter();
  return (
    <FilterTrigger
      open={open}
      activeCount={appliedCount}
      onClick={() => setOpen(true)}
    />
  );
}

export function InventoryFinanceFilterDrawer() {
  const {
    open,
    setOpen,
    draft,
    setDraftValue,
    clearDraft,
    apply,
    draftCount,
    warehouses,
  } = useFinanceFilter();

  return (
    <FilterDrawer
      open={open}
      onOpenChange={setOpen}
      title="Bộ lọc tồn & báo cáo"
      onClear={clearDraft}
      onApply={apply}
      draftCount={draftCount}>
      <FilterOptionList
        label="Kho"
        value={draft.warehouseId}
        onChange={(value) => setDraftValue("warehouseId", value)}
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
        label="Báo cáo vốn"
        value={draft.view}
        onChange={(value) => setDraftValue("view", value as FinanceView)}
        options={[...VIEW_OPTIONS]}
        searchable={false}
        placeholder="Không hiện báo cáo"
      />
      {draft.view ? (
        <div className="space-y-1.5">
          <Label>Kỳ xem báo cáo</Label>
          <DateRangeInput
            from={draft.from}
            to={draft.to}
            onChange={(range) => {
              setDraftValue("from", range.from);
              setDraftValue("to", range.to);
            }}
          />
        </div>
      ) : null}
    </FilterDrawer>
  );
}

function ProductValueList({
  title,
  empty,
  rows,
  valueKey = "totalValue",
  valueLabel,
}: {
  title: string;
  empty: string;
  rows: Array<{
    productId: string;
    productName: string;
    productSku: string;
    totalValue?: number;
    stockValue?: number;
    quantity?: number;
    exportValueInPeriod?: number;
  }>;
  valueKey?: "totalValue" | "stockValue";
  valueLabel?: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]/30 px-4 py-3">
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        {title}
      </p>
      {rows.length === 0 ? (
        <EmptyState title={empty} size="sm" />
      ) : (
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {rows.map((row, index) => {
            const value =
              valueKey === "stockValue" ? row.stockValue : row.totalValue;
            return (
              <div
                key={row.productId}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                    <span className="mr-1.5 text-[var(--color-text-inverse)]">
                      {index + 1}.
                    </span>
                    {row.productName || "—"}
                  </p>
                  <p className="truncate text-xs text-[var(--color-text-inverse)]">
                    {[
                      row.productSku,
                      row.quantity != null ? `Còn ${row.quantity} sản phẩm` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                    {row.exportValueInPeriod != null
                      ? ` · Đã xuất kỳ này ${formatCurrency(row.exportValueInPeriod)}`
                      : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {valueLabel ? (
                    <p className="text-[11px] text-[var(--color-text-inverse)]">
                      {valueLabel}
                    </p>
                  ) : null}
                  <p className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {formatCurrency(value || 0)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function InventoryFinanceReport() {
  const { view, report, loading } = useFinanceFilter();

  if (!view) return null;

  const title =
    VIEW_OPTIONS.find((option) => option.value === view)?.label || "Báo cáo";

  if (loading && !report) {
    return (
      <p className="py-4 text-center text-sm text-[var(--color-text-inverse)]">
        Đang tải báo cáo...
      </p>
    );
  }

  if (!report) {
    return <EmptyState title="Chưa có dữ liệu báo cáo" size="sm" />;
  }

  if (view === "topImports") {
    return (
      <ProductValueList
        title={title}
        empty="Chưa có phiếu nhập trong kỳ"
        rows={report.topImports}
        valueLabel="Tiền nhập"
      />
    );
  }
  if (view === "topExports") {
    return (
      <ProductValueList
        title={title}
        empty="Chưa có phiếu xuất trong kỳ"
        rows={report.topExports}
        valueLabel="Giá vốn xuất"
      />
    );
  }
  if (view === "topCapital") {
    return (
      <ProductValueList
        title={title}
        empty="Chưa có tồn có giá trị"
        rows={report.topCapital}
        valueKey="stockValue"
        valueLabel="Vốn tồn"
      />
    );
  }
  return (
    <ProductValueList
      title={title}
      empty="Không có sản phẩm tồn mà chưa xuất trong kỳ"
      rows={report.slowMoving}
      valueKey="stockValue"
      valueLabel="Vốn đang ứ"
    />
  );
}
