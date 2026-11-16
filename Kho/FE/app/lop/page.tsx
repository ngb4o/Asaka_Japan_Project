"use client";

import { ChevronLeft, CircleDot, History, Loader2, Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { correctTire, getTire, listDrivers, listTires, mountTires, moveTire } from "@/lib/api";
import { ListSkeleton } from "@/components/PageSkeleton";
import { foldText } from "@/lib/text";
import type { Driver, Tire, TireEvent, TireKind, TireMoveInput, TirePlace, TirePosition, TireSide } from "@/lib/types";

type Rig = {
  id: string;
  name: string;
  plate: string;
  mooc: string;
  count: number;
  matched: string[];
};

type DraftLine = {
  id: number;
  brand: string;
  serial: string;
  wear: string;
  axle: string;
  side: TireSide;
};

const SIDES: { value: TireSide; label: string }[] = [
  { value: "trai", label: "Bên tài" },
  { value: "phai", label: "Bên phụ" },
];

export default function TirePage() {
  const [tires, setTires] = useState<Tire[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [view, setView] = useState<"xe" | "kho">("xe");
  const [query, setQuery] = useState("");
  const [rig, setRig] = useState<Rig | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [mount, setMount] = useState<MountRequest | null>(null);
  const [moving, setMoving] = useState<Tire | null>(null);
  const [historyTire, setHistoryTire] = useState<Tire | null>(null);
  const [events, setEvents] = useState<TireEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const reload = useCallback(async () => {
    const [tireList, driverList] = await Promise.all([
      listTires({ limit: 500 }),
      listDrivers({ limit: 500 }),
    ]);
    setTires(tireList.items);
    setDrivers(driverList.items);
  }, []);

  useEffect(() => {
    reload()
      .catch((error) => setToast(error instanceof Error ? error.message : "Không tải được sổ lốp"))
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const rigs = useMemo(() => buildRigs(drivers, tires, query), [drivers, query, tires]);

  async function openHistory(tire: Tire) {
    setHistoryTire(tire);
    setEvents([]);
    setHistoryLoading(true);
    try {
      const result = await getTire(tire.id);
      setHistoryTire(result.tire);
      setEvents(result.events);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Không tải được lịch sử");
    } finally {
      setHistoryLoading(false);
    }
  }

  function openMount(prefill?: Partial<MountRequest>) {
    setMount({
      kind: prefill?.kind || "mooc",
      plate: prefill?.plate || rig?.mooc || "",
      axle: prefill?.axle || "",
      side: prefill?.side || "phai",
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-soft)]">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3">
          <div>
            <h1 className="text-base font-semibold tracking-tight">Lốp</h1>
            <p className="text-xs text-[var(--color-text-inverse)]">Mở một xe để xem sơ đồ. Bấm bánh hoặc số seri để xem lịch sử.</p>
          </div>
          <button type="button" className={primaryButton} onClick={() => openMount()}>
            <Plus className="h-4 w-4" />
            Gắn lốp
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <label className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-text-inverse)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm seri, loại lốp, biển, lái xe"
                aria-label="Tìm lốp"
                className={`${fieldClass} pl-9`}
              />
            </label>
            <div className="flex shrink-0 gap-2">
              {([
                ["xe", "Xe"],
                ["kho", "Kho"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setView(value);
                    setRig(null);
                  }}
                  className={view === value ? activeFilter : idleFilter}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <ListSkeleton />
          ) : view === "kho" ? (
            <WarehouseList tires={tires.filter((tire) => tire.place.kind === "kho")} query={query} onMove={setMoving} onHistory={(tire) => void openHistory(tire)} />
          ) : rig ? (
            <RigDiagram
              rig={rig}
              tires={tires}
              query={query}
              onBack={() => setRig(null)}
              onEmpty={(kind, plate, axle, side) => openMount({ kind, plate, axle: String(axle), side })}
              onHistory={(tire) => void openHistory(tire)}
            />
          ) : rigs.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <CircleDot className="h-8 w-8 text-[var(--color-text-inverse)]" />
              <p className="font-semibold">{query ? "Không có xe khớp" : "Chưa có xe để theo dõi"}</p>
              <p className="max-w-sm text-sm text-[var(--color-text-inverse)]">Chọn một lái xe để xem sơ đồ đầu và mooc.</p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {rigs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRig(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] px-3 py-3 text-left hover:bg-[var(--color-surface-muted)]"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{item.name}</span>
                    <span className="block truncate text-sm text-[var(--color-text-inverse)]">
                      Đầu {item.plate || "—"} · Mooc {item.mooc || "—"}
                      {item.matched.length ? ` · ${item.matched.join(", ")}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{item.count} lốp</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {toast ? <p className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#0c2810] px-4 py-2 text-sm font-medium text-white shadow-lg">{toast}</p> : null}

      {mount ? (
        <MountDialog
          request={mount}
          drivers={drivers}
          onClose={() => setMount(null)}
          onSave={async (input) => {
            const created = await mountTires(input);
            setMount(null);
            setView("xe");
            setRig(rigForPlace(drivers, input.kind, input.plate));
            setToast(`Đã gắn ${created.length} lốp lên ${input.plate.trim().toUpperCase()}`);
            await reload();
          }}
        />
      ) : null}

      {moving ? (
        <MoveDialog
          tire={moving}
          drivers={drivers}
          onClose={() => setMoving(null)}
          onSave={async (input) => {
            const updated = await moveTire(moving.id, input);
            setMoving(null);
            if (updated.place.kind === "kho") {
              setView("kho");
              setRig(null);
            } else {
              setView("xe");
              setRig(rigForPlace(drivers, updated.place.kind, updated.place.plate));
            }
            setToast(`Đã cập nhật lốp ${updated.serial}`);
            await reload();
          }}
        />
      ) : null}

      {historyTire ? (
        <HistoryDialog
          tire={historyTire}
          events={events}
          loading={historyLoading}
          onClose={() => setHistoryTire(null)}
          onMove={() => {
            setMoving(historyTire);
            setHistoryTire(null);
          }}
          onSave={async (input) => {
            const updated = await correctTire(historyTire.id, input);
            setHistoryTire(null);
            setToast(`Đã sửa seri ${updated.serial}`);
            await reload();
          }}
        />
      ) : null}
    </div>
  );
}

type MountRequest = {
  kind: "dau" | "mooc";
  plate: string;
  axle: string;
  side: TireSide;
};

function RigDiagram({
  rig,
  tires,
  query,
  onBack,
  onEmpty,
  onHistory,
}: {
  rig: Rig;
  tires: Tire[];
  query: string;
  onBack: () => void;
  onEmpty: (kind: "dau" | "mooc", plate: string, axle: number, side: TireSide) => void;
  onHistory: (tire: Tire) => void;
}) {
  const dau = tires.filter((tire) => tire.place.kind === "dau" && samePlate(tire.place.plate, rig.plate));
  const mooc = tires.filter((tire) => tire.place.kind === "mooc" && samePlate(tire.place.plate, rig.mooc));

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
      <div className="flex items-center gap-2">
        <button type="button" className={outlineButton} onClick={onBack} aria-label="Quay lại danh sách xe">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="font-semibold">{rig.name}</p>
          <p className="truncate text-sm text-[var(--color-text-inverse)]">Đầu {rig.plate || "—"} · Mooc {rig.mooc || "—"}</p>
        </div>
      </div>
      <div className="mx-auto hidden w-full max-w-5xl grid-cols-[minmax(0,1fr)_9.25rem_minmax(0,1fr)] text-[11px] font-semibold tracking-wide text-[#64748b] uppercase lg:grid">
        <span className="pr-10 text-right">Bên tài</span>
        <span />
        <span className="pl-10">Bên phụ</span>
      </div>
      {rig.plate ? <VehicleUnit title="Đầu cái" plate={rig.plate} kind="dau" tires={dau} query={query} onEmpty={onEmpty} onHistory={onHistory} /> : null}
      {rig.plate && rig.mooc ? (
        <div className="-my-1 flex flex-col items-center" aria-hidden="true">
          <div className="h-5 w-3 bg-[#1b4332]" />
          <div className="-mt-1.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#1b4332] bg-white" />
          <div className="-mt-1 h-3 w-3 bg-[#14321a]" />
        </div>
      ) : null}
      {rig.mooc ? <VehicleUnit title="Rơ mooc" plate={rig.mooc} kind="mooc" tires={mooc} query={query} onEmpty={onEmpty} onHistory={onHistory} /> : null}
    </div>
  );
}

function VehicleUnit({
  title,
  plate,
  kind,
  tires,
  query,
  onEmpty,
  onHistory,
}: {
  title: string;
  plate: string;
  kind: "dau" | "mooc";
  tires: Tire[];
  query: string;
  onEmpty: (kind: "dau" | "mooc", plate: string, axle: number, side: TireSide) => void;
  onHistory: (tire: Tire) => void;
}) {
  const mounted = tires.filter((tire) => tire.place.position !== "ngoai");
  const outside = tires.filter((tire) => tire.place.position === "ngoai");
  const count = Math.max(3, ...mounted.map((tire) => tire.place.axle || 0));
  const cab = kind === "dau";
  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="mb-2 flex items-center justify-center gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <span className="rounded-md bg-[#0c2810] px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-white">{plate}</span>
      </div>
      <div className="relative">
        <div className={`pointer-events-none absolute top-0 bottom-0 left-1/2 hidden w-[9.25rem] -translate-x-1/2 shadow-[0_14px_28px_rgb(12_40_16_/_0.16)] lg:block ${cab ? "rounded-t-[4.5rem] rounded-b-xl bg-gradient-to-b from-[#2d6a4f] to-[#1b4332]" : "rounded-lg bg-gradient-to-b from-[#245c3c] to-[#14321a]"}`}>
          {cab ? null : (
            <>
              <div className="absolute inset-x-3 top-[22%] h-px bg-white/20" />
              <div className="absolute inset-x-3 top-1/2 h-px bg-white/20" />
              <div className="absolute inset-x-3 bottom-[22%] h-px bg-white/20" />
            </>
          )}
        </div>
        {cab ? (
          <div className="relative mx-auto hidden h-16 w-[9.25rem] items-end justify-center pb-1 lg:flex">
            <div className="h-8 w-[4.5rem] rounded-md border border-white/30 bg-white/15" />
          </div>
        ) : <div className="hidden h-4 lg:block" />}
        <div className="relative">
          {Array.from({ length: count }, (_, index) => index + 1).map((axle) => (
            <AxleRow
              key={axle}
              axle={axle}
              kind={kind}
              tires={mounted}
              query={query}
              onEmpty={(side) => onEmpty(kind, plate, axle, side)}
              onHistory={onHistory}
            />
          ))}
        </div>
        <div className="hidden h-4 lg:block" />
      </div>
      {outside.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-3 py-2">
          <p className="text-[11px] font-semibold tracking-wide text-[#64748b] uppercase">Nằm ngoài</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {outside.map((tire) => (
              <SerialCard key={tire.id} tire={tire} caption={tire.note || "Ngoài xe"} query={query} onOpen={() => onHistory(tire)} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AxleRow({
  axle,
  kind,
  tires,
  query,
  onEmpty,
  onHistory,
}: {
  axle: number;
  kind: "dau" | "mooc";
  tires: Tire[];
  query: string;
  onEmpty: (side: TireSide) => void;
  onHistory: (tire: Tire) => void;
}) {
  const left = layoutSlots(tires, kind, axle, "trai");
  const right = layoutSlots(tires, kind, axle, "phai");
  return (
    <>
    <div className="rounded-2xl border border-[#e2e8f0] bg-white p-2.5 lg:hidden">
      <p className="mb-2 text-center text-[11px] font-semibold tracking-wide text-[#64748b] uppercase">Cầu {axle}</p>
      <div className="grid grid-cols-2 gap-2">
        <SlotCards slots={left} side="trai" query={query} onEmpty={() => onEmpty("trai")} onHistory={onHistory} align="stretch" />
        <SlotCards slots={right} side="phai" query={query} onEmpty={() => onEmpty("phai")} onHistory={onHistory} align="stretch" />
      </div>
    </div>
    <div className="hidden grid-cols-[minmax(0,1fr)_9.25rem_minmax(0,1fr)] items-center py-1.5 lg:grid">
      <div className="pr-9">
        <SlotCards slots={left} side="trai" query={query} onEmpty={() => onEmpty("trai")} onHistory={onHistory} align="end" />
      </div>
      <div className="relative flex h-16 items-center justify-center">
        <span className="pointer-events-none absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 bg-black/20" />
        <span className="relative text-[10px] font-semibold tracking-wide text-white/80">C{axle}</span>
        <div className="absolute top-1/2 left-0 z-10 flex -translate-x-1/2 -translate-y-1/2 gap-1">
          {left.map((tire, index) => (
            <Wheel key={`lw-${index}`} tire={tire} onOpen={tire ? () => onHistory(tire) : () => onEmpty("trai")} />
          ))}
        </div>
        <div className="absolute top-1/2 right-0 z-10 flex translate-x-1/2 -translate-y-1/2 gap-1">
          {right.map((tire, index) => (
            <Wheel key={`rw-${index}`} tire={tire} onOpen={tire ? () => onHistory(tire) : () => onEmpty("phai")} />
          ))}
        </div>
      </div>
      <div className="pl-9">
        <SlotCards slots={right} side="phai" query={query} onEmpty={() => onEmpty("phai")} onHistory={onHistory} align="start" />
      </div>
    </div>
    </>
  );
}

function SlotCards({
  slots,
  side,
  query,
  onEmpty,
  onHistory,
  align,
}: {
  slots: Array<Tire | null>;
  side: TireSide;
  query: string;
  onEmpty: () => void;
  onHistory: (tire: Tire) => void;
  align: "start" | "end" | "stretch";
}) {
  const fluid = align === "stretch";
  return (
    <div className={fluid ? "space-y-1.5" : `grid gap-1.5 ${slots.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${align === "end" ? "justify-items-end" : "justify-items-start"}`}>
      {fluid ? <p className="text-[10px] font-semibold tracking-wide text-[#94a3b8] uppercase">{side === "trai" ? "Bên tài" : "Bên phụ"}</p> : null}
      {slots.map((tire, index) => (
        <SerialCard
          key={`${side}-${index}`}
          tire={tire}
          caption={slotCaption(side, index, slots.length)}
          query={query}
          fluid={fluid}
          onOpen={tire ? () => onHistory(tire) : onEmpty}
        />
      ))}
    </div>
  );
}

function SerialCard({ tire, caption, query, onOpen, fluid = false }: { tire: Tire | null; caption: string; query: string; onOpen: () => void; fluid?: boolean }) {
  const size = fluid ? "h-auto min-h-[68px] w-full" : "h-[68px] w-full max-w-[168px]";
  if (!tire) {
    return (
      <button type="button" onClick={onOpen} className={`flex ${size} flex-col justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-white/80 px-2.5 text-left hover:border-[#017d03] hover:bg-[#f0fdf4]`}>
        <span className="text-[10px] font-semibold tracking-wide text-[#94a3b8] uppercase">{caption || "Trống"}</span>
        <span className="text-xs font-semibold text-[#64748b]">Gắn lốp</span>
      </button>
    );
  }
  const marked = Boolean(compact(query)) && compact(`${tire.serial} ${tire.brand}`).includes(compact(query));
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`${tire.brand ? `${tire.brand} · ` : ""}${tire.serial}`}
      className={`flex ${size} flex-col justify-center rounded-xl border bg-white px-2.5 text-left shadow-sm hover:border-[#017d03] ${marked ? "border-[#017d03] ring-2 ring-[#017d03]/25" : "border-[#e2e8f0]"}`}
    >
      {caption ? <span className="text-[10px] font-semibold tracking-wide text-[#94a3b8] uppercase">{caption}</span> : null}
      <span className="w-full truncate text-sm font-semibold tracking-tight">{tire.serial}</span>
      <span className="mt-0.5 flex w-full min-w-0 items-center gap-1.5">
        {tire.brand ? <span className="min-w-0 truncate text-[11px] text-[#64748b]">{tire.brand}</span> : <span className="min-w-0 flex-1" />}
        <span className={`shrink-0 rounded-full px-1.5 text-[10px] font-semibold ${wearClass(tire.wear)}`}>{tire.wear == null ? "—" : `${tire.wear}%`}</span>
      </span>
    </button>
  );
}

function Wheel({ tire, onOpen }: { tire: Tire | null; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={tire ? `Lịch sử ${tire.serial}` : "Ô trống"}
      className={`relative h-11 w-7 rounded-[7px] border-2 shadow-sm ${tire ? "border-[#0c2810] bg-[#111827]" : "border-dashed border-[#94a3b8] bg-white"}`}
    >
      <span className={`absolute top-1/2 left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border ${tire ? "border-white/70 bg-[#334155]" : "border-[#cbd5e1] bg-white"}`} />
    </button>
  );
}

function slotCaption(side: TireSide, index: number, count: number) {
  if (count < 2) return "";
  if (side === "trai") return index === 0 ? "Ngoài" : "Trong";
  return index === 0 ? "Trong" : "Ngoài";
}

function wearClass(wear: number | null) {
  if (wear == null) return "bg-[#f1f5f9] text-[#64748b]";
  if (wear >= 70) return "bg-[#dcfce7] text-[#15803d]";
  if (wear >= 40) return "bg-[#fef3c7] text-[#b45309]";
  return "bg-[#fee2e2] text-[#b91c1c]";
}

function TireChip({ tire, marked, onMove, onHistory }: { tire: Tire; marked: boolean; onMove: () => void; onHistory: () => void }) {
  return (
    <div className={`rounded-lg border bg-white px-2 py-2 ${marked ? "border-[var(--color-text-secondary)]" : "border-[var(--color-border-subtle)]"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button type="button" className="min-w-0 text-left" onClick={onHistory}>
            <p className="truncate text-sm font-semibold">{tire.brand ? `${tire.brand} - ` : ""}{tire.serial} <span className="font-medium text-[var(--color-text-inverse)]">({tire.wear == null ? "—" : `${tire.wear}%`})</span></p>
          </button>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className={outlineButton} onClick={onMove}>Chuyển</button>
        <button type="button" className={outlineButton} onClick={onHistory} aria-label={`Lịch sử ${tire.serial}`}>
          <History className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function WarehouseList({
  tires,
  query,
  onMove,
  onHistory,
}: {
  tires: Tire[];
  query: string;
  onMove: (tire: Tire) => void;
  onHistory: (tire: Tire) => void;
}) {
  const keyword = compact(query);
  const visible = tires.filter((tire) => !keyword || compact(`${tire.serial} ${tire.brand} ${tire.note}`).includes(keyword));
  if (visible.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
        <CircleDot className="h-8 w-8 text-[var(--color-text-inverse)]" />
        <p className="font-semibold">{query ? "Không có lốp khớp" : "Kho lốp đang trống"}</p>
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
      {visible.map((tire) => (
        <TireChip key={tire.id} tire={tire} marked={false} onMove={() => onMove(tire)} onHistory={() => onHistory(tire)} />
      ))}
    </div>
  );
}

function MountDialog({
  request,
  drivers,
  onClose,
  onSave,
}: {
  request: MountRequest;
  drivers: Driver[];
  onClose: () => void;
  onSave: (input: { kind: "dau" | "mooc"; plate: string; lines: { serial: string; brand: string; wear: number; axle: number; side: TireSide }[] }) => Promise<void>;
}) {
  const [kind, setKind] = useState<"dau" | "mooc">(request.kind);
  const [plate, setPlate] = useState(request.plate);
  const [driverId, setDriverId] = useState("");
  const [driverQuery, setDriverQuery] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { id: 1, brand: "", serial: "", wear: "100", axle: request.axle || "1", side: request.side },
  ]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useCloseOnEscape(onClose);
  const driver = drivers.find((item) => item.id === driverId) || null;
  const driverMatches = useMemo(() => {
    const keyword = foldText(driverQuery.trim());
    return drivers
      .filter((item) => !keyword || foldText(`${item.name} ${item.plate} ${item.mooc}`).includes(keyword))
      .slice(0, 6);
  }, [driverQuery, drivers]);

  function pickDriver(next: Driver) {
    setDriverId(next.id);
    setDriverQuery("");
    const nextPlate = kind === "dau" ? next.plate : next.mooc;
    if (nextPlate) setPlate(nextPlate);
  }

  function changeKind(next: "dau" | "mooc") {
    setKind(next);
    if (driver) setPlate(next === "dau" ? driver.plate : driver.mooc);
  }

  function append(drafts: Array<Omit<DraftLine, "id">>) {
    setLines((current) => {
      const start = current.reduce((max, line) => Math.max(max, line.id), 0) + 1;
      return [...current, ...drafts.map((draft, index) => ({ ...draft, id: start + index }))];
    });
  }

  function addPair() {
    setLines((current) => {
      const last = current[current.length - 1];
      const axle = last?.axle || "1";
      const brand = last?.brand || "";
      const start = current.reduce((max, line) => Math.max(max, line.id), 0) + 1;
      const right = { id: start, brand, serial: "", wear: "100", axle, side: "phai" as const };
      if (last && !last.serial.trim()) {
        return [...current.slice(0, -1), { ...last, brand, axle, side: "trai" }, right];
      }
      return [
        ...current,
        { id: start, brand, serial: "", wear: "100", axle, side: "trai" },
        { id: start + 1, brand, serial: "", wear: "100", axle, side: "phai" },
      ];
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const prepared = lines.map((line) => ({
        serial: line.serial.trim(),
        brand: line.brand.trim(),
        wear: Number(line.wear),
        axle: Number(line.axle),
        side: line.side,
      }));
      if (prepared.some((line) => !line.serial)) throw new Error("Nhập số seri");
      if (prepared.some((line) => !Number.isInteger(line.axle) || line.axle < 1 || line.axle > 12)) throw new Error("Cầu từ 1 đến 12");
      if (prepared.some((line) => !Number.isInteger(line.wear) || line.wear < 0 || line.wear > 100)) throw new Error("% còn từ 0 đến 100");
      await onSave({ kind, plate, lines: prepared });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không lưu được");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={(event) => void submit(event)} className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="border-b border-[var(--color-border-subtle)] px-4 py-3">
          <h2 className="text-base font-semibold">Gắn lốp</h2>
          <p className="text-sm text-[var(--color-text-inverse)]">Một phiếu nhiều seri. Cặp bên tài và bên phụ thêm bằng nút L+P.</p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {driver ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border-subtle)] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{driver.name}</p>
                <p className="truncate text-xs text-[var(--color-text-inverse)]">Đầu {driver.plate || "—"} · Mooc {driver.mooc || "—"}</p>
              </div>
              <button type="button" className={outlineButton} onClick={() => setDriverId("")}>Đổi</button>
            </div>
          ) : (
            <div>
              <input
                value={driverQuery}
                onChange={(event) => setDriverQuery(event.target.value)}
                placeholder="Tìm lái xe, biển đầu, biển mooc"
                aria-label="Tìm lái xe"
                className={fieldClass}
              />
              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                {driverMatches.map((item) => (
                  <button key={item.id} type="button" className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-[var(--color-surface-muted)]" onClick={() => pickDriver(item)}>
                    <span className="font-semibold">{item.name}</span>
                    <span className="block text-xs text-[var(--color-text-inverse)]">Đầu {item.plate || "—"} · Mooc {item.mooc || "—"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {([
              ["mooc", "Mooc"],
              ["dau", "Đầu"],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" className={kind === value ? activeFilter : idleFilter} onClick={() => changeKind(value)}>{label}</button>
            ))}
          </div>
          <label className="block text-sm font-medium">
            {kind === "dau" ? "Biển đầu" : "Biển mooc"}
            <input value={plate} onChange={(event) => setPlate(event.target.value)} className={`${fieldClass} mt-1`} required />
          </label>
          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={line.id} className="grid gap-2 rounded-lg border border-[var(--color-border-subtle)] p-2 sm:grid-cols-[1fr_1.2fr_72px_64px_auto_auto]">
                <input value={line.brand} onChange={(event) => updateLine(setLines, line.id, { brand: event.target.value })} className={fieldClass} placeholder="Loại" aria-label={`Loại dòng ${index + 1}`} />
                <input value={line.serial} onChange={(event) => updateLine(setLines, line.id, { serial: event.target.value })} className={fieldClass} placeholder="Số seri" aria-label={`Số seri dòng ${index + 1}`} />
                <input value={line.wear} onChange={(event) => updateLine(setLines, line.id, { wear: event.target.value.replace(/[^\d]/g, "").slice(0, 3) })} className={fieldClass} inputMode="numeric" aria-label={`Phần trăm còn dòng ${index + 1}`} />
                <input value={line.axle} onChange={(event) => updateLine(setLines, line.id, { axle: event.target.value.replace(/[^\d]/g, "").slice(0, 2) })} className={fieldClass} inputMode="numeric" aria-label={`Cầu dòng ${index + 1}`} />
                <div className="flex gap-1">
                  {SIDES.map((side) => (
                    <button key={side.value} type="button" className={line.side === side.value ? activeFilter : idleFilter} onClick={() => updateLine(setLines, line.id, { side: side.value })}>{side.label}</button>
                  ))}
                </div>
                <button type="button" className={outlineButton} aria-label={`Xóa dòng ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className={outlineButton}
              onClick={() => append([{
                brand: lines[lines.length - 1]?.brand || "",
                serial: "",
                wear: "100",
                axle: lines[lines.length - 1]?.axle || "1",
                side: lines[lines.length - 1]?.side || "phai",
              }])}
            >
              Thêm dòng
            </button>
            <button type="button" className={outlineButton} onClick={addPair}>
              Thêm cặp L+P
            </button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-[var(--color-border-subtle)] p-3">
          <button type="button" className={`${outlineButton} h-10 w-full text-sm`} onClick={onClose}>Hủy</button>
          <button type="submit" className={`${primaryButton} w-full`} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
}

function MoveDialog({
  tire,
  drivers,
  onClose,
  onSave,
}: {
  tire: Tire;
  drivers: Driver[];
  onClose: () => void;
  onSave: (input: TireMoveInput) => Promise<void>;
}) {
  const [kind, setKind] = useState<TireKind>(tire.place.kind);
  const [plate, setPlate] = useState(tire.place.plate);
  const [driverId, setDriverId] = useState("");
  const [driverQuery, setDriverQuery] = useState("");
  const [spot, setSpot] = useState<"cau" | "ngoai">(tire.place.position === "ngoai" ? "ngoai" : "cau");
  const [axle, setAxle] = useState(tire.place.axle ? String(tire.place.axle) : "1");
  const [side, setSide] = useState<TireSide>(tire.place.position === "ngoai" ? "trai" : sideOf(tire.place.position));
  const [brand, setBrand] = useState(tire.brand || "");
  const [wear, setWear] = useState(tire.wear == null ? "100" : String(tire.wear));
  const [note, setNote] = useState(tire.note || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useCloseOnEscape(onClose);
  const driver = drivers.find((item) => item.id === driverId) || null;
  const driverMatches = useMemo(() => {
    const keyword = foldText(driverQuery.trim());
    return drivers
      .filter((item) => !keyword || foldText(`${item.name} ${item.plate} ${item.mooc}`).includes(keyword))
      .slice(0, 6);
  }, [driverQuery, drivers]);

  function pickDriver(next: Driver) {
    setDriverId(next.id);
    setDriverQuery("");
    const nextPlate = kind === "mooc" ? next.mooc : next.plate;
    if (nextPlate) setPlate(nextPlate);
  }

  function changeKind(next: TireKind) {
    setKind(next);
    if (next === "kho" || !driver) return;
    setPlate(next === "mooc" ? driver.mooc : driver.plate);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const nextWear = Number(wear);
      if (!Number.isInteger(nextWear) || nextWear < 0 || nextWear > 100) throw new Error("% còn từ 0 đến 100");
      const outside = kind !== "kho" && spot === "ngoai";
      await onSave({
        kind,
        plate: kind === "kho" ? "" : plate.trim(),
        axle: kind === "kho" || outside ? null : Number(axle),
        position: kind === "kho" ? "" : outside ? "ngoai" : side,
        brand: brand.trim(),
        wear: nextWear,
        note: note.trim(),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không lưu được");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={(event) => void submit(event)} className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="border-b border-[var(--color-border-subtle)] px-4 py-3">
          <h2 className="text-base font-semibold">Chuyển {tire.serial}</h2>
          <p className="text-sm text-[var(--color-text-inverse)]">Đang ở {formatPlace(tire.place)}</p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Loại
              <input value={brand} onChange={(event) => setBrand(event.target.value)} className={`${fieldClass} mt-1`} />
            </label>
            <label className="block text-sm font-medium">
              % còn
              <input value={wear} onChange={(event) => setWear(event.target.value.replace(/[^\d]/g, "").slice(0, 3))} className={`${fieldClass} mt-1`} inputMode="numeric" />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["mooc", "Mooc"],
              ["dau", "Đầu"],
              ["kho", "Kho"],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" className={kind === value ? activeFilter : idleFilter} onClick={() => changeKind(value)}>{label}</button>
            ))}
          </div>
          {kind === "kho" ? <p className="text-sm text-[var(--color-text-inverse)]">Lốp về kho, không gắn xe.</p> : (
            <>
              {driver ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border-subtle)] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{driver.name}</p>
                    <p className="truncate text-xs text-[var(--color-text-inverse)]">Đầu {driver.plate || "—"} · Mooc {driver.mooc || "—"}</p>
                  </div>
                  <button type="button" className={outlineButton} onClick={() => setDriverId("")}>Đổi</button>
                </div>
              ) : (
                <div>
                  <input
                    value={driverQuery}
                    onChange={(event) => setDriverQuery(event.target.value)}
                    className={fieldClass}
                    placeholder="Tìm xe khác, biển đầu, biển mooc"
                    aria-label="Tìm xe nhận lốp"
                  />
                  <div className="mt-2 space-y-1">
                    {driverMatches.map((item) => (
                      <button key={item.id} type="button" className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-[var(--color-surface-muted)]" onClick={() => pickDriver(item)}>
                        <span className="block text-sm font-semibold">{item.name}</span>
                        <span className="block truncate text-xs text-[var(--color-text-inverse)]">Đầu {item.plate || "—"} · Mooc {item.mooc || "—"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label className="block text-sm font-medium">
                {kind === "dau" ? "Biển đầu" : "Biển mooc"}
                <input value={plate} onChange={(event) => setPlate(event.target.value)} className={`${fieldClass} mt-1`} required />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={spot === "cau" ? activeFilter : idleFilter} onClick={() => setSpot("cau")}>Gắn cầu</button>
                <button type="button" className={spot === "ngoai" ? activeFilter : idleFilter} onClick={() => setSpot("ngoai")}>Nằm ngoài</button>
              </div>
              {spot === "ngoai" ? (
                <p className="text-sm text-[var(--color-text-inverse)]">Lốp để ngoài xe này, chưa vào cầu. Dùng khi để thải hoặc lắp sang chỗ khác sau.</p>
              ) : (
                <>
                  <label className="block text-sm font-medium">
                    Cầu
                    <input value={axle} onChange={(event) => setAxle(event.target.value.replace(/[^\d]/g, "").slice(0, 2))} className={`${fieldClass} mt-1`} inputMode="numeric" required />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SIDES.map((item) => (
                      <button key={item.value} type="button" className={side === item.value ? activeFilter : idleFilter} onClick={() => setSide(item.value)}>{item.label}</button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
          {kind !== "kho" && spot === "ngoai" ? (
            <div className="grid grid-cols-2 gap-2">
              {["Để thải", "Để lắp sau"].map((item) => (
                <button key={item} type="button" className={note === item ? activeFilter : idleFilter} onClick={() => setNote(item)}>{item}</button>
              ))}
            </div>
          ) : null}
          <label className="block text-sm font-medium">
            Ghi chú
            <input value={note} onChange={(event) => setNote(event.target.value)} className={`${fieldClass} mt-1`} placeholder="Lý do chuyển" />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-[var(--color-border-subtle)] p-3">
          <button type="button" className={`${outlineButton} h-10 w-full text-sm`} onClick={onClose}>Hủy</button>
          <button type="submit" className={`${primaryButton} w-full`} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
}

function HistoryDialog({
  tire,
  events,
  loading,
  onClose,
  onMove,
  onSave,
}: {
  tire: Tire;
  events: TireEvent[];
  loading: boolean;
  onClose: () => void;
  onMove: () => void;
  onSave: (input: { serial: string; brand: string; wear: number }) => Promise<void>;
}) {
  const [serial, setSerial] = useState(tire.serial);
  const [brand, setBrand] = useState(tire.brand || "");
  const [wear, setWear] = useState(tire.wear == null ? "100" : String(tire.wear));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useCloseOnEscape(onClose);

  useEffect(() => {
    setSerial(tire.serial);
    setBrand(tire.brand || "");
    setWear(tire.wear == null ? "100" : String(tire.wear));
  }, [tire]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextWear = Number(wear);
    if (!serial.trim()) {
      setError("Nhập số seri");
      return;
    }
    if (!Number.isInteger(nextWear) || nextWear < 0 || nextWear > 100) {
      setError("% còn từ 0 đến 100");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ serial: serial.trim(), brand: brand.trim(), wear: nextWear });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không sửa được");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={(event) => void submit(event)} className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="border-b border-[var(--color-border-subtle)] px-4 py-3">
          <h2 className="text-base font-semibold">Sửa lốp</h2>
          <p className="text-sm text-[var(--color-text-inverse)]">Đang ở {formatPlace(tire.place)}</p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <label className="block text-sm font-medium">
            Số seri
            <input value={serial} onChange={(event) => setSerial(event.target.value)} className={`${fieldClass} mt-1`} required />
          </label>
          <div className="grid grid-cols-[1fr_96px] gap-3">
            <label className="block text-sm font-medium">
              Loại
              <input value={brand} onChange={(event) => setBrand(event.target.value)} className={`${fieldClass} mt-1`} />
            </label>
            <label className="block text-sm font-medium">
              % còn
              <input value={wear} onChange={(event) => setWear(event.target.value.replace(/[^\d]/g, "").slice(0, 3))} className={`${fieldClass} mt-1`} inputMode="numeric" />
            </label>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <p className="text-sm font-semibold">Lịch sử</p>
          {loading ? <p className="text-sm text-[var(--color-text-inverse)]">Đang tải lịch sử...</p> : events.length === 0 ? <p className="text-sm text-[var(--color-text-inverse)]">Chưa có lần chuyển.</p> : (
            <ul className="space-y-3">
              {events.map((event) => (
                <li key={event.id} className="text-sm">
                  <p className="font-semibold">{eventTitle(event)}</p>
                  <p className="text-[var(--color-text-inverse)]">
                    {formatWhen(event.createdAt)}
                    {event.createdBy ? ` · ${event.createdBy}` : ""}
                    {event.wear == null ? "" : ` · ${event.wear}%`}
                    {event.note ? ` · ${event.note}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-[var(--color-border-subtle)] p-3">
          <button type="button" className={`${outlineButton} h-10 w-full text-sm`} onClick={onClose}>Đóng</button>
          <button type="button" className={`${outlineButton} h-10 w-full text-sm`} onClick={onMove}>Chuyển</button>
          <button type="submit" className={`${primaryButton} w-full`} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
}

function buildRigs(drivers: Driver[], tires: Tire[], query: string): Rig[] {
  const rows = new Map<string, Rig>();
  for (const driver of drivers) {
    const owned = tires.filter((tire) => onRig(tire, driver.plate, driver.mooc));
    rows.set(driver.id, {
      id: driver.id,
      name: driver.name,
      plate: driver.plate,
      mooc: driver.mooc,
      count: owned.length,
      matched: [],
    });
  }
  for (const tire of tires) {
    if (tire.place.kind === "kho" || !tire.place.plate) continue;
    const known = drivers.some((driver) => (
      tire.place.kind === "dau" ? samePlate(driver.plate, tire.place.plate) : samePlate(driver.mooc, tire.place.plate)
    ));
    if (known) continue;
    const id = `${tire.place.kind}:${tire.place.plate.toUpperCase()}`;
    const current = rows.get(id) || {
      id,
      name: tire.place.plate,
      plate: tire.place.kind === "dau" ? tire.place.plate : "",
      mooc: tire.place.kind === "mooc" ? tire.place.plate : "",
      count: 0,
      matched: [],
    };
    current.count += 1;
    rows.set(id, current);
  }
  const keyword = compact(query);
  return [...rows.values()]
    .map((item) => ({
      ...item,
      matched: keyword
        ? tires
          .filter((tire) => onRig(tire, item.plate, item.mooc) && compact(`${tire.serial} ${tire.brand}`).includes(keyword))
          .map((tire) => tire.serial)
        : [],
    }))
    .filter((item) => !keyword || item.matched.length > 0 || compact(`${item.name} ${item.plate} ${item.mooc}`).includes(keyword))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

function onRig(tire: Tire, plate: string, mooc: string) {
  return (tire.place.kind === "dau" && samePlate(tire.place.plate, plate))
    || (tire.place.kind === "mooc" && samePlate(tire.place.plate, mooc));
}

function rigForPlace(drivers: Driver[], kind: TireKind, plate: string): Rig | null {
  if (kind === "kho") return null;
  const driver = drivers.find((item) => samePlate(kind === "dau" ? item.plate : item.mooc, plate));
  if (driver) {
    return { id: driver.id, name: driver.name, plate: driver.plate, mooc: driver.mooc, count: 0, matched: [] };
  }
  return {
    id: `${kind}:${plate.trim().toUpperCase()}`,
    name: plate.trim().toUpperCase(),
    plate: kind === "dau" ? plate.trim().toUpperCase() : "",
    mooc: kind === "mooc" ? plate.trim().toUpperCase() : "",
    count: 0,
    matched: [],
  };
}

function layoutSlots(tires: Tire[], kind: "dau" | "mooc", axle: number, side: TireSide) {
  const dual = !(kind === "dau" && axle === 1);
  const positions: TirePosition[] = side === "trai"
    ? (dual ? ["trai-ngoai", "trai-trong"] : ["trai-ngoai"])
    : (dual ? ["phai-trong", "phai-ngoai"] : ["phai-ngoai"]);
  const slots = positions.map((position) => tires.find((tire) => tire.place.axle === axle && tire.place.position === position) || null);
  if (!dual) {
    const extra = tires.find((tire) => tire.place.axle === axle && (tire.place.position === (side === "trai" ? "trai-trong" : "phai-trong") || tire.place.position === "don"));
    if (extra && !slots.includes(extra)) slots[0] = slots[0] || extra;
  }
  return slots;
}

function updateLine(setLines: Dispatch<SetStateAction<DraftLine[]>>, id: number, patch: Partial<DraftLine>) {
  setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
}

function samePlate(left: string, right: string) {
  return left.trim().toUpperCase() === right.trim().toUpperCase();
}

function compact(value: string) {
  return foldText(value).replace(/[^a-z0-9]/g, "");
}

function sideOf(position: TirePosition): TireSide {
  return position.startsWith("trai") ? "trai" : "phai";
}

function slotLabel(position: TirePosition) {
  if (position === "trai-ngoai" || position === "phai-ngoai") return "Ngoài";
  if (position === "trai-trong" || position === "phai-trong") return "Trong";
  if (position === "don") return "Lốp đơn";
  return "—";
}

function kindLabel(kind: TireKind) {
  if (kind === "dau") return "Đầu";
  if (kind === "mooc") return "Mooc";
  return "Kho";
}

function formatPlace(place: TirePlace) {
  if (place.kind === "kho") return "Kho";
  if (place.position === "ngoai") return `${kindLabel(place.kind)} ${place.plate} · Nằm ngoài`;
  return `${kindLabel(place.kind)} ${place.plate} · Cầu ${place.axle ?? "—"} · ${sideOf(place.position) === "trai" ? "Bên tài" : "Bên phụ"} ${slotLabel(place.position)}`;
}

function eventTitle(event: TireEvent) {
  if (event.type === "nhap") return "Nhập vào kho";
  if (event.type === "thao") return `Tháo về kho từ ${event.from ? formatPlace(event.from) : "xe"}`;
  if (event.type === "gan") return `Gắn lên ${formatPlace(event.to)}`;
  return `Chuyển từ ${event.from ? formatPlace(event.from) : "chỗ cũ"} sang ${formatPlace(event.to)}`;
}

function useCloseOnEscape(onClose: () => void) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

const primaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#016502] disabled:opacity-50";

const outlineButton =
  "inline-flex h-8 items-center justify-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-3 text-xs font-semibold shadow-sm transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50";

const fieldClass =
  "flex h-10 w-full min-w-0 rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-secondary)]";

const idleFilter =
  "inline-flex h-10 items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border-subtle)] bg-white px-3 text-sm font-semibold";

const activeFilter =
  "inline-flex h-10 items-center justify-center rounded-[var(--radius-button)] bg-[var(--color-text-secondary)] px-3 text-sm font-semibold text-white";
