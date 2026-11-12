export type UtilitySheetInput = {
  reportDate: string;
  period: string;
  subject: string;
  content: string;
  paymentTitle: string;
  amountWords: string;
  electricStart: number;
  electricEnd: number;
  electricPrice: number;
  electricNote: string;
  waterStart: number;
  waterEnd: number;
  waterPrice: number;
  waterNote: string;
  sanitationFee: number;
  sanitationNote: string;
  internetFee: number;
  internetNote: string;
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
  "xl/worksheets/sheet2.xml",
  "xl/worksheets/sheet3.xml",
  "xl/worksheets/_rels/sheet1.xml.rels",
  "xl/worksheets/_rels/sheet2.xml.rels",
  "xl/worksheets/_rels/sheet3.xml.rels",
  "xl/drawings/drawing1.xml",
  "xl/drawings/drawing2.xml",
  "xl/drawings/_rels/drawing1.xml.rels",
  "xl/drawings/_rels/drawing2.xml.rels",
  "xl/media/image1.jpeg",
  "xl/media/image2.png",
  "xl/printerSettings/printerSettings1.bin",
  "xl/printerSettings/printerSettings2.bin",
  "xl/printerSettings/printerSettings3.bin",
]);

export async function buildFilledUtilitySheet(template: ArrayBuffer, input: UtilitySheetInput) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(template);
  const stringsFile = zip.file("xl/sharedStrings.xml");
  const workbookFile = zip.file("xl/workbook.xml");
  const paymentFile = zip.file("xl/worksheets/sheet1.xml");
  const proposalFile = zip.file("xl/worksheets/sheet2.xml");
  const noticeFile = zip.file("xl/worksheets/sheet3.xml");
  if (!stringsFile || !workbookFile || !paymentFile || !proposalFile || !noticeFile) {
    throw new Error("File Excel không đúng mẫu");
  }

  const packed = packStrings(input);
  const strings = await appendStrings(await stringsFile.async("string"), packed.texts);
  const amounts = totals(input);
  const parsed = parseIsoDate(input.reportDate);
  const label = parsed
    ? `${String(parsed.day).padStart(2, "0")}-${String(parsed.month).padStart(2, "0")}`
    : "Dien-nuoc";

  zip.file("xl/sharedStrings.xml", strings.xml);
  zip.file("xl/worksheets/sheet2.xml", fillProposal(await proposalFile.async("string"), input, strings.base, packed, amounts));
  zip.file("xl/worksheets/sheet3.xml", fillNotice(await noticeFile.async("string"), input, strings.base, packed, amounts));
  zip.file("xl/worksheets/sheet1.xml", fillPayment(await paymentFile.async("string"), strings.base));
  zip.file("xl/workbook.xml", renameSheets(await workbookFile.async("string"), label));
  zip.file("xl/_rels/workbook.xml.rels", trimWorkbookRels(await readZip(zip, "xl/_rels/workbook.xml.rels")));
  zip.file("[Content_Types].xml", trimContentTypes(await readZip(zip, "[Content_Types].xml")));
  zip.file("docProps/app.xml", threeAppParts(await readZip(zip, "docProps/app.xml"), label));

  for (const name of Object.keys(zip.files)) {
    if (!zip.files[name].dir && !KEEP.has(name)) zip.remove(name);
  }

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function totals(input: UtilitySheetInput) {
  const electricQty = input.electricEnd - input.electricStart;
  const waterQty = input.waterEnd - input.waterStart;
  const electricAmount = electricQty * input.electricPrice;
  const waterAmount = waterQty * input.waterPrice;
  return {
    electricQty,
    waterQty,
    electricAmount,
    waterAmount,
    total: electricAmount + waterAmount + input.sanitationFee + input.internetFee,
  };
}

