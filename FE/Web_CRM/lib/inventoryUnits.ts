export type InventoryUnitType = "chai" | "thung";

export function toUnitsPerCase(value?: number | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export type StockDisplayParts = {
  primary: string;
  secondary: string | null;
};

export function getStockDisplayParts(
  quantityBase: number,
  unitsPerCase?: number | null
): StockDisplayParts {
  const base = Number(quantityBase) || 0;
  const perCase = toUnitsPerCase(unitsPerCase);
  const primary = `${base} chai`;

  if (perCase <= 1) {
    return { primary, secondary: null };
  }

  const cases = Math.floor(base / perCase);
  const bottles = base % perCase;

  if (cases > 0 && bottles > 0) {
    return { primary, secondary: `${cases} thùng + ${bottles} chai` };
  }

  if (cases > 0) {
    return { primary, secondary: `${cases} thùng` };
  }

  return { primary, secondary: null };
}

export function formatStockDisplay(quantityBase: number, unitsPerCase?: number | null) {
  const { primary, secondary } = getStockDisplayParts(quantityBase, unitsPerCase);
  return secondary ? `${primary}\n(${secondary})` : primary;
}

export function getMovementQuantityParts(
  quantity: number,
  unitType: InventoryUnitType | string | undefined,
  quantityBase?: number
): StockDisplayParts {
  const type = unitType === "thung" ? "thung" : "chai";
  const primary = `${quantity} ${type === "thung" ? "thùng" : "chai"}`;

  if (type === "thung" && quantityBase != null) {
    return { primary, secondary: `${quantityBase} chai` };
  }

  return { primary, secondary: null };
}

export function formatMovementQuantity(
  quantity: number,
  unitType: InventoryUnitType | string | undefined,
  quantityBase?: number,
  _unitsPerCase?: number | null
) {
  const { primary, secondary } = getMovementQuantityParts(
    quantity,
    unitType,
    quantityBase
  );
  return secondary ? `${primary}\n(${secondary})` : primary;
}
