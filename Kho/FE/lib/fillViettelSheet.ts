export type ViettelSheetLine = {
  date: string;
  receiver: string;
  fee: number;
  note: string;
};

export type ViettelSheetInput = {
  reportDate: string;
  subject: string;
  content: string;
  lines: ViettelSheetLine[];
};

const KEEP = new Set([
  "[Content_Types].xml",
  "_rels/.rels",
  "docProps/core.xml",
  "docProps/app.xml",
  "xl/workbook.xml",
  "xl/_rels/workbook.xml.rels",
  "xl/styles.xml",
  "xl/theme/theme1.xml",
  "xl/sharedStrings.xml",
  "xl/worksheets/sheet1.xml",
  "xl/worksheets/_rels/sheet1.xml.rels",
  "xl/drawings/drawing1.xml",
  "xl/drawings/_rels/drawing1.xml.rels",
  "xl/media/image1.jpeg",
  "xl/printerSettings/printerSettings1.bin",
]);

const DATA_ROW = 19;
const TOTAL_ROW = 20;
const TEMPLATE_DATA_ROWS = 1;

export async function buildFilledViettelSheet(template: ArrayBuffer, input: ViettelSheetInput) {
  if (!input.lines.length || input.lines.length > 30) {
    throw new Error("Một báo cáo từ 1 đến 30 dòng");
  }
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(template);
  const sheetFile = zip.file("xl/worksheets/sheet1.xml");
  const stringsFile = zip.file("xl/sharedStrings.xml");
  const workbookFile = zip.file("xl/workbook.xml");
  if (!sheetFile || !stringsFile || !workbookFile) throw new Error("File Excel không đúng mẫu");

  const packed = packStrings(input);
  const strings = await appendStrings(await stringsFile.async("string"), packed.texts);
  const delta = input.lines.length - TEMPLATE_DATA_ROWS;
  const parsed = parseIsoDate(input.reportDate);
  const sheetName = parsed
    ? `${String(parsed.day).padStart(2, "0")}-${String(parsed.month).padStart(2, "0")}-${parsed.year}`
    : "Gui-hang";

  zip.file("xl/sharedStrings.xml", strings.xml);
  zip.file("xl/worksheets/sheet1.xml", fillSheet(await sheetFile.async("string"), input, strings.base, packed, delta));
  zip.file("xl/workbook.xml", singleSheet(await workbookFile.async("string"), sheetName));
  zip.file("xl/_rels/workbook.xml.rels", trimWorkbookRels(await readZip(zip, "xl/_rels/workbook.xml.rels")));
  zip.file("[Content_Types].xml", trimContentTypes(await readZip(zip, "[Content_Types].xml")));
  zip.file("docProps/app.xml", singleAppPart(await readZip(zip, "docProps/app.xml"), sheetName));

  for (const name of Object.keys(zip.files)) {
    if (!zip.files[name].dir && !KEEP.has(name)) zip.remove(name);
  }

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function packStrings(input: ViettelSheetInput) {
  const texts = [dateLabel(input.reportDate), input.subject.trim(), viettelContent(input.content)];
  const lines = input.lines.map((line) => {
    const receiver = texts.length;
    texts.push(line.receiver.trim());
    let note = -1;
    if (line.note.trim()) {
      note = texts.length;
      texts.push(line.note.trim());
    }
    return { receiver, note };
  });
  return { texts, lines };
}

async function appendStrings(xml: string, texts: string[]) {
  const existing = [...xml.matchAll(/<si\b/g)].length;
  const added = texts.map((text) => `<si><t xml:space="preserve">${encodeXml(text)}</t></si>`).join("");
  const next = existing + texts.length;
  return {
    xml: xml
      .replace(/count="\d+"/, `count="${next}"`)
      .replace(/uniqueCount="\d+"/, `uniqueCount="${next}"`)
      .replace("</sst>", `${added}</sst>`),
    base: existing,
  };
}

function fillSheet(sheet: string, input: ViettelSheetInput, base: number, packed: ReturnType<typeof packStrings>, delta: number) {
  const rows = [...sheet.matchAll(/<row\b[^>]*\/>|<row\b[^>]*>[\s\S]*?<\/row>/g)].map((match) => match[0]);
  const prototype = rows.find((row) => rowNumber(row) === DATA_ROW);
  if (!prototype) throw new Error("File Excel không đúng mẫu");
  const dataRows = input.lines.map((line, index) => fillDataRow(
    renumberRow(prototype, DATA_ROW, DATA_ROW + index),
    line,
    index,
    shiftIndex(packed.lines[index], base),
  ));
  const rebuilt = rows.flatMap((row) => {
    const current = rowNumber(row);
    if (current < DATA_ROW) return [row];
    if (current === DATA_ROW) return dataRows;
    if (current < TOTAL_ROW) return [];
    return [renumberRow(row, current, current + delta)];
  }).join("");
  const total = input.lines.reduce((sum, line) => sum + line.fee, 0);
  const totalRow = TOTAL_ROW + delta;
  const lastDataRow = DATA_ROW + input.lines.length - 1;
  let next = sheet.replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData>${rebuilt}</sheetData>`);
  next = next.replace(/<dimension ref="[^"]+"/, `<dimension ref="A1:G${31 + delta}"`);
  next = next.replace(/ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/g, (match, left, start, right, end) => {
    const first = Number(start);
    if (first < TOTAL_ROW) return match;
    return `ref="${left}${first + delta}:${right}${Number(end) + delta}"`;
  });
  next = next.replace(
    new RegExp(`(<c r="D${totalRow}"[^>]*>)<f[^>]*>[^<]*</f><v>[^<]*</v>`),
    `$1<f>SUM(D${DATA_ROW}:D${lastDataRow})</f><v>${total}</v>`,
  );
  next = replaceSharedCell(next, "D4", base);
  next = replaceSharedCell(next, "A6", base + 1);
  next = replaceSharedCell(next, "A17", base + 2);
  return next;
}

function shiftIndex(line: { receiver: number; note: number }, base: number) {
  return {
    receiver: base + line.receiver,
    note: line.note < 0 ? -1 : base + line.note,
  };
}

function fillDataRow(
  rowXml: string,
  line: ViettelSheetLine,
  index: number,
  strings: { receiver: number; note: number },
) {
  const row = rowNumber(rowXml);
  let xml = rowXml;
  xml = setNumber(xml, `A${row}`, index + 1);
  xml = setNumber(xml, `B${row}`, excelSerial(line.date));
  xml = setShared(xml, `C${row}`, strings.receiver);
  xml = setNumber(xml, `D${row}`, line.fee);
  xml = strings.note < 0 ? setBlank(xml, `E${row}`) : setShared(xml, `E${row}`, strings.note);
  return xml;
}

function rowNumber(rowXml: string) {
  const match = rowXml.match(/\br="(\d+)"/);
  if (!match) throw new Error("File Excel không đúng mẫu");
  return Number(match[1]);
}

function renumberRow(rowXml: string, current: number, next: number) {
  if (current === next) return rowXml;
  return rowXml
    .replace(new RegExp(`\\b([A-Z]{1,3})${current}\\b`, "g"), `$1${next}`)
    .replace(`r="${current}"`, `r="${next}"`);
}

function setNumber(xml: string, ref: string, value: number) {
  return replaceCell(xml, ref, (attrs) => `<c r="${ref}"${attrs.replace(/\s*t="[^"]*"/g, "")}><v>${value}</v></c>`);
}

function setShared(xml: string, ref: string, index: number) {
  return replaceCell(xml, ref, (attrs) => {
    const style = attrs.match(/\bs="[^"]*"/)?.[0] || "";
    return `<c r="${ref}" ${style} t="s"><v>${index}</v></c>`;
  });
}

function setBlank(xml: string, ref: string) {
  return replaceCell(xml, ref, (attrs) => {
    const style = attrs.match(/\bs="[^"]*"/)?.[0] || "";
    return `<c r="${ref}" ${style}/>`;
  });
}

function replaceCell(xml: string, ref: string, render: (attrs: string) => string) {
  return xml.replace(new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)`), (_, attrs: string) => render(attrs));
}

function replaceSharedCell(xml: string, ref: string, index: number) {
  const shifted = xml.replace(new RegExp(`(<c r="${ref}"[^>]*t="s"><v>)\\d+(</v></c>)`), `$1${index}$2`);
  if (shifted === xml) throw new Error("File Excel không đúng mẫu");
  return shifted;
}

function singleSheet(xml: string, name: string) {
  return xml.replace(/<sheets>[\s\S]*?<\/sheets>/, `<sheets><sheet name="${encodeXml(name)}" sheetId="14" r:id="rId1"/></sheets>`);
}

function trimWorkbookRels(xml: string) {
  return xml
    .replace(/<Relationship\b[^>]*Target="worksheets\/sheet(?!1\.xml")[^"]*"[^>]*\/>/g, "")
    .replace(/<Relationship\b[^>]*Target="calcChain\.xml"[^>]*\/>/g, "");
}

function trimContentTypes(xml: string) {
  return xml
    .replace(/<Override\b[^>]*PartName="\/xl\/worksheets\/sheet(?!1\.xml")[^"]*"[^>]*\/>/g, "")
    .replace(/<Override\b[^>]*PartName="\/xl\/drawings\/drawing(?!1\.xml")[^"]*"[^>]*\/>/g, "")
    .replace(/<Override\b[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, "");
}

function singleAppPart(xml: string, name: string) {
  return xml
    .replace(/<vt:i4>\d+<\/vt:i4>/, "<vt:i4>1</vt:i4>")
    .replace(/<TitlesOfParts>[\s\S]*?<\/TitlesOfParts>/, `<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>${encodeXml(name)}</vt:lpstr></vt:vector></TitlesOfParts>`);
}

function dateLabel(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return value;
  const day = String(parsed.day).padStart(2, "0");
  const month = String(parsed.month).padStart(2, "0");
  return `Đà Nẵng, ngày ${day} tháng ${month} năm ${parsed.year}`;
}

function viettelContent(value: string) {
  const text = value.trim();
  if (text.startsWith("Nội dung đề xuất gồm:")) return text;
  return `Nội dung đề xuất gồm: ${text}`;
}

function excelSerial(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return 0;
  const utc = Date.UTC(parsed.year, parsed.month - 1, parsed.day);
  const epoch = Date.UTC(1899, 11, 30);
  return Math.round((utc - epoch) / 86400000);
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { year, month, day };
}

function encodeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function readZip(zip: { file: (name: string) => { async: (type: "string") => Promise<string> } | null }, name: string) {
  const file = zip.file(name);
  if (!file) throw new Error("File Excel không đúng mẫu");
  return file.async("string");
}
