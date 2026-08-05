import type { SalesReport } from "@/lib/types";
import {
  downloadWorkbook,
  stampXlsxFilename,
  type ExcelSheetSpec,
} from "@/lib/export/xlsx";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  confirmed: "Đã xác nhận",
  delivering: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Hủy",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Chưa thanh toán",
  partial: "Thanh toán một phần",
  paid: "Đã thanh toán",
};

const PRESET_LABELS: Record<string, string> = {
  thisMonth: "Tháng này",
  lastMonth: "Tháng trước",
  last3Months: "3 tháng",
  thisYear: "Năm nay",
  last12Months: "12 tháng",
  custom: "Tùy chọn",
};

const MONEY = "#,##0";

export function buildSalesReportSheets(report: SalesReport): ExcelSheetSpec[] {
  const { period, kpis } = report;
  const presetLabel = PRESET_LABELS[period.preset] || period.preset;

  return [
    {
      name: "Tổng quan",
      columns: [
        { header: "Mục", key: "label", width: 28 },
        { header: "Giá trị", key: "value", width: 22 },
        { header: "Ghi chú", key: "note", width: 32 },
      ],
      rows: [
        { label: "Kỳ báo cáo", value: presetLabel, note: "" },
        {
          label: "Từ ngày",
          value: period.from?.slice(0, 10) || "",
          note: "",
        },
        {
          label: "Đến ngày",
          value: period.to?.slice(0, 10) || "",
          note: "",
        },
        { label: "Nhóm theo", value: period.groupBy, note: "" },
        {
          label: "Doanh số",
          value: kpis.revenue,
          note: `${kpis.revenueChangePercent}% so với kỳ trước`,
        },
        {
          label: "Đã thu",
          value: kpis.paidAmount,
          note: `${kpis.paidChangePercent}% so với kỳ trước`,
        },
        { label: "Công nợ", value: kpis.debt, note: "" },
        {
          label: "Số đơn",
          value: kpis.orderCount,
          note: `${kpis.orderChangePercent}% so với kỳ trước`,
        },
        { label: "Đơn hoàn tất", value: kpis.completedCount, note: "" },
        { label: "Doanh thu hoàn tất", value: kpis.completedRevenue, note: "" },
        { label: "Giá trị đơn TB", value: kpis.avgOrderValue, note: "" },
        { label: "Giá vốn", value: kpis.costTotal ?? 0, note: "" },
        {
          label: "Lãi gộp",
          value: kpis.grossProfit ?? 0,
          note:
            kpis.grossProfitChangePercent != null
              ? `${kpis.grossProfitChangePercent}% so với kỳ trước`
              : "",
        },
        {
          label: "Biên lãi gộp (%)",
          value: kpis.revenue
            ? Math.round(((kpis.grossProfit || 0) / kpis.revenue) * 1000) / 10
            : 0,
          note: "Lãi gộp / doanh số",
        },
      ],
    },
    {
      name: "Theo kỳ",
      columns: [
        { header: "Kỳ", key: "key", width: 14 },
        { header: "Nhãn", key: "label", width: 18 },
        { header: "Doanh số", key: "revenue", width: 16, numFmt: MONEY },
        { header: "Đã thu", key: "paidAmount", width: 16, numFmt: MONEY },
        { header: "Số đơn", key: "orderCount", width: 12 },
      ],
      rows: (report.series || []).map((point) => ({
        key: point.key,
        label: point.label,
        revenue: point.revenue,
        paidAmount: point.paidAmount,
        orderCount: point.orderCount,
      })),
    },
    {
      name: "Trạng thái đơn",
      columns: [
        { header: "Trạng thái", key: "status", width: 18 },
        { header: "Số đơn", key: "count", width: 12 },
        { header: "Doanh số", key: "revenue", width: 16, numFmt: MONEY },
      ],
      rows: (report.statusBreakdown || []).map((item) => ({
        status: ORDER_STATUS_LABELS[item.status] || item.status,
        count: item.count,
        revenue: item.revenue,
      })),
    },
    {
      name: "Thanh toán",
      columns: [
        { header: "Trạng thái TT", key: "status", width: 22 },
        { header: "Số đơn", key: "count", width: 12 },
        { header: "Giá trị đơn", key: "total", width: 16, numFmt: MONEY },
        { header: "Đã thu", key: "paidAmount", width: 16, numFmt: MONEY },
      ],
      rows: (report.paymentBreakdown || []).map((item) => ({
        status: PAYMENT_LABELS[item.status] || item.status,
        count: item.count,
        total: item.total,
        paidAmount: item.paidAmount,
      })),
    },
    {
      name: "Đại lý",
      columns: [
        { header: "Đại lý", key: "dealerName", width: 28 },
        { header: "Khu vực", key: "region", width: 16 },
        { header: "Số đơn", key: "orderCount", width: 12 },
        { header: "Doanh số", key: "revenue", width: 16, numFmt: MONEY },
        { header: "Đã thu", key: "paidAmount", width: 16, numFmt: MONEY },
      ],
      rows: (report.topDealers || []).map((item) => ({
        dealerName: item.dealerName,
        region: item.region || "",
        orderCount: item.orderCount,
        revenue: item.revenue,
        paidAmount: item.paidAmount,
      })),
    },
    {
      name: "Sản phẩm",
      columns: [
        { header: "Sản phẩm", key: "productName", width: 32 },
        { header: "Số lượng", key: "quantity", width: 12 },
        { header: "Doanh số", key: "revenue", width: 16, numFmt: MONEY },
      ],
      rows: (report.topProducts || []).map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        revenue: item.revenue,
      })),
    },
    {
      name: "Nhân viên",
      columns: [
        { header: "Nhân viên", key: "staffName", width: 24 },
        { header: "Mã NV", key: "employeeCode", width: 12 },
        { header: "Số đơn", key: "orderCount", width: 12 },
        { header: "Doanh số", key: "revenue", width: 16, numFmt: MONEY },
        { header: "Đã thu", key: "paidAmount", width: 16, numFmt: MONEY },
      ],
      rows: (report.topStaff || []).map((item) => ({
        staffName: item.staffName,
        employeeCode: item.employeeCode || "",
        orderCount: item.orderCount,
        revenue: item.revenue,
        paidAmount: item.paidAmount,
      })),
    },
  ];
}

export async function downloadSalesReportExcel(report: SalesReport) {
  const sheets = buildSalesReportSheets(report);
  const filename = stampXlsxFilename(
    "bao-cao-doanh-so",
    report.period.from?.slice(0, 10),
    report.period.to?.slice(0, 10)
  );
  await downloadWorkbook(filename, sheets);
}
