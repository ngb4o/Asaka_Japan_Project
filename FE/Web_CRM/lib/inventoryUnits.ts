export type InventoryUnitType = "chai" | "thung";

export function toUnitsPerCase(value?: number | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function formatStockDisplay(quantityBase: number, unitsPerCase?: number | null) {
  const base = Number(quantityBase) || 0;
  const perCase = toUnitsPerCase(unitsPerCase);

  if (perCase <= 1) {
    return `${base} chai`;
  }

  const cases = Math.floor(base / perCase);
  const bottles = base % perCase;

  if (cases > 0 && bottles > 0) {
    return `${base} chai ≈ ${cases} thùng + ${bottles} chai`;
  }

  if (cases > 0) {
    return `${base} chai ≈ ${cases} thùng`;
  }

  return `${base} chai`;
}

export function formatMovementQuantity(
  quantity: number,
  unitType: InventoryUnitType | string | undefined,
  quantityBase?: number,
  unitsPerCase?: number | null
) {
  const type = unitType === "thung" ? "thung" : "chai";
  const entered = `${quantity} ${type === "thung" ? "thùng" : "chai"}`;

  if (type === "thung" && quantityBase != null) {
    return `${entered} (${quantityBase} chai)`;
  }

  if (unitsPerCase && unitsPerCase > 1 && type === "chai") {
    return entered;
  }

  return entered;
}
