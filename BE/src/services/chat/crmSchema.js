/**
 * Catalog of CRM Mongo collections the chatbot may read.
 * Keep field lists short — injected into tool results / system guidance.
 */

export const CRM_SCHEMA = {
  orders: {
    label: 'Đơn hàng',
    keyFields: [
      'code',
      'dealerId',
      'status',
      'paymentStatus',
      'subtotal',
      'discount',
      'total',
      'paidAmount',
      'remainingAmount',
      'items',
      'createdAt'
    ],
    enums: {
      status: 'pending|confirmed|delivering|completed|cancelled',
      paymentStatus: 'unpaid|partial|paid'
    },
    tips: [
      'Chiết khấu tiền = field discount (không phải % đại lý).',
      'Công nợ đơn = total - paidAmount khi unpaid/partial.',
      'Lọc tuần/tháng: preset trên search_orders hoặc query_crm.'
    ]
  },
  dealers: {
    label: 'Đại lý',
    keyFields: [
      'name',
      'phone',
      'region',
      'tier',
      'discountPercent',
      'status',
      'address',
      'contactName'
    ],
    enums: {
      status: 'pending|active|inactive',
      tier: 'standard|silver|gold'
    },
    tips: [
      'discountPercent = % CK mặc định trên hồ sơ.',
      'Tổng tiền CK thực tế = SUM(orders.discount) theo dealerId.'
    ]
  },
  leads: {
    label: 'Lead',
    keyFields: [
      'name',
      'phone',
      'email',
      'type',
      'status',
      'source',
      'region',
      'lat',
      'lng',
      'message',
      'note',
      'dealerId'
    ],
    enums: {
      status: 'new|contacted|qualified|converted|closed',
      type: 'contact|dealer'
    },
    tips: []
  },
  trips: {
    label: 'Chuyến công tác',
    keyFields: [
      'code',
      'title',
      'status',
      'region',
      'startDate',
      'endDate',
      'memberIds',
      'orderIds',
      'stops',
      'advances',
      'expenses',
      'settlement'
    ],
    enums: {
      status: 'draft|in_progress|settlement|closed|cancelled'
    },
    tips: [
      'Chi phí nằm trong expenses[].amount; tạm ứng advances[].amount.',
      'Xếp hạng chi phí: dùng tool rank_trips_by_expense (không tự viết aggregate phức tạp).',
      'Hỏi tạm ứng / cần ứng bao nhiêu: dùng suggest_trip_advance(tripId=mã CT-…).',
      'Ghi ứng: add_trip_advance; duyệt chi: review_trip_expense; khóa: settle_trip.'
    ]
  },
  suppliers: {
    label: 'Nhà cung cấp',
    keyFields: [
      'name',
      'contactName',
      'phone',
      'email',
      'taxCode',
      'address',
      'lat',
      'lng',
      'status',
      'note'
    ],
    enums: {
      status: 'active|inactive'
    },
    tips: [
      'Công nợ NCC: get_payables_summary / search_purchases hasDebt=true.'
    ]
  },
  purchase_invoices: {
    label: 'Phiếu nhập mua',
    keyFields: [
      'code',
      'supplierId',
      'warehouseId',
      'total',
      'paidAmount',
      'paymentStatus',
      'status',
      'invoiceDate',
      'dueDate',
      'items'
    ],
    enums: {
      paymentStatus: 'unpaid|partial|paid',
      status: 'open|cancelled'
    },
    tips: [
      'Còn nợ = total - paidAmount.',
      'Ưu tiên get_purchase / search_purchases / record_purchase_payment.'
    ]
  },
  products: {
    label: 'Sản phẩm',
    keyFields: [
      'name',
      'sku',
      'categoryId',
      'unit',
      'price',
      'costPrice',
      'status',
      'unitsPerCase'
    ],
    enums: {
      status: 'active|inactive'
    },
    tips: []
  },
  product_categories: {
    label: 'Loại sản phẩm',
    keyFields: ['name', 'slug', 'displayOrder', 'status'],
    enums: {},
    tips: []
  },
  warehouses: {
    label: 'Kho',
    keyFields: ['name', 'code', 'address', 'status'],
    enums: {
      status: 'active|inactive'
    },
    tips: []
  },
  warehouse_stocks: {
    label: 'Tồn kho',
    keyFields: ['warehouseId', 'productId', 'quantity', 'updatedAt'],
    enums: {},
    tips: [
      'Join ý tưởng: lấy productId → products; warehouseId → warehouses.',
      'Tồn thấp: sort quantity asc.'
    ]
  },
  inventory_transactions: {
    label: 'Phiếu nhập/xuất kho',
    keyFields: [
      'type',
      'warehouseId',
      'productId',
      'quantity',
      'note',
      'createdAt'
    ],
    enums: {
      type: 'import|export'
    },
    tips: []
  },
  employees: {
    label: 'Nhân viên',
    keyFields: [
      'code',
      'fullName',
      'phone',
      'title',
      'department',
      'baseSalary',
      'allowance',
      'commissionPercent',
      'status'
    ],
    enums: {
      status: 'active|inactive'
    },
    tips: [
      'Lương cơ bản = baseSalary. Phụ cấp = allowance.',
      'Lương cao nhất: sortBy=baseSalary hoặc sort {baseSalary:-1}.'
    ]
  },
  payroll_periods: {
    label: 'Bảng lương kỳ',
    keyFields: ['period', 'status', 'lines', 'note', 'lockedAt'],
    enums: {
      status: 'draft|locked'
    },
    tips: [
      'lines[] có employeeName, baseSalary, allowance, commission, tripReimburse, net.'
    ]
  },
  news: {
    label: 'Tin tức nội bộ',
    keyFields: ['title', 'summary', 'content', 'status', 'displayOrder', 'createdAt'],
    enums: {
      status: 'draft|published|archived'
    },
    tips: []
  },
  order_audits: {
    label: 'Lịch sử đơn hàng',
    keyFields: ['orderId', 'action', 'actorUserId', 'meta', 'createdAt'],
    enums: {
      action:
        'created|status_changed|confirmed_exported|cancelled|payment_recorded|invoice_emailed|deleted'
    },
    tips: []
  }
}

export const listCrmCollections = () =>
  Object.entries(CRM_SCHEMA).map(([name, meta]) => ({
    collection: name,
    label: meta.label,
    keyFields: meta.keyFields,
    enums: meta.enums,
    tips: meta.tips
  }))

export const describeCrmCollection = (name) => {
  const key = String(name || '').trim()
  if (!key || key === 'all') {
    return {
      collections: listCrmCollections(),
      note: 'Dùng query_crm với collection + filter/sort/aggregate. Ưu tiên tool chuyên biệt nếu có.'
    }
  }
  const meta = CRM_SCHEMA[key]
  if (!meta) {
    return {
      error: `Không có schema cho "${key}".`,
      available: Object.keys(CRM_SCHEMA)
    }
  }
  return {
    collection: key,
    ...meta
  }
}
