export type PhucVinhSheetLine = {
  name: string;
  unit: string;
  quantity: number;
  price: number | null;
  stock: number | null;
  supplier: string;
  receiver: string;
};

export type PhucVinhSheetInput = {
  reportDate: string;
  subject: string;
  content: string;
  lines: PhucVinhSheetLine[];
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
  "xl/printerSettings/printerSettings1.bin",
]);

const DATA_ROW = 16;
const FOOTER_ROW = 17;

export async function buildFilledPhucVinhSheet(template: ArrayBuffer, input: PhucVinhSheetInput) {
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
  const strings = await appendStrings(await stringsFile.async("string"), input.subject.trim(), packed.texts);
  const delta = input.lines.length - 1;
  const parsed = parseIsoDate(input.reportDate);
  const sheetName = parsed
    ? `${String(parsed.day).padStart(2, "0")}-${String(parsed.month).padStart(2, "0")}-${parsed.year}`
    : "Phuc-vinh";

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

function packStrings(input: PhucVinhSheetInput) {
  const texts = [dateLabel(input.reportDate), input.content.trim()];
  const lines = input.lines.map((line) => {
    const name = texts.length;
    texts.push(line.name.trim());
    let unit = -1;
    if (line.unit.trim()) {
      unit = texts.length;
      texts.push(line.unit.trim());
    }
    let supplier = -1;
    if (line.supplier.trim()) {
      supplier = texts.length;
      texts.push(line.supplier.trim());
    }
    let receiver = -1;
    if (line.receiver.trim()) {
      receiver = texts.length;
      texts.push(line.receiver.trim());
    }
    return { name, unit, supplier, receiver };
  });
  return { texts, lines };
}

async function appendStrings(xml: string, subject: string, texts: string[]) {
  const existing = [...xml.matchAll(/<si\b/g)].length;
  const added = titleString(subject) + texts.map((text) => `<si><t xml:space="preserve">${encodeXml(text)}</t></si>`).join("");
  const next = existing + 1 + texts.length;
  return {
    xml: xml
      .replace(/count="\d+"/, `count="${next}"`)
      .replace(/uniqueCount="\d+"/, `uniqueCount="${next}"`)
      .replace("</sst>", `${added}</sst>`),
    base: existing + 1,
    title: existing,
  };
}

function titleString(subject: string) {
  return `<si><r><rPr><b/><sz val="16"/><color theme="1"/><rFont val="Times New Roman"/><family val="1"/></rPr><t>BÁO CÁO &amp; ĐỀ XUẤT</t></r><r><rPr><b/><sz val="13"/><color theme="1"/><rFont val="Times New Roman"/><family val="1"/></rPr><t xml:space="preserve">\n</t></r><r><rPr><i/><sz val="13"/><color theme="1"/><rFont val="Times New Roman"/><family val="1"/></rPr><t>${encodeXml(subject)}</t></r></si>`;
}

function fillSheet(sheet: string, input: PhucVinhSheetInput, base: number, packed: ReturnType<typeof packStrings>, delta: number) {
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
    if (current < FOOTER_ROW) return [];
    return [renumberRow(row, current, current + delta)];
  }).join("");
  let next = sheet.replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData>${rebuilt}</sheetData>`);
  next = next.replace(/<dimension ref="[^"]+"/, `<dimension ref="A1:H${27 + delta}"`);
  next = next.replace(/ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/g, (match, left, start, right, end) => {
    const first = Number(start);
    if (first < FOOTER_ROW) return match;
    return `ref="${left}${first + delta}:${right}${Number(end) + delta}"`;
  });
  next = replaceSharedCell(next, "A3", base - 1);
  next = replaceSharedCell(next, `A${19 + delta}`, base);
  next = replaceSharedCell(next, "B13", base + 1);
  return next;
}

function shiftIndex(line: { name: number; unit: number; supplier: number; receiver: number }, base: number) {
  return {
    name: base + line.name,
    unit: line.unit < 0 ? -1 : base + line.unit,
    supplier: line.supplier < 0 ? -1 : base + line.supplier,
    receiver: line.receiver < 0 ? -1 : base + line.receiver,
  };
}

function fillDataRow(
  rowXml: string,
  line: PhucVinhSheetLine,
  index: number,
  strings: { name: number; unit: number; supplier: number; receiver: number },
) {
  const row = rowNumber(rowXml);
  let xml = rowXml;
  xml = setNumber(xml, `A${row}`, index + 1);
  xml = setShared(xml, `B${row}`, strings.name);
  xml = strings.unit < 0 ? setBlank(xml, `C${row}`) : setShared(xml, `C${row}`, strings.unit);
  xml = setNumber(xml, `D${row}`, line.quantity);
  xml = line.price == null ? setBlank(xml, `E${row}`) : setNumber(xml, `E${row}`, line.price);
  xml = line.stock == null ? setBlank(xml, `F${row}`) : setNumber(xml, `F${row}`, line.stock);
  xml = strings.supplier < 0 ? setBlank(xml, `G${row}`) : setShared(xml, `G${row}`, strings.supplier);
  xml = strings.receiver < 0 ? setBlank(xml, `H${row}`) : setShared(xml, `H${row}`, strings.receiver);
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
  const shifted = xml.replace(
    new RegExp(`(<c r="${ref}"[^>]*t="s"><v>)\\d+(</v></c>)`),
    `$1${index}$2`,
  );
  if (shifted === xml) throw new Error("File Excel không đúng mẫu");
  return shifted;
}

function singleSheet(xml: string, name: string) {
  return xml.replace(/<sheets>[\s\S]*?<\/sheets>/, `<sheets><sheet name="${encodeXml(name)}" sheetId="27" r:id="rId1"/></sheets>`);
}

function trimWorkbookRels(xml: string) {
  return xml
    .replace(/<Relationship\b[^>]*Target="worksheets\/sheet(?!1\.xml")[^"]*"[^>]*\/>/g, "")
    .replace(/<Relationship\b[^>]*Target="calcChain\.xml"[^>]*\/>/g, "");
}

function trimContentTypes(xml: string) {
  return xml
    .replace(/<Override\b[^>]*PartName="\/xl\/worksheets\/sheet(?:[2-9]|1[0-9]|2[0-6])\.xml"[^>]*\/>/g, "")
    .replace(/<Override\b[^>]*PartName="\/xl\/drawings\/drawing\d+\.xml"[^>]*\/>/g, "")
    .replace(/<Override\b[^>]*PartName="\/xl\/printerSettings\/printerSettings(?!1\.bin")[^"]*"[^>]*\/>/g, "")
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
  return `Đà Nẵng, ngày ${parsed.day} tháng ${parsed.month} năm ${parsed.year}`;
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
