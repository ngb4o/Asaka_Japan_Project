import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  MobileCardList,
  MobileRecordCard,
} from "@/components/ui/mobile-record-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ColumnPreset = "text" | "image" | "badge" | "actions";

type PageSkeletonProps = {
  label?: string;
  filters?: number;
  columns?: ColumnPreset[];
  rows?: number;
  actionButtons?: number;
  cards?: number;
  /** Summary stat tiles above the list (e.g. receivables) */
  stats?: number;
  /** Show border-y metrics block on mobile record skeletons (orders/employees/…) */
  showMetrics?: boolean;
  minWidth?: string;
};

function TableRowSkeleton({ columns }: { columns: ColumnPreset[] }) {
  return (
    <tr className="border-b border-[var(--color-border-subtle)]">
      {columns.map((column, index) => {
        if (column === "image") {
          return (
            <td key={index} className="px-2 py-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
            </td>
          );
        }

        if (column === "badge") {
          return (
            <td key={index} className="px-2 py-3">
              <Skeleton className="h-6 w-20 rounded-full" />
            </td>
          );
        }

        if (column === "actions") {
          return (
            <td key={index} className="px-2 py-3">
              <div className="flex justify-end gap-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </td>
          );
        }

        return (
          <td key={index} className="px-2 py-3">
            <Skeleton className="h-4 w-28" />
          </td>
        );
      })}
    </tr>
  );
}

