export interface QuoteLine {
  productId: string
  name: string
  sku?: string
  /** Loại sản phẩm (VD: Thuốc trừ sâu, Phân bón) */
  categoryId?: string
  categoryName?: string
  activeIngredient?: string
  application: string
  unitsPerCase: number
  costPrice: number
  quantity: number
  marginPercent: number
  /** When set, this price is used instead of calculating from margin. */
  overrideUnitPrice?: number | null
}

export interface QuoteDealerSummary {
  _id: string
  name: string
  tier?: string
}

export interface Quote {
  id: string
  name: string
  description: string
  defaultMarginPercent: number
  dealerIds: string[]
  dealers?: QuoteDealerSummary[]
  lines: QuoteLine[]
  createdBy: string
  createdAt: string
  updatedAt?: string | null
  validFrom?: string | null
  validUntil?: string | null
}

export interface QuoteListResponse {
  items: Quote[]
  total: number
  page: number
  limit: number
  skip: number
  totalPages: number
}

export interface QuoteFormPayload {
  name: string
  description: string
  defaultMarginPercent: number
  dealerIds: string[]
  validFrom?: string | null
  validUntil?: string | null
  lines: QuoteLine[]
}