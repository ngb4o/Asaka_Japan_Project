"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết nhân viên</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
                {employee.fullName}
              </p>
              <p className="mt-0.5 text-sm text-[var(--color-text-inverse)]">
                {employee.code || "—"}
              </p>
            </div>
            <Badge variant={employee.status === "active" ? "success" : "muted"}>
              {employee.status === "active" ? "Đang làm" : "Ngưng"}
            </Badge>
          </div>

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

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)]/40 p-4 sm:grid-cols-3">
            <Field label="Lương cứng">{formatCurrency(employee.baseSalary)}</Field>
            <Field label="Phụ cấp">{formatCurrency(employee.allowance)}</Field>
            <Field label="Hoa hồng">{employee.commissionPercent}%</Field>
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
