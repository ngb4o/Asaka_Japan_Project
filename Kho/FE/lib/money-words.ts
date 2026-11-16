const ONES = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const SCALES = ["", "nghìn", "triệu", "tỷ"];

function readGroup(value: number, showHundred: boolean) {
  const hundred = Math.floor(value / 100);
  const ten = Math.floor((value % 100) / 10);
  const one = value % 10;
  const parts: string[] = [];
  if (hundred > 0) parts.push(`${ONES[hundred]} trăm`);
  else if (showHundred) parts.push("không trăm");
  if (ten > 1) {
    parts.push(`${ONES[ten]} mươi`);
    if (one === 1) parts.push("mốt");
    else if (one === 4) parts.push("tư");
    else if (one === 5) parts.push("lăm");
    else if (one > 0) parts.push(ONES[one]);
  } else if (ten === 1) {
    parts.push("mười");
    if (one === 5) parts.push("lăm");
    else if (one > 0) parts.push(ONES[one]);
  } else if (one > 0) {
    if (hundred > 0 || showHundred) parts.push("lẻ");
    parts.push(ONES[one]);
  }
  return parts.join(" ");
}

export function moneyWords(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0 || amount > 999_999_999_999) return "";
  const groups: number[] = [];
  let rest = amount;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const parts: string[] = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (!group) continue;
    const higher = groups.slice(index + 1).some((item) => item > 0);
    const text = readGroup(group, higher && group < 100);
    parts.push(SCALES[index] ? `${text} ${SCALES[index]}` : text);
  }
  const phrase = parts.join(" ");
  return `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} đồng`;
}
