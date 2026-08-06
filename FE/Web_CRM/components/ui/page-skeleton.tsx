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

/** Matches `MobileRecordCard` used on orders / trips / dealers / … */
function MobileRecordCardSkeleton({ showActions }: { showActions: boolean }) {
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

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-[var(--color-surface-muted)] px-3.5 py-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="mt-2 h-5 w-20" />
        </div>
        <div className="rounded-xl bg-[var(--color-surface-muted)] px-3.5 py-3">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="mt-2 h-5 w-16" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Skeleton className="h-6 w-24 rounded-md" />
        <Skeleton className="h-6 w-28 rounded-md" />
      </div>

      {showActions ? (
        <div className="mt-3.5 flex justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-3.5">
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
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
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
        <div className="mt-3 flex justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      ) : null}
    </article>
  );
}

function TableCardSkeleton({
  filters,
  columns,
  rows,
  minWidth,
}: {
  filters: number;
  columns: ColumnPreset[];
  rows: number;
  minWidth: string;
}) {
  const hasImage = columns.includes("image");
  const showActions = columns.includes("actions");
  const mobileRows = Math.min(rows, 5);

  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-28" />
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
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
  minWidth = "760px",
}: PageSkeletonProps) {
  return (
    <div
      className={cn("space-y-0 md:space-y-6")}
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

      {Array.from({ length: cards }).map((_, index) => (
        <TableCardSkeleton
          key={index}
          filters={index === 0 ? filters : 0}
          columns={columns}
          rows={rows}
          minWidth={minWidth}
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
    columns: ["text", "text", "badge", "text", "actions"] as ColumnPreset[],
    minWidth: "640px",
  },
  warehouses: {
    label: "Đang tải kho hàng",
    filters: 1,
    columns: ["text", "text", "text", "badge", "actions"] as ColumnPreset[],
    minWidth: "760px",
  },
  inventory: {
    label: "Đang tải tồn kho",
    filters: 2,
    actionButtons: 2,
    cards: 2,
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
    columns: ["image", "text", "text", "badge", "actions"] as ColumnPreset[],
    minWidth: "760px",
  },
  receivables: {
    label: "Đang tải công nợ",
    filters: 1,
    cards: 4,
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
} as const;
