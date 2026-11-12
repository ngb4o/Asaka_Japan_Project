export type ProposalSheetLine = {
  date: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  note: string;
};

export type ProposalSheetInput = {
  reportDate: string;
  content: string;
  lines: ProposalSheetLine[];
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
  "xl/drawings/vmlDrawing1.vml",
  "xl/media/image1.jpeg",
  "xl/printerSettings/printerSettings1.bin",
  "xl/comments1.xml",
]);

const DATA_ROW = 18;
const TOTAL_ROW = 19;

export async function buildFilledProposalSheet(template: ArrayBuffer, input: ProposalSheetInput) {
  if (!input.lines.length || input.lines.length > 30) {
    throw new Error("Một báo cáo từ 1 đến 30 dòng");
  }
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(template);
  const sheetFile = zip.file("xl/worksheets/sheet1.xml");
  const stringsFile = zip.file("xl/sharedStrings.xml");
  const workbookFile = zip.file("xl/workbook.xml");
  if (!sheetFile || !stringsFile || !workbookFile) throw new Error("File Excel không đúng mẫu");

  const strings = await appendStrings(await stringsFile.async("string"), stringValues(input));
  const delta = input.lines.length - 1;
  const sheet = fillSheet(await sheetFile.async("string"), input, strings.indexes, delta);
  const parsed = parseIsoDate(input.reportDate);
  const sheetName = parsed ? `${parsed.day}-${parsed.month}-${parsed.year}` : "Bao-cao";

  zip.file("xl/sharedStrings.xml", strings.xml);
  zip.file("xl/worksheets/sheet1.xml", sheet);
  zip.file("xl/workbook.xml", singleSheet(await workbookFile.async("string"), sheetName));
  zip.file("xl/_rels/workbook.xml.rels", trimWorkbookRels(await readZip(zip, "xl/_rels/workbook.xml.rels")));
  zip.file("[Content_Types].xml", trimContentTypes(await readZip(zip, "[Content_Types].xml")));
  zip.file("docProps/app.xml", singleAppPart(await readZip(zip, "docProps/app.xml"), sheetName));
  if (delta > 0) {
    zip.file("xl/comments1.xml", shiftComment(await readZip(zip, "xl/comments1.xml"), delta));
    zip.file("xl/drawings/vmlDrawing1.vml", shiftCommentAnchor(await readZip(zip, "xl/drawings/vmlDrawing1.vml"), delta));
  }

  for (const name of Object.keys(zip.files)) {
    if (!zip.files[name].dir && !KEEP.has(name)) zip.remove(name);
  }

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function stringValues(input: ProposalSheetInput) {
  const parsed = parseIsoDate(input.reportDate);
  const dateLabel = parsed
    ? `Đà Nẵng, ngày ${parsed.day} tháng ${parsed.month} năm ${parsed.year}`
    : input.reportDate;
  const texts = [dateLabel, proposalContent(input.content)];
  const indexes = input.lines.map((line) => {
    const name = texts.length;
    texts.push(line.name);
    const unit = texts.length;
    texts.push(line.unit);
    let note = -1;
    if (line.note.trim()) {
      note = texts.length;
      texts.push(line.note.trim());
    }
    return { name, unit, note };
  });
  return { texts, indexes };
}

async function appendStrings(xml: string, values: ReturnType<typeof stringValues>) {
  const existing = [...xml.matchAll(/<si\b/g)].length;
  const added = values.texts.map((text) => `<si><t xml:space="preserve">${encodeXml(text)}</t></si>`).join("");
  const next = existing + values.texts.length;
  return {
    xml: xml
      .replace(/count="\d+"/, `count="${next}"`)
      .replace(/uniqueCount="\d+"/, `uniqueCount="${next}"`)
      .replace("</sst>", `${added}</sst>`),
    indexes: values.indexes.map((item) => ({
      name: existing + item.name,
      unit: existing + item.unit,
      note: item.note < 0 ? -1 : existing + item.note,
    })),
  };
}

function fillSheet(
  sheet: string,
  input: ProposalSheetInput,
  indexes: { name: number; unit: number; note: number }[],
  delta: number,
) {
  const rows = [...sheet.matchAll(/<row\b[^>]*>[\s\S]*?<\/row>/g)].map((match) => match[0]);
  const prototype = rows.find((row) => rowNumber(row) === DATA_ROW);
  if (!prototype) throw new Error("File Excel không đúng mẫu");
  const dataRows = input.lines.map((line, index) => fillDataRow(
    renumberRow(prototype, DATA_ROW, DATA_ROW + index),
    line,
    index,
    indexes[index],
  ));
  const rebuilt = rows.flatMap((row) => {
    const current = rowNumber(row);
    if (current < DATA_ROW) return [row];
    if (current === DATA_ROW) return dataRows;
    return [renumberRow(row, current, current + delta)];
  }).join("");
  const total = input.lines.reduce((sum, line) => sum + Math.round(line.quantity * line.price), 0);
  const totalRow = TOTAL_ROW + delta;
  const lastDataRow = DATA_ROW + input.lines.length - 1;
  const dateString = indexes[0].name - 2;
  let next = sheet.replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData>${rebuilt}</sheetData>`);
  next = next.replace(/<dimension ref="[^"]+"/, `<dimension ref="A1:I${47 + delta}"`);
  next = next.replace(/ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/g, (match, left, start, right, end) => {
    const first = Number(start);
    const second = Number(end);
    if (first < TOTAL_ROW) return match;
    return `ref="${left}${first + delta}:${right}${second + delta}"`;
  });
  next = next.replace(
    new RegExp(`<c r="G${totalRow}" s="15"><f>[^<]*</f><v>[^<]*</v></c>`),
    `<c r="G${totalRow}" s="15"><f>SUM(G${DATA_ROW}:G${lastDataRow})</f><v>${total}</v></c>`,
  );
  next = replaceSharedCell(next, "D3", dateString);
  next = replaceSharedCell(next, "B15", dateString + 1);
  return next;
}

function fillDataRow(
  rowXml: string,
  line: ProposalSheetLine,
  index: number,
  strings: { name: number; unit: number; note: number },
) {
  const row = rowNumber(rowXml);
  let xml = rowXml;
  xml = setNumber(xml, `A${row}`, index + 1);
  xml = setNumber(xml, `B${row}`, excelSerial(line.date));
  xml = setShared(xml, `C${row}`, strings.name);
  xml = setShared(xml, `D${row}`, strings.unit);
  xml = setNumber(xml, `E${row}`, line.quantity);
  xml = setNumber(xml, `F${row}`, line.price);
  xml = xml.replace(/<f>[^<]*<\/f><v>[^<]*<\/v>/, `<f>F${row}*E${row}</f><v>${Math.round(line.quantity * line.price)}</v>`);
  xml = strings.note < 0 ? setBlank(xml, `H${row}`) : setShared(xml, `H${row}`, strings.note);
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
  return xml.replace(new RegExp(`<c r="${ref}"([^>]*)(?:/>|>[\\s\\S]*?</c>)`), (_, attrs: string) => {
    return `<c r="${ref}"${attrs.replace(/\s*t="[^"]*"/g, "")}><v>${value}</v></c>`;
  });
}

