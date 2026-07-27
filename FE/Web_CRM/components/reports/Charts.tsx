"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const CHART_COLORS = ["#017d03", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

function currencyTick(value: number) {
  if (value >= 1_000_000_000) return `${Math.round(value / 1_000_000_000)} tỷ`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

export function RevenueAreaChart({
  data,
  height = 280,
}: {
  data: { label: string; revenue: number; paidAmount: number; orderCount: number }[];
  height?: number;
}) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#017d03" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#017d03" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="paidFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 8" stroke="var(--color-border-subtle)" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--color-text-inverse)" }}
          />
          <YAxis
            tickFormatter={currencyTick}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--color-text-inverse)" }}
            width={48}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === "revenue" ? "Doanh số" : "Đã thu",
            ]}
            labelStyle={{ color: "var(--color-text-primary)", fontWeight: 600 }}
            contentStyle={{
              borderRadius: 14,
              border: "1px solid var(--color-border-subtle)",
              background: "var(--color-surface-elevated)",
              boxShadow: "var(--shadow-elevated)",
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            formatter={(value) => (value === "revenue" ? "Doanh số" : "Đã thu")}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#017d03"
            fill="url(#revenueFill)"
            strokeWidth={2.5}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="paidAmount"
            stroke="#0ea5e9"
            fill="url(#paidFill)"
            strokeWidth={2.5}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrdersBarChart({
  data,
}: {
  data: { label: string; orderCount: number }[];
}) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="var(--color-border-subtle)" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--color-text-inverse)" }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--color-text-inverse)" }}
            width={32}
          />
          <Tooltip
            formatter={(value: number) => [value, "Số đơn"]}
            contentStyle={{
              borderRadius: 14,
              border: "1px solid var(--color-border-subtle)",
              background: "var(--color-surface-elevated)",
              boxShadow: "var(--shadow-elevated)",
            }}
          />
          <Bar dataKey="orderCount" fill="#017d03" radius={[8, 8, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusPieChart({
  data,
  height = 240,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  const filtered = data.filter((item) => item.value > 0);
  if (!filtered.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-[var(--color-text-inverse)]"
        style={{ height }}
      >
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={3}
            stroke="var(--color-surface-elevated)"
            strokeWidth={3}
          >
            {filtered.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 14,
              border: "1px solid var(--color-border-subtle)",
              background: "var(--color-surface-elevated)",
              boxShadow: "var(--shadow-elevated)",
            }}
          />
          <Legend iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RankingBarChart({
  data,
  valueKey = "revenue",
}: {
  data: { name: string; revenue: number; orderCount?: number }[];
  valueKey?: "revenue" | "orderCount";
}) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={valueKey === "revenue" ? currencyTick : undefined}
            tick={{ fontSize: 12, fill: "var(--color-text-inverse)" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 12, fill: "var(--color-text-inverse)" }}
          />
          <Tooltip
            formatter={(value: number) => [
              valueKey === "revenue" ? formatCurrency(value) : value,
              valueKey === "revenue" ? "Doanh số" : "Số đơn",
            ]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--color-border-subtle)",
              background: "var(--color-surface-elevated)",
            }}
          />
          <Bar dataKey={valueKey} fill="#017d03" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