function packStrings(input: UtilitySheetInput) {
  const amounts = totals(input);
  const texts = [
    dateLabel(input.reportDate),
    input.subject.trim(),
    utilityContent(input.content),
    input.paymentTitle.trim(),
    `Số tiền: ${formatMoney(amounts.total)} VNĐ`,
    wordsLabel(input.amountWords),
    wordsShort(input.amountWords),
    input.period.trim(),
  ];
  const note = (value: string) => {
    const text = value.trim();
    if (!text) return -1;
    const index = texts.length;
    texts.push(text);
    return index;
  };
  return {
    texts,
    electricNote: note(input.electricNote),
    waterNote: note(input.waterNote),
    sanitationNote: note(input.sanitationNote),
    internetNote: note(input.internetNote),
  };
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

function fillProposal(
  sheet: string,
  input: UtilitySheetInput,
  base: number,
  packed: ReturnType<typeof packStrings>,
  amounts: ReturnType<typeof totals>,
) {
  let xml = sheet;
  xml = replaceSharedCell(xml, "C4", base);
  xml = replaceSharedCell(xml, "A6", base + 1);
  xml = replaceSharedCell(xml, "A17", base + 2);
  xml = replaceSharedCell(xml, "A24", base + 5);
  xml = setNote(xml, "I19", packed.electricNote, base);
  xml = setNote(xml, "I20", packed.waterNote, base);
  xml = setNote(xml, "I21", packed.sanitationNote, base);
  xml = setNote(xml, "I22", packed.internetNote, base);
  xml = setNumber(xml, "D19", input.electricStart);
  xml = setNumber(xml, "E19", input.electricEnd);
  xml = setNumber(xml, "G19", input.electricPrice);
  xml = setFormulaValue(xml, "F19", amounts.electricQty);
  xml = setFormulaValue(xml, "H19", amounts.electricAmount);
  xml = setNumber(xml, "D20", input.waterStart);
  xml = setNumber(xml, "E20", input.waterEnd);
  xml = setNumber(xml, "G20", input.waterPrice);
  xml = setFormulaValue(xml, "F20", amounts.waterQty);
  xml = setFormulaValue(xml, "H20", amounts.waterAmount);
  xml = setNumber(xml, "G21", input.sanitationFee);
  xml = setFormulaValue(xml, "H21", input.sanitationFee);
  xml = setNumber(xml, "H22", input.internetFee);
  xml = setFormulaValue(xml, "H23", amounts.total);
  return xml;
}

function fillNotice(
  sheet: string,
  input: UtilitySheetInput,
  base: number,
  packed: ReturnType<typeof packStrings>,
  amounts: ReturnType<typeof totals>,
) {
  let xml = sheet;
  xml = replaceSharedCell(xml, "A2", base + 7);
  xml = replaceSharedCell(xml, "A11", base + 5);
  xml = setNumber(xml, "C5", input.electricStart);
  xml = setNumber(xml, "D5", input.electricEnd);
  xml = setNumber(xml, "F5", input.electricPrice);
  xml = setFormulaValue(xml, "E5", amounts.electricQty);
  xml = setFormulaValue(xml, "G5", amounts.electricAmount);
  xml = setNumber(xml, "C6", input.waterStart);
  xml = setNumber(xml, "D6", input.waterEnd);
  xml = setNumber(xml, "F6", input.waterPrice);
  xml = setFormulaValue(xml, "E6", amounts.waterQty);
  xml = setFormulaValue(xml, "G6", amounts.waterAmount);
  xml = setNumber(xml, "F7", input.sanitationFee);
  xml = setNumber(xml, "G7", input.sanitationFee);
  xml = setNumber(xml, "G8", input.internetFee);
  xml = setFormulaValue(xml, "G10", amounts.total);
  return xml;
}

function fillPayment(sheet: string, base: number) {
  let xml = sheet;
  xml = replaceSharedCell(xml, "A9", base + 3);
  xml = replaceSharedCell(xml, "A10", base + 4);
  xml = replaceSharedCell(xml, "A11", base + 6);
  return xml;
}

function setNote(xml: string, ref: string, index: number, base: number) {
  return index < 0 ? setBlank(xml, ref) : setShared(xml, ref, base + index);
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

function setFormulaValue(xml: string, ref: string, value: number) {
  let found = false;
  const next = xml.replace(new RegExp(`(<c r="${ref}"[^>]*>\\s*<f>[^<]*</f><v>)[^<]*(</v>)`), (_, open: string, close: string) => {
    found = true;
    return `${open}${value}${close}`;
  });
  if (!found) throw new Error(`Không thấy công thức ${ref}`);
  return next;
}

function replaceCell(xml: string, ref: string, render: (attrs: string) => string) {
  let found = false;
  const next = xml.replace(new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>([\\s\\S]*?)</c>)`), (_, attrs: string) => {
    found = true;
    return render(attrs);
  });
  if (!found) throw new Error(`Không thấy ô ${ref}`);
  return next;
}

function replaceSharedCell(xml: string, ref: string, index: number) {
  const shifted = xml.replace(new RegExp(`(<c r="${ref}"[^>]*t="s"><v>)\\d+(</v></c>)`), `$1${index}$2`);
  if (shifted === xml) throw new Error("File Excel không đúng mẫu");
  return shifted;
}

function renameSheets(xml: string, label: string) {
  const names = [`TT ${label}`, `ĐX ${label}`, `phiếu báo ${label}`];
  const ids = ["23", "22", "21"];
  const sheets = names.map((name, index) => `<sheet name="${encodeXml(name)}" sheetId="${ids[index]}" r:id="rId${index + 1}"/>`).join("");
  return xml.replace(/<sheets>[\s\S]*?<\/sheets>/, `<sheets>${sheets}</sheets>`);
}

function trimWorkbookRels(xml: string) {
  return xml
    .replace(/<Relationship\b[^>]*Target="worksheets\/sheet(?!(?:[123])\.xml")[^"]*"[^>]*\/>/g, "")
    .replace(/<Relationship\b[^>]*Target="calcChain\.xml"[^>]*\/>/g, "");
}

function trimContentTypes(xml: string) {
  return xml
    .replace(/<Override\b[^>]*PartName="\/xl\/worksheets\/sheet(?!(?:[123])\.xml")[^"]*"[^>]*\/>/g, "")
    .replace(/<Override\b[^>]*PartName="\/xl\/drawings\/drawing(?!(?:[12])\.xml")[^"]*"[^>]*\/>/g, "")
    .replace(/<Override\b[^>]*PartName="\/xl\/printerSettings\/printerSettings(?!(?:[123])\.bin")[^"]*"[^>]*\/>/g, "")
    .replace(/<Override\b[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, "");
}

function threeAppParts(xml: string, label: string) {
  const names = [`TT ${label}`, `ĐX ${label}`, `phiếu báo ${label}`]
    .map((name) => `<vt:lpstr>${encodeXml(name)}</vt:lpstr>`)
    .join("");
  return xml
    .replace(/<vt:i4>\d+<\/vt:i4>/, "<vt:i4>3</vt:i4>")
    .replace(/<TitlesOfParts>[\s\S]*?<\/TitlesOfParts>/, `<TitlesOfParts><vt:vector size="3" baseType="lpstr">${names}</vt:vector></TitlesOfParts>`);
}

function dateLabel(value: string) {
  const parsed = parseIsoDate(value);
  if (!parsed) return value;
  const day = String(parsed.day).padStart(2, "0");
  const month = String(parsed.month).padStart(2, "0");
  return `Đà Nẵng, ngày ${day} tháng ${month} năm ${parsed.year}`;
}

function utilityContent(value: string) {
  const text = value.trim();
  if (text.startsWith("Nội dung đề xuất gồm:")) return text;
  return `Nội dung đề xuất gồm: ${text}`;
}

function wordsLabel(value: string) {
  const text = value.trim();
  if (text.startsWith("Số tiền bằng chữ:")) return text;
  return `Số tiền bằng chữ: ${text}`;
}

function wordsShort(value: string) {
  const text = value.trim();
  if (text.startsWith("Bằng chữ:")) return text;
  return `Bằng chữ: ${text}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
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
