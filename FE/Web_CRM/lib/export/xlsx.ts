import type ExcelJS from "exceljs";

export type ExcelCellValue = string | number | null | undefined | Date;

export type ExcelColumn = {
  header: string;
  key: string;
  width?: number;
  /** exceljs numFmt, e.g. '#,##0' */
  numFmt?: string;
};

export type ExcelSheetSpec = {
  name: string;
  columns: ExcelColumn[];
  rows: Record<string, ExcelCellValue>[];
};

const HEADER_FILL = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FF017D03" },
};

const HEADER_FONT = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
  name: "Calibri",
};

const BODY_FONT = {
  size: 11,
  name: "Calibri",
};

const THIN_BORDER = {
  top: { style: "thin" as const, color: { argb: "FFD0D5DD" } },
  left: { style: "thin" as const, color: { argb: "FFD0D5DD" } },
  bottom: { style: "thin" as const, color: { argb: "FFD0D5DD" } },
  right: { style: "thin" as const, color: { argb: "FFD0D5DD" } },
};

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.height = 22;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = THIN_BORDER;
  });
}

function styleBodyRows(sheet: ExcelJS.Worksheet, columns: ExcelColumn[]) {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.height = 18;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = BODY_FONT;
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: "middle" };
      const col = columns[colNumber - 1];
      if (typeof cell.value === "number") {
        cell.numFmt = col?.numFmt || "#,##0";
      }
    });
  });
}

export async function buildWorkbookBuffer(sheets: ExcelSheetSpec[]): Promise<ArrayBuffer> {
  const ExcelJSMod = await import("exceljs");
  const Workbook = ExcelJSMod.default?.Workbook ?? ExcelJSMod.Workbook;
  const workbook = new Workbook();
  workbook.creator = "ASAKA CRM";
  workbook.created = new Date();

  for (const spec of sheets) {
    const safeName = spec.name.replace(/[\\/?*[\]]/g, " ").slice(0, 31) || "Sheet";
    const sheet = workbook.addWorksheet(safeName, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = spec.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width ?? Math.max(12, col.header.length + 2),
    }));

    if (spec.rows.length === 0) {
      sheet.addRow(
        Object.fromEntries(
          spec.columns.map((col, index) => [col.key, index === 0 ? "Không có dữ liệu" : ""])
        )
      );
    } else {
      for (const row of spec.rows) {
        sheet.addRow(row);
      }
    }

    styleHeaderRow(sheet);
    styleBodyRows(sheet, spec.columns);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export async function downloadWorkbook(filename: string, sheets: ExcelSheetSpec[]) {
  const buffer = await buildWorkbookBuffer(sheets);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;

  anchor.href = url;
  anchor.download = safeName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function stampXlsxFilename(prefix: string, from?: string, to?: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (from && to) return `${prefix}_${from}_${to}.xlsx`;
  return `${prefix}_${stamp}.xlsx`;
}
