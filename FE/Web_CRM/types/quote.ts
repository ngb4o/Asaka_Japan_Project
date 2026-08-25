export interface QuoteLine {
  productId: string
  name: string
  sku?: string
  activeIngredient?: string
  application: string
  unitsPerCase: number
  costPrice: number
  quantity: number
  marginPercent: number
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
  lines: QuoteLine[]
}