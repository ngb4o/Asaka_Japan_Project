export type ElectricSheetLine = {
  date: string;
  plate: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  note: string;
};

export type ElectricSheetInput = {
  reportDate: string;
  subject: string;
  content: string;
  lines: ElectricSheetLine[];
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
const TOTAL_ROW = 21;
const TEMPLATE_DATA_ROWS = 2;

export async function buildFilledElectricSheet(template: ArrayBuffer, input: ElectricSheetInput) {
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
    : "Sua-dien";

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

function packStrings(input: ElectricSheetInput) {
  const texts = [dateLabel(input.reportDate), input.subject.trim(), electricContent(input.content)];
  const lines = input.lines.map((line) => {
    const date = texts.length;
    texts.push(displayDate(line.date));
    let plate = -1;
    if (line.plate.trim()) {
      plate = texts.length;
      texts.push(line.plate.trim());
    }
    const name = texts.length;
    texts.push(line.name.trim());
    let unit = -1;
    if (line.unit.trim()) {
      unit = texts.length;
      texts.push(line.unit.trim());
    }
    let note = -1;
    if (line.note.trim()) {
      note = texts.length;
      texts.push(line.note.trim());
    }
    return { date, plate, name, unit, note };
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

function fillSheet(sheet: string, input: ElectricSheetInput, base: number, packed: ReturnType<typeof packStrings>, delta: number) {
  const rows = [...sheet.matchAll(/<row\b[^>]*>[\s\S]*?<\/row>/g)].map((match) => match[0]);
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
  const total = input.lines.reduce((sum, line) => sum + Math.round(line.quantity * line.price), 0);
  const totalRow = TOTAL_ROW + delta;
  const lastDataRow = DATA_ROW + input.lines.length - 1;
  let next = sheet.replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData>${rebuilt}</sheetData>`);
  next = next.replace(/<dimension ref="[^"]+"/, `<dimension ref="A1:N${30 + delta}"`);
  next = next.replace(/ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/g, (match, left, start, right, end) => {
    const first = Number(start);
    if (first < TOTAL_ROW) return match;
    return `ref="${left}${first + delta}:${right}${Number(end) + delta}"`;
  });
  next = next.replace(
    new RegExp(`<c r="H${totalRow}" s="29"><f>[^<]*</f><v>[^<]*</v></c>`),
    `<c r="H${totalRow}" s="29"><f>SUM(H${DATA_ROW}:H${lastDataRow})</f><v>${total}</v></c>`,
  );
  next = replaceSharedCell(next, "E3", base);
  next = replaceSharedCell(next, "A6", base + 1);
  next = replaceSharedCell(next, "A17", base + 2);
  return next;
}

function shiftIndex(line: { date: number; plate: number; name: number; unit: number; note: number }, base: number) {
  return {
    date: base + line.date,
    plate: line.plate < 0 ? -1 : base + line.plate,
    name: base + line.name,
    unit: line.unit < 0 ? -1 : base + line.unit,
    note: line.note < 0 ? -1 : base + line.note,
  };
}

function fillDataRow(
  rowXml: string,
  line: ElectricSheetLine,
  index: number,
  strings: { date: number; plate: number; name: number; unit: number; note: number },
) {
  const row = rowNumber(rowXml);
  const amount = Math.round(line.quantity * line.price);
  let xml = rowXml;
  xml = setNumber(xml, `A${row}`, index + 1);
  xml = setShared(xml, `B${row}`, strings.date);
  xml = strings.plate < 0 ? setBlank(xml, `C${row}`) : setShared(xml, `C${row}`, strings.plate);
  xml = setShared(xml, `D${row}`, strings.name);
  xml = strings.unit < 0 ? setBlank(xml, `E${row}`) : setShared(xml, `E${row}`, strings.unit);
  xml = setNumber(xml, `F${row}`, line.quantity);
  xml = setNumber(xml, `G${row}`, line.price);
  xml = xml.replace(/<f[^>]*>[^<]*<\/f><v>[^<]*<\/v>/, `<f>G${row}*F${row}</f><v>${amount}</v>`);
  xml = strings.note < 0 ? setBlank(xml, `I${row}`) : setShared(xml, `I${row}`, strings.note);
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
  return xml.replace(new RegExp(`(<c r="${ref}"[^>]*t="s"><v>)\\d+(</v></c>)`), `$1${index}$2`);
}

function singleSheet(xml: string, name: string) {
  return xml.replace(/<sheets>[\s\S]*?<\/sheets>/, `<sheets><sheet name="${encodeXml(name)}" sheetId="20" r:id="rId1"/></sheets>`);
}

function trimWorkbookRels(xml: string) {
  return xml
    .replace(/<Relationship\b[^>]*Target="worksheets\/sheet(?!1\.xml")[^"]*"[^>]*\/>/g, "")
    .replace(/<Relationship\b[^>]*Target="calcChain\.xml"[^>]*\/>/g, "");
}

function trimContentTypes(xml: string) {
  return xml
    .replace(/<Override\b[^>]*PartName="\/xl\/worksheets\/sheet(?:[2-9]|1[0-1])\.xml"[^>]*\/>/g, "")
    .replace(/<Override\b[^>]*PartName="\/xl\/drawings\/drawing(?:[2-9]|1[0-1])\.xml"[^>]*\/>/g, "")
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
  return `Đà Nẵng, Ngày ${day} tháng ${month} năm ${parsed.year}`;
}

function displayDate(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return value;
  const day = String(parsed.day).padStart(2, "0");
  const month = String(parsed.month).padStart(2, "0");
  return `${day}/${month}/${parsed.year}`;
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

function electricContent(value: string) {
  const text = value.trim();
  if (text.startsWith("Nội dung đề xuất")) return text;
  return `Nội dung đề xuất gồm: ${text}`;
}

function encodeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function readZip(zip: { file: (name: string) => { async: (type: "string") => Promise<string> } | null }, name: string) {
  const file = zip.file(name);
  if (!file) throw new Error("File Excel không đúng mẫu");
  return file.async("string");
}
