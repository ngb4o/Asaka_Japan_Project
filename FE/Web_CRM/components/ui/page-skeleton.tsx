import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

function MobileRecordCardSkeleton({
  hasImage,
  fieldCount,
}: {
  hasImage: boolean;
  fieldCount: number;
}) {
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          {hasImage ? <Skeleton className="h-12 w-12 rounded-lg" /> : null}
        </div>
      </div>

      {Array.from({ length: fieldCount }).map((_, index) => (
        <div key={index} className="grid gap-1 py-2.5 sm:grid-cols-[7rem_1fr] sm:items-center sm:gap-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-full max-w-[12rem]" />
        </div>
      ))}

      <div className="mt-1 flex justify-end gap-2 border-t border-[var(--color-border-subtle)] pt-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
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
  const fieldCount = Math.max(
    2,
    columns.filter((column) => column !== "actions" && column !== "image").length
  );
  const mobileRows = Math.min(rows, 4);

  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-28" />
      </CardHeader>
      <CardContent className="space-y-4">
        {filters > 0 && (
          <div
            className={
              filters > 1 ? "grid gap-3 md:grid-cols-2" : undefined
            }
          >
            {Array.from({ length: filters }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 md:hidden">
          {Array.from({ length: mobileRows }).map((_, index) => (
            <MobileRecordCardSkeleton
              key={index}
              hasImage={hasImage}
              fieldCount={fieldCount}
            />
          ))}
        </div>

        <div className="crm-table-scroll hidden md:block">
          <table className="w-full text-left text-sm" style={{ minWidth }}>
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)]">
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
    <div className="space-y-6" aria-busy="true" aria-label={label}>
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
    columns: ["text", "text", "text", "text", "text", "text"] as ColumnPreset[],
    minWidth: "860px",
  },
  news: {
    label: "Đang tải tin tức",
    filters: 1,
    columns: ["image", "text", "text", "badge", "actions"] as ColumnPreset[],
    minWidth: "760px",
  },
} as const;
