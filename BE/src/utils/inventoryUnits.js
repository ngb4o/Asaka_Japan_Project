export const UNIT_TYPE = {
  BOTTLE: 'chai',
  CASE: 'thung'
}

export const toUnitsPerCase = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

export const toBaseQuantity = (quantity, unitType, unitsPerCase) => {
  const qty = Number(quantity)
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error('Quantity must be greater than 0')
  }

  if (unitType === UNIT_TYPE.CASE) {
    const perCase = toUnitsPerCase(unitsPerCase)
    if (perCase < 1) {
      throw new Error('unitsPerCase must be at least 1')
    }
    return Math.floor(qty) * perCase
  }

  return Math.floor(qty)
}

export const splitBaseQuantity = (quantityBase, unitsPerCase) => {
  const base = Number(quantityBase) || 0
  const perCase = toUnitsPerCase(unitsPerCase)

  if (perCase <= 1) {
    return {
      cases: 0,
      bottles: base,
      display: `${base} chai`
    }
  }

  const cases = Math.floor(base / perCase)
  const bottles = base % perCase

  if (cases > 0 && bottles > 0) {
    return {
      cases,
      bottles,
      display: `${cases} thùng + ${bottles} chai`
    }
  }

  if (cases > 0) {
    return {
      cases,
      bottles: 0,
      display: `${cases} thùng (${base} chai)`
    }
  }

  return {
    cases: 0,
    bottles,
    display: `${bottles} chai`
  }
}