/** Matches current mobile list cards: header → optional border-y metrics → chips → actions */
function MobileRecordCardSkeleton({
  showActions,
  showMetrics = true,
}: {
  showActions: boolean;
  showMetrics?: boolean;
}) {
  return (
    <MobileRecordCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Skeleton className="h-[22px] w-16 rounded-full" />
          <Skeleton className="h-[22px] w-20 rounded-full" />
        </div>
      </div>

      {showMetrics ? (
        <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex flex-col items-end space-y-1.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Skeleton className="h-7 w-24 rounded-md" />
        <Skeleton className="h-7 w-28 rounded-md" />
      </div>

      {showActions ? (
        <div className="mt-3.5 flex flex-wrap justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-3.5">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      ) : null}
    </MobileRecordCard>
  );
}

/** Matches `MobileMediaCard` used on products / news / inventory */
function MobileMediaCardSkeleton({ showActions }: { showActions: boolean }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3 shadow-[var(--shadow-soft)]">
      <div className="flex gap-3">
        <Skeleton className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-[85%]" />
              <Skeleton className="h-3 w-[60%]" />
            </div>
            <Skeleton className="h-[22px] w-14 shrink-0 rounded-full" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t border-[var(--color-border-subtle)] pt-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {showActions ? (
        <div className="mt-3.5 flex justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-3.5">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      ) : null}
    </article>
  );
}

function StatsRowSkeleton({ count }: { count: number }) {
  return (
    <div
      className={cn(
        "grid gap-3",
        count >= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"
      )}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl bg-[var(--color-surface-muted)] px-3 py-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

function TableCardSkeleton({
  filters,
  columns,
  rows,
  minWidth,
  showMetrics,
}: {
  filters: number;
  columns: ColumnPreset[];
  rows: number;
  minWidth: string;
  showMetrics: boolean;
}) {
  const hasImage = columns.includes("image");
  const showActions = columns.includes("actions");
  const mobileRows = Math.min(rows, 5);

  return (
    <Card className="border-0 bg-transparent shadow-none md:border md:bg-[var(--color-surface-elevated)] md:shadow-[var(--shadow-soft)]">
      <CardHeader className="hidden md:block">
        <Skeleton className="h-6 w-28" />
      </CardHeader>
      <CardContent
        data-crm-skeleton-content=""
        className="space-y-3 max-md:px-0 max-md:pb-3 max-md:pt-3 md:space-y-4">
        {filters > 0 ? (
          <div className="flex gap-2">
            <Skeleton className="h-10 min-w-0 flex-1 rounded-[var(--radius-button)]" />
            {filters > 1 ? (
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            ) : null}
          </div>
        ) : null}

        <MobileCardList className="gap-3">
          {Array.from({ length: mobileRows }).map((_, index) =>
            hasImage ? (
              <MobileMediaCardSkeleton
                key={index}
                showActions={showActions}
              />
            ) : (
              <MobileRecordCardSkeleton
                key={index}
                showActions={showActions}
                showMetrics={showMetrics}
              />
            )
          )}
        </MobileCardList>

        <div className="crm-table-scroll hidden md:block">
          <div className="crm-table-frame">
            <table className="crm-data-table" style={{ minWidth }}>
              <thead>
                <tr>
                  {columns.map((_, index) => (
                    <th key={index} className="px-2 py-3">
                      <Skeleton className="h-4 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={columns} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const DEFAULT_COLUMNS: ColumnPreset[] = [
  "text",
  "text",
  "badge",
  "text",
  "actions",
];

export function PageSkeleton({
  label = "Đang tải dữ liệu",
  filters = 1,
  columns = DEFAULT_COLUMNS,
  rows = 6,
  actionButtons = 1,
  cards = 1,
  stats = 0,
  showMetrics = true,
  minWidth = "760px",
}: PageSkeletonProps) {
  return (
    <div
      className={cn("crm-animate-in space-y-4 md:space-y-6")}
      aria-busy="true"
      aria-label={label}>
      <div className="hidden flex-col gap-3 md:flex md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: actionButtons }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-36 rounded-lg" />
          ))}
        </div>
      </div>

      {stats > 0 ? <StatsRowSkeleton count={stats} /> : null}

      {Array.from({ length: cards }).map((_, index) => (
        <TableCardSkeleton
          key={index}
          filters={index === 0 ? filters : 0}
          columns={columns}
          rows={rows}
          minWidth={minWidth}
          showMetrics={showMetrics}
        />
      ))}
    </div>
  );
}

/** Presets for each CRM list page */
export const PAGE_SKELETONS = {
  products: {
    label: "Đang tải sản phẩm",
    filters: 2,
    showMetrics: false,
    columns: [
      "image",
      "text",
      "text",
      "text",
      "text",
      "text",
      "text",
      "badge",
      "actions",
    ] as ColumnPreset[],
    minWidth: "980px",
  },
  categories: {
    label: "Đang tải loại sản phẩm",
    filters: 1,
    showMetrics: false,
    columns: ["text", "text", "badge", "text", "actions"] as ColumnPreset[],
    minWidth: "640px",
  },
  warehouses: {
    label: "Đang tải kho hàng",
    filters: 1,
    showMetrics: false,
    columns: ["text", "text", "text", "badge", "actions"] as ColumnPreset[],
    minWidth: "760px",
  },
  inventory: {
    label: "Đang tải tồn kho",
    filters: 2,
    actionButtons: 2,
    cards: 2,
    showMetrics: false,
    columns: [
      "image",
      "text",
      "text",
      "text",
      "text",
      "text",
    ] as ColumnPreset[],
    minWidth: "860px",
  },
  news: {
    label: "Đang tải tin tức",
    filters: 1,
    showMetrics: false,
    columns: ["image", "text", "text", "badge", "actions"] as ColumnPreset[],
    minWidth: "760px",
  },
  receivables: {
    label: "Đang tải công nợ",
    filters: 1,
    cards: 1,
    stats: 4,
    showMetrics: true,
    columns: [
      "text",
      "text",
      "text",
      "badge",
      "text",
      "text",
      "actions",
    ] as ColumnPreset[],
    minWidth: "860px",
  },
  orders: {
    label: "Đang tải đơn hàng",
    filters: 2,
    showMetrics: true,
    columns: [
      "text",
      "text",
      "text",
      "badge",
      "badge",
      "text",
      "actions",
    ] as ColumnPreset[],
    minWidth: "980px",
  },
  employees: {
    label: "Đang tải nhân viên",
    filters: 1,
    showMetrics: true,
    columns: [
      "text",
      "text",
      "text",
      "text",
      "badge",
      "actions",
    ] as ColumnPreset[],
    minWidth: "900px",
  },
  payroll: {
    label: "Đang tải bảng lương",
    filters: 1,
    showMetrics: true,
    columns: ["text", "text", "badge", "text", "actions"] as ColumnPreset[],
    minWidth: "760px",
  },
  dealers: {
    label: "Đang tải đại lý",
    filters: 2,
    showMetrics: true,
    columns: [
      "text",
      "text",
      "text",
      "badge",
      "text",
      "badge",
      "actions",
    ] as ColumnPreset[],
    minWidth: "900px",
  },
  suppliers: {
    label: "Đang tải nhà cung cấp",
    filters: 1,
    showMetrics: false,
    columns: [
      "text",
      "text",
      "text",
      "text",
      "badge",
      "actions",
    ] as ColumnPreset[],
    minWidth: "860px",
  },
  leads: {
    label: "Đang tải lead",
    filters: 2,
    showMetrics: false,
    columns: [
      "text",
      "text",
      "text",
      "badge",
      "text",
      "actions",
    ] as ColumnPreset[],
    minWidth: "860px",
  },
  trips: {
    label: "Đang tải chuyến công tác",
    filters: 1,
    showMetrics: true,
    columns: [
      "text",
      "text",
      "text",
      "text",
      "badge",
      "actions",
    ] as ColumnPreset[],
    minWidth: "900px",
  },
  users: {
    label: "Đang tải người dùng",
    filters: 1,
    showMetrics: false,
    columns: ["text", "text", "badge", "badge", "actions"] as ColumnPreset[],
    minWidth: "760px",
  },
} as const;

function KpiCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("h-full overflow-hidden", className)}>
      <CardContent className="space-y-3 p-3.5 md:space-y-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-8 w-8 shrink-0 rounded-xl md:h-10 md:w-10" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-24 md:h-7 md:w-32" />
          <Skeleton className="h-1 w-10 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCardSkeleton({
  className,
  chartClassName = "h-48",
}: {
  className?: string;
  chartClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader showOnMobile>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className={cn("w-full rounded-xl", chartClassName)} />
      </CardContent>
    </Card>
  );
}

function RankRowSkeleton() {
  return (
    <MobileRecordCard className="p-3 shadow-none">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[var(--color-surface-muted)] px-3 py-2">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="mt-2 h-4 w-12" />
        </div>
        <div className="rounded-xl bg-[var(--color-surface-muted)] px-3 py-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="mt-2 h-4 w-16" />
        </div>
        <div className="rounded-xl bg-[var(--color-surface-muted)] px-3 py-2">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="mt-2 h-4 w-14" />
        </div>
      </div>
    </MobileRecordCard>
  );
}

/** Loading UI for sales report (KPIs + charts + rankings) — not a list table */
export function ReportsPageSkeleton() {
  return (
    <div
      className="crm-animate-in space-y-5"
      aria-busy="true"
      aria-label="Đang tải báo cáo doanh số">
      <div className="hidden flex-col gap-3 md:flex md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-8 w-[4.5rem] rounded-[var(--radius-button)]"
              />
            ))}
            <Skeleton className="h-8 w-20 rounded-[var(--radius-button)]" />
          </div>
          <Skeleton className="ml-auto h-8 w-28 rounded-lg md:hidden" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton className="col-span-2 md:col-span-1" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton className="col-span-2 md:col-span-1" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCardSkeleton className="lg:col-span-2" chartClassName="h-52" />
        <ChartCardSkeleton chartClassName="h-52" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton chartClassName="h-44" />
        <Card>
          <CardHeader showOnMobile>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] px-3 py-2.5">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton chartClassName="h-44" />
        <ChartCardSkeleton chartClassName="h-44" />
      </div>

      <Card>
        <CardHeader showOnMobile>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <RankRowSkeleton key={index} />
            ))}
          </div>
          <div className="hidden space-y-3 md:block">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
