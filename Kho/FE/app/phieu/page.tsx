"use client";

import { FileText } from "lucide-react";
import Link from "next/link";

const FORMS = [
  {
    href: "/phieu/xuat-vat-tu",
    title: "Phiếu đề nghị xuất vật tư sửa chữa",
    detail: "Chọn lái xe, nhập số km, chọn vật tư, rồi tải file Word mẫu đã điền.",
  },
  {
    href: "/phieu/de-xuat-thanh-toan",
    title: "Báo cáo đề xuất và thanh toán vật tư",
    detail: "Lưu nháp hoặc tải sheet Excel đúng mẫu, với ngày, nội dung đề xuất và bảng vật tư.",
  },
  {
    href: "/phieu/lam-lop-xe",
    title: "Đề xuất và thanh toán làm lốp xe",
    detail: "Ngày, việc thay lốp, nội dung đề xuất và bảng biển số. Lưu nháp hoặc tải sheet.",
  },
  {
    href: "/phieu/sua-dien-xe",
    title: "Đề xuất và thanh toán sửa điện xe",
    detail: "Ngày, việc sửa điện, nội dung đề xuất và bảng biển số. Lưu nháp hoặc tải sheet.",
  },
  {
    href: "/phieu/vat-tu-phuc-vinh",
    title: "Đề xuất vật tư Phúc Vinh",
    detail: "Ngày, kế hoạch mua hàng và bảng vật tư. Lưu nháp hoặc tải sheet.",
  },
  {
    href: "/phieu/vat-tu-van-phong",
    title: "Đề xuất và thanh toán vật tư văn phòng",
    detail: "Ngày, nội dung đề xuất và bảng văn phòng phẩm. Lưu nháp hoặc tải sheet.",
  },
  {
    href: "/phieu/thue-xe",
    title: "Đề xuất và thanh toán thuê xe",
    detail: "Ngày, nội dung đề xuất và bảng cước thuê xe. Lưu nháp hoặc tải sheet.",
  },
  {
    href: "/phieu/ong-dia",
    title: "Đề xuất và thanh toán ông địa",
    detail: "Ngày, nội dung đề xuất và bảng hoa quả cúng. Lưu nháp hoặc tải sheet.",
  },
  {
    href: "/phieu/han-xe",
    title: "Đề xuất và thanh toán hàn xe",
    detail: "Ngày, nội dung đề xuất và bảng gia công hàn. Lưu nháp hoặc tải sheet.",
  },
  {
    href: "/phieu/gui-hang-viettel",
    title: "Đề xuất và thanh toán gửi hàng Viettel Post",
    detail: "Ngày, nội dung đề xuất và bảng phí cước. Lưu nháp hoặc tải sheet.",
  },
  {
    href: "/phieu/dien-nuoc-vp",
    title: "Đề xuất và thanh toán điện nước văn phòng",
    detail: "Một lần tải 3 sheet: Thanh toán, đề xuất và phiếu báo điện nước.",
  },
];

export default function PhieuPage() {
  return (
    <div className="h-full overflow-y-auto">
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-4 shadow-[var(--shadow-soft)]">
        <h1 className="text-base font-semibold">Phiếu</h1>
        <p className="mt-1 text-sm text-[var(--color-text-inverse)]">Mỗi loại phiếu là một trang riêng.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {FORMS.map((form) => (
            <Link
              key={form.href}
              href={form.href}
              className="flex gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] p-4 shadow-[var(--shadow-card)] hover:bg-[var(--color-surface-muted)]"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#dcfce7] text-[var(--color-text-secondary)]">
                <FileText className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{form.title}</span>
                <span className="mt-1 block text-sm text-[var(--color-text-inverse)]">{form.detail}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
