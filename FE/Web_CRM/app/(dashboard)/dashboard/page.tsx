"use client";

import Link from "next/link";
import { ArrowLeftRight, Package, Tags, Warehouse } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Xin chào, {user?.username}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-inverse)]">
          Quản lý danh mục và sản phẩm bảo vệ thực vật ASAKA JAPAN
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/product-categories">
          <Card className="transition-shadow hover:shadow-[var(--shadow-elevated)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-[var(--color-text-secondary)]" />
                Loại sản phẩm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--color-text-inverse)]">
                Tạo, sửa, xóa nhóm sản phẩm BVTV
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/products">
          <Card className="transition-shadow hover:shadow-[var(--shadow-elevated)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-[var(--color-text-secondary)]" />
                Sản phẩm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--color-text-inverse)]">
                Quản lý thông tin, giá và trạng thái sản phẩm
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/warehouses">
          <Card className="transition-shadow hover:shadow-[var(--shadow-elevated)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-[var(--color-text-secondary)]" />
                Kho hàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--color-text-inverse)]">
                Quản lý danh sách kho
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventory">
          <Card className="transition-shadow hover:shadow-[var(--shadow-elevated)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-[var(--color-text-secondary)]" />
                Tồn kho
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--color-text-inverse)]">
                Nhập xuất và theo dõi tồn
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
