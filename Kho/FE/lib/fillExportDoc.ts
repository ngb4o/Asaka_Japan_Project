export type ExportDocLine = {
  name: string;
  unit: string;
  quantity: string;
  note: string;
};

export type ExportDocInput = {
  day: number;
  month: number;
  year: number;
  requester: string;
  driverName: string;
  plate: string;
  mooc: string;
  km: string;
  lines: ExportDocLine[];
};

function decodeXml(value: string) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function encodeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paragraphText(paragraph: string) {
  const parts: string[] = [];
  for (const match of paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) {
    parts.push(decodeXml(match[1]));
  }
  return parts.join("");
}

function setParagraphText(paragraph: string, next: string) {
  let first = true;
  return paragraph.replace(/<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (_match, attrs = "") => {
    const value = first ? next : "";
    first = false;
    const space = String(attrs).includes("xml:space") ? attrs : `${attrs} xml:space="preserve"`;
    return `<w:t${space}>${encodeXml(value)}</w:t>`;
  });
}

function fillBlank(text: string, startMarker: string, endMarker: string | null, value: string, keepRemainder = true) {
  const startAt = text.indexOf(startMarker);
  if (startAt < 0) throw new Error(`Không thấy "${startMarker}" trong file Word`);
  const valueStart = startAt + startMarker.length;
  const valueEnd = endMarker == null ? text.length : text.indexOf(endMarker, valueStart);
  if (valueEnd < 0) throw new Error(`Không thấy "${endMarker}" trong file Word`);
  const blank = text.slice(valueStart, valueEnd);
  const written = keepRemainder && value.length < blank.length
    ? value + blank.slice(value.length)
    : `${value}${endMarker ? " " : ""}`;
  return text.slice(0, valueStart) + written + text.slice(valueEnd);
}

function textRun(value: string) {
  return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${encodeXml(value)}</w:t></w:r>`;
}

const tabRunPattern = /<w:r\b[^>]*>(?:(?!<\/w:r>)[\s\S])*?<w:tab\s*\/>\s*<\/w:r>/;

function fillTabGap(paragraph: string, gapIndex: number, value: string) {
  const pattern = new RegExp(tabRunPattern.source, "g");
  let seen = -1;
  let previousEnd = -1;
  let gapStart = -1;
  for (const match of paragraph.matchAll(pattern)) {
    const index = match.index ?? 0;
    const between = previousEnd >= 0 ? paragraph.slice(previousEnd, index) : "";
    if (previousEnd < 0 || between.trim() !== "") {
      seen += 1;
      if (seen === gapIndex) {
        gapStart = index;
        break;
      }
    }
    previousEnd = index + match[0].length;
  }
  if (gapStart < 0) throw new Error("Không thấy khoảng trống trong file Word");
  return value ? paragraph.slice(0, gapStart) + textRun(value) + paragraph.slice(gapStart) : paragraph;
}

function fillTrailingText(paragraph: string, value: string) {
  if (!value) return paragraph;
  const pattern = /<w:t(\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let last: RegExpExecArray | null = null;
  for (const match of paragraph.matchAll(pattern)) last = match;
  if (!last || last.index == null) throw new Error("Không thấy chỗ điền số km trong file Word");
  const attrs = String(last[1] || "");
  const space = attrs.includes("xml:space") ? attrs : `${attrs} xml:space="preserve"`;
  const current = decodeXml(last[2]);
  const prefix = current.endsWith(" ") ? current : `${current} `;
  const updated = `<w:t${space}>${encodeXml(prefix + value)}</w:t>`;
  return paragraph.slice(0, last.index) + updated + paragraph.slice(last.index + last[0].length);
}

function fillParagraphs(xml: string, input: ExportDocInput) {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    const text = paragraphText(paragraph);
    if (text.includes("Ngày") && text.includes("tháng") && text.includes("năm")) {
      let next = fillBlank(text, "Ngày ", "tháng", String(input.day), false);
      next = fillBlank(next, "tháng", "năm", ` ${input.month}`, false);
      next = fillBlank(next, "năm ", null, String(input.year), false);
      return setParagraphText(paragraph, next);
    }
    if (text.includes("Cấp BDSC")) {
      return fillTabGap(paragraph, 0, input.requester.trim());
    }
    if (text.includes("Tên lái xe") && text.includes("Đơn vị")) {
      return fillTabGap(paragraph, 0, input.driverName.trim());
    }
    if (text.includes("BKS") && text.includes("Rơ")) {
      let next = fillTabGap(paragraph, 0, input.plate.trim());
      next = fillTabGap(next, 1, input.mooc.trim());
      return fillTrailingText(next, input.km.trim());
    }
    return paragraph;
  });
}

function setCellText(cell: string, value: string) {
  if (!value) return cell;
  const run = `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${encodeXml(value)}</w:t></w:r>`;
  const end = cell.lastIndexOf("</w:p>");
  if (end < 0) return cell;
  return cell.slice(0, end) + run + cell.slice(end);
}

function fillItemsTable(xml: string, lines: ExportDocLine[]) {
  return xml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, (table) => {
    const plain = [...table.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => decodeXml(match[1])).join("");
    if (!plain.includes("Tên vật tư")) return table;
    let rowIndex = 0;
    return table.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, (row) => {
      const index = rowIndex;
      rowIndex += 1;
      const line = lines[index - 1];
      if (index === 0 || !line) return row;
      let cellIndex = 0;
      return row.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, (cell) => {
        const current = cellIndex;
        cellIndex += 1;
        if (current === 1) return setCellText(cell, line.name);
        if (current === 2) return setCellText(cell, line.unit.trim());
        if (current === 3) return setCellText(cell, line.quantity);
        if (current === 4) return setCellText(cell, line.note);
        return cell;
      });
    });
  });
}

export function fillExportDocumentXml(xml: string, input: ExportDocInput) {
  return fillItemsTable(fillParagraphs(xml, input), input.lines.slice(0, 10));
}

export async function buildFilledExportDoc(template: ArrayBuffer, input: ExportDocInput) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(template);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("File Word không đúng mẫu");
  const xml = await file.async("string");
  zip.file("word/document.xml", fillExportDocumentXml(xml, input));
  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
