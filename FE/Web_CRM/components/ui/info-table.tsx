"use client";

import type { ReactNode } from "react";
import { CodeText, PhoneLink, TrackingText } from "@/components/ui/smart-text";
import { cn } from "@/lib/utils";

export type InfoTableAction = "copy" | "call" | "tracking";

export type InfoTableRow = {
  label: string;
  value?: string | number | null;
  action?: InfoTableAction;
  extra?: ReactNode;
};

function InfoValue({
  value,
  action,
  label,
}: {
  value: string;
  action?: InfoTableAction;
  label: string;
}) {
  if (action === "call") return <PhoneLink value={value} />;
  if (action === "tracking") return <TrackingText value={value} />;
  if (action === "copy") return <CodeText value={value} label={label.toLowerCase()} />;
  return <>{value}</>;
}

export function InfoTable({
  rows,
  className,
}: {
  rows: InfoTableRow[];
  className?: string;
}) {
  const visible = rows.filter(
    (row) =>
      (row.value != null && String(row.value) !== "") || row.extra
  );
  if (!visible.length) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-button)] border border-[var(--color-border-subtle)]",
        className
      )}>
      <table className="w-full text-sm">
        <tbody>
          {visible.map((row, index) => {
            const text =
              row.value != null && String(row.value) !== ""
                ? String(row.value)
                : "";
            return (
              <tr
                key={`${row.label}-${index}`}
                className="border-b border-[var(--color-border-subtle)] last:border-b-0">
                <th
                  scope="row"
                  className="w-[7.5rem] shrink-0 bg-[var(--color-surface-muted)]/50 px-3 py-2.5 text-left align-top text-xs font-medium text-[var(--color-text-inverse)] sm:w-36">
                  {row.label}
                </th>
                <td className="px-3 py-2.5 align-top font-medium text-[var(--color-text-primary)]">
                  {row.extra ? (
                    <div
                      className={
                        text
                          ? "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                          : ""
                      }>
                      {text ? (
                        <div className="min-w-0 whitespace-pre-wrap">
                          <InfoValue
                            value={text}
                            action={row.action}
                            label={row.label}
                          />
                        </div>
                      ) : null}
                      <div
                        className={
                          text ? "w-full shrink-0 sm:ml-auto sm:w-auto" : ""
                        }>
                        {row.extra}
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">
                      {text ? (
                        <InfoValue
                          value={text}
                          action={row.action}
                          label={row.label}
                        />
                      ) : (
                        "—"
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