function setShared(xml: string, ref: string, index: number) {
  return xml.replace(new RegExp(`<c r="${ref}"([^>]*)(?:/>|>[\\s\\S]*?</c>)`), (_, attrs: string) => {
    const style = attrs.match(/\bs="[^"]*"/)?.[0] || "";
    return `<c r="${ref}" ${style} t="s"><v>${index}</v></c>`;
  });
}

function setBlank(xml: string, ref: string) {
  return xml.replace(new RegExp(`<c r="${ref}"([^>]*)(?:/>|>[\\s\\S]*?</c>)`), (_, attrs: string) => {
    const style = attrs.match(/\bs="[^"]*"/)?.[0] || "";
    return `<c r="${ref}" ${style}/>`;
  });
}

function replaceSharedCell(xml: string, ref: string, index: number) {
  return xml.replace(new RegExp(`(<c r="${ref}"[^>]*t="s"><v>)\\d+(</v></c>)`), `$1${index}$2`);
}

function singleSheet(xml: string, name: string) {
  return xml.replace(/<sheets>[\s\S]*?<\/sheets>/, `<sheets><sheet name="${encodeXml(name)}" sheetId="12" r:id="rId1"/></sheets>`);
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
    .replace(/<Override\b[^>]*PartName="\/xl\/comments(?:[2-9]|1[0-1])\.xml"[^>]*\/>/g, "")
    .replace(/<Override\b[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, "");
}

function singleAppPart(xml: string, name: string) {
  return xml
    .replace(/<vt:i4>\d+<\/vt:i4>/, "<vt:i4>1</vt:i4>")
    .replace(/<TitlesOfParts>[\s\S]*?<\/TitlesOfParts>/, `<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>${encodeXml(name)}</vt:lpstr></vt:vector></TitlesOfParts>`);
}

function shiftComment(xml: string, delta: number) {
  return xml.replace(/ref="C(\d+)"/g, (_, row: string) => `ref="C${Number(row) + delta}"`);
}

function shiftCommentAnchor(xml: string, delta: number) {
  return xml
    .replace(/<x:Row>(\d+)<\/x:Row>/g, (_, row: string) => `<x:Row>${Number(row) + delta}</x:Row>`)
    .replace(/<x:Anchor>([\s\S]*?)<\/x:Anchor>/g, (_, body: string) => {
      const parts = body.split(",").map((part) => part.trim());
      if (parts.length >= 7) {
        parts[2] = String(Number(parts[2]) + delta);
        parts[6] = String(Number(parts[6]) + delta);
      }
      return `<x:Anchor>${parts.join(", ")}</x:Anchor>`;
    });
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
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function proposalContent(value: string) {
  const text = value.trim();
  if (text.startsWith("Nội dung đề xuất:")) return text;
  return `Nội dung đề xuất: ${text}`;
}

function encodeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function readZip(zip: { file: (name: string) => { async: (type: "string") => Promise<string> } | null }, name: string) {
  const file = zip.file(name);
  if (!file) throw new Error("File Excel không đúng mẫu");
  return file.async("string");
}
