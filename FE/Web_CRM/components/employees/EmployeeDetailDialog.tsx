"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MobileMetaChip,
  MobileRecordCard,
} from "@/components/ui/mobile-record-card";
import type { Employee } from "@/lib/types";
import { formatCurrency, formatDateDisplay } from "@/lib/utils";

type EmployeeDetailDialogProps = {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-[var(--color-text-inverse)]">{label}</p>
      <div className="text-sm text-[var(--color-text-primary)]">{children}</div>
    </div>
  );
}

export function EmployeeDetailDialog({
  employee,
  open,
  onOpenChange,
}: EmployeeDetailDialogProps) {
  if (!employee) return null;

  const contact = [employee.phone, employee.email].filter(Boolean).join(" · ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết nhân viên</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <MobileRecordCard className="p-4 shadow-none">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                  {employee.code || "—"}
                </p>
                <p className="mt-1 text-[15px] font-medium leading-snug text-[var(--color-text-primary)]">
                  {employee.fullName}
                </p>
                {contact ? (
                  <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                    {contact}
                  </p>
                ) : null}
              </div>
              <Badge
                variant={employee.status === "active" ? "success" : "muted"}
                className="shrink-0">
                {employee.status === "active" ? "Đang làm" : "Ngưng"}
              </Badge>
            </div>

            <div className="mt-3.5 flex items-end justify-between gap-4 border-y border-[var(--color-border-subtle)] py-3">
              <div>
                <p className="text-xs text-[var(--color-text-inverse)]">
                  Lương cứng
                </p>
                <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-secondary)]">
                  {formatCurrency(employee.baseSalary)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--color-text-inverse)]">
                  HH / Phụ cấp
                </p>
                <p className="mt-0.5 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                  {employee.commissionPercent}% ·{" "}
                  {formatCurrency(employee.allowance)}
                </p>
              </div>
            </div>

            {(employee.title || employee.department || employee.userName) ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {employee.title ? (
                  <MobileMetaChip>{employee.title}</MobileMetaChip>
                ) : null}
                {employee.department ? (
                  <MobileMetaChip>{employee.department}</MobileMetaChip>
                ) : null}
                {employee.userName ? (
                  <MobileMetaChip>TK: {employee.userName}</MobileMetaChip>
                ) : null}
              </div>
            ) : null}
          </MobileRecordCard>

          <div className="grid grid-cols-2 gap-3">
            <Field label="SĐT">{employee.phone || "—"}</Field>
            <Field label="Email">{employee.email || "—"}</Field>
            <Field label="Chức vụ">{employee.title || "—"}</Field>
            <Field label="Phòng ban">{employee.department || "—"}</Field>
            <Field label="Tài khoản CRM">{employee.userName || "—"}</Field>
            <Field label="Ngày tạo">
              {formatDateDisplay(employee.createdAt) || "—"}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngân hàng">{employee.bankName || "—"}</Field>
            <Field label="Số tài khoản">{employee.bankAccount || "—"}</Field>
          </div>

          {employee.bankQrImage ? (
            <Field label="Ảnh QR ngân hàng">
              <div className="relative mt-1 h-40 w-40 overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-white">
                <Image
                  src={employee.bankQrImage}
                  alt={`QR ${employee.fullName}`}
                  fill
                  className="object-contain p-2"
                  unoptimized
                />
              </div>
            </Field>
          ) : null}

          {employee.note ? (
            <Field label="Ghi chú">
              <p className="whitespace-pre-wrap">{employee.note}</p>
            </Field>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
