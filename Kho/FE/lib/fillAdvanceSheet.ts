export type AdvanceSheetInput = {
  reportDate: string;
  fullName: string;
  department: string;
  content: string;
  amount: number;
  amountWords: string;
  bankAccount: string;
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

export async function buildFilledAdvanceSheet(template: ArrayBuffer, input: AdvanceSheetInput) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(template);
  const sheetFile = zip.file("xl/worksheets/sheet1.xml");
  const stringsFile = zip.file("xl/sharedStrings.xml");
  const workbookFile = zip.file("xl/workbook.xml");
  if (!sheetFile || !stringsFile || !workbookFile) throw new Error("File Excel không đúng mẫu");

  const parsed = parseIsoDate(input.reportDate);
  if (!parsed) throw new Error("Nhập ngày");
  const texts = [
    `Ngày  ${parsed.day}  tháng  ${parsed.month}  năm ${parsed.year}`,
    `Họ và tên: ${input.fullName.trim()}`,
    `Bộ phận: ${input.department.trim()}`,
    `Nội dung tạm ứng: ${input.content.trim()}`,
    `Số tiền: ${formatMoney(input.amount)} VNĐ`,
    `Bằng chữ: ${input.amountWords.trim()}`,
    `Số TK: ${input.bankAccount.trim()}`,
    input.fullName.trim(),
  ];
  const strings = await appendStrings(await stringsFile.async("string"), texts);
  const sheetName = `${String(parsed.day).padStart(2, "0")}-${String(parsed.month).padStart(2, "0")}-${parsed.year}`;
  let sheet = await sheetFile.async("string");
  ["A6", "A9", "A10", "A11", "A12", "A13", "A14", "A20"].forEach((ref, index) => {
    sheet = replaceSharedCell(sheet, ref, strings.base + index);
  });

  zip.file("xl/sharedStrings.xml", strings.xml);
  zip.file("xl/worksheets/sheet1.xml", sheet);
  zip.file("xl/workbook.xml", keepFirstSheet(await workbookFile.async("string"), sheetName));
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

function replaceSharedCell(xml: string, ref: string, index: number) {
  const shifted = xml.replace(new RegExp(`(<c r="${ref}"[^>]*t="s"><v>)\\d+(</v></c>)`), `$1${index}$2`);
  if (shifted === xml) throw new Error("File Excel không đúng mẫu");
  return shifted;
}

function keepFirstSheet(xml: string, name: string) {
  return xml.replace(
    /<sheets>[\s\S]*?<\/sheets>/,
    `<sheets><sheet name="${encodeXml(name)}" sheetId="1" r:id="rId1"/></sheets>`,
  );
}

function trimWorkbookRels(xml: string) {
  return xml.replace(/<Relationship\b[^>]*Target="worksheets\/(?!sheet1\.xml")[^"]+"[^>]*\/>/g, "");
}

function trimContentTypes(xml: string) {
  return xml.replace(/<Override\b[^>]*PartName="\/xl\/worksheets\/sheet[2-9]\.xml"[^>]*\/>/g, "");
}

function singleAppPart(xml: string, name: string) {
  return xml
    .replace(/<vt:i4>\d+<\/vt:i4>/, "<vt:i4>1</vt:i4>")
    .replace(
      /<TitlesOfParts>[\s\S]*?<\/TitlesOfParts>/,
      `<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>${encodeXml(name)}</vt:lpstr></vt:vector></TitlesOfParts>`,
    );
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
