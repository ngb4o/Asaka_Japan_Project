/**
 * CSV helpers tuned for Excel (UTF-8 BOM + semicolon separator — common VN locale).
 */

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const raw = String(value);
  if (/[;"\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function rowsToCsv(
  rows: Array<Array<string | number | null | undefined>>,
  separator = ";"
): string {
  return rows.map((row) => row.map(escapeCsvCell).join(separator)).join("\r\n");
}

/** Trigger browser download. Adds UTF-8 BOM so Excel keeps Vietnamese accents. */
export function downloadCsv(filename: string, csvBody: string) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvBody], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeName = filename.endsWith(".csv") ? filename : `${filename}.csv`;

  anchor.href = url;
  anchor.download = safeName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function stampFilename(prefix: string, from?: string, to?: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (from && to) return `${prefix}_${from}_${to}_${stamp}.csv`;
  return `${prefix}_${stamp}.csv`;
}
