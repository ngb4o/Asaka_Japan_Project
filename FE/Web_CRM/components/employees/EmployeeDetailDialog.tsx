"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InfoTable } from "@/components/ui/info-table";
import {
  MobileMetaChip,
  MobileRecordCard,
} from "@/components/ui/mobile-record-card";
import { PreviewableImage } from "@/components/ui/previewable-image";
import { CodeText, Copyable, PhoneLink } from "@/components/ui/smart-text";
import type { Employee } from "@/lib/types";
import { formatCurrency, formatDateDisplay } from "@/lib/utils";

type EmployeeDetailDialogProps = {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

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
          <MobileRecordCard className="p-4 shadow-none">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
                  {employee.code ? (
                    <CodeText value={employee.code} label="mã nhân viên" />
                  ) : (
                    "—"
                  )}
                </p>
                <p className="mt-1 text-[16px] font-medium leading-snug text-[var(--color-text-primary)]">
                  {employee.fullName}
                </p>
                {employee.phone ? (
                  <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
                    <PhoneLink value={employee.phone} />
                  </p>
                ) : null}
                {employee.email ? (
                  <p className="mt-0.5 text-sm text-[var(--color-text-inverse)]">
                    <Copyable value={employee.email} label="email" />
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

            {employee.title || employee.department || employee.userName ? (
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

          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Hồ sơ
            </h4>
            <InfoTable
              rows={[
                { label: "SĐT", value: employee.phone, action: "call" },
                { label: "Email", value: employee.email, action: "copy" },
                { label: "Chức vụ", value: employee.title },
                { label: "Phòng ban", value: employee.department },
                { label: "Tài khoản CRM", value: employee.userName },
                {
                  label: "Ngày tạo",
                  value: formatDateDisplay(employee.createdAt),
                },
                { label: "Ghi chú", value: employee.note },
              ]}
            />
          </section>

          {(employee.bankName ||
          employee.bankAccount ||
          employee.bankQrImage) ? (
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Ngân hàng
            </h4>
            <InfoTable
              rows={[
                { label: "Ngân hàng", value: employee.bankName },
                {
                  label: "Số tài khoản",
                  value: employee.bankAccount,
                  action: "copy",
                },
                employee.bankQrImage
                  ? {
                      label: "QR ngân hàng",
                      extra: (
                        <div className="relative h-36 w-36 overflow-hidden rounded-lg">
                          <PreviewableImage
                            src={employee.bankQrImage}
                            alt={`QR ${employee.fullName}`}
                            fill
                            imgClassName="object-contain bg-white p-2"
                            className="rounded-lg"
                          />
                        </div>
                      ),
                    }
                  : { label: "QR ngân hàng", value: "" },
              ]}
            />
          </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
