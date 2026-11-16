export function PageSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy="true" aria-label="Đang tải">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3">
          <div className="space-y-2">
            <Bone className="h-4 w-28" />
            <Bone className="h-3 w-44" />
          </div>
          <Bone className="h-10 w-32 rounded-[var(--radius-button)]" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
          <Bone className="h-10 w-full max-w-xl rounded-[var(--radius-button)]" />
          <ListSkeleton rows={12} fill />
        </div>
      </section>
    </div>
  );
}

export function ListSkeleton({ rows = 7, fill = false }: { rows?: number; fill?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-label="Đang tải">
      <div className={`min-h-0 flex-1 overflow-hidden lg:hidden ${fill ? "flex flex-col gap-2" : "space-y-2"}`}>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className={`flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-3 py-3 ${fill ? "min-h-16 flex-1" : ""}`}>
            <Bone className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bone className={`h-3.5 ${index % 2 === 0 ? "w-2/5" : "w-1/2"}`} />
              <Bone className="h-3 w-3/5" />
            </div>
            <Bone className="h-3.5 w-12 shrink-0" />
          </div>
        ))}
      </div>
      <div className={`hidden min-h-0 flex-1 overflow-hidden lg:flex lg:flex-col`}>
        <div className="h-11 shrink-0 rounded-t-xl bg-[var(--color-text-secondary)]" />
        <div className={`divide-y divide-[var(--color-border-subtle)] overflow-hidden rounded-b-xl border border-t-0 border-[var(--color-border-subtle)] ${fill ? "flex min-h-0 flex-1 flex-col" : ""}`}>
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className={`grid grid-cols-4 items-center gap-6 px-4 ${fill ? "min-h-16 flex-1" : "py-4"}`}>
              <Bone className={`h-3.5 ${index % 2 === 0 ? "w-4/5" : "w-3/5"}`} />
              <Bone className="h-3.5 w-2/3" />
              <Bone className="h-3.5 w-16" />
              <Bone className="h-3.5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[#e8eef3] ${className}`} />;
}
