import Joi from 'joi'
import { OBJECT_ID_RULE } from '~/utils/validators'
import { validateRequest } from '~/validations/validateRequest'

const objectIdRule = Joi.string().pattern(OBJECT_ID_RULE).message('Invalid id')

const movementSchema = Joi.object({
  warehouseId: objectIdRule.required(),
  productId: objectIdRule.required(),
  quantity: Joi.number().integer().min(1).required(),
  unitType: Joi.string().valid('chai', 'thung').default('chai'),
  note: Joi.string().trim().allow('').max(500).optional(),
  /** Giá nhập theo đơn vị của phiếu (chai/thùng). Chỉ dùng khi nhập kho. */
  unitCost: Joi.number().min(0).optional(),
  /** Gắn NCC khi nhập → tạo phiếu nhập mua / công nợ */
  supplierId: objectIdRule.optional().allow(null, ''),
  dueDate: Joi.string().trim().allow('', null).optional(),
  /** unpaid | paid — trạng thái TT phiếu nhập mua khi gắn NCC */
  paymentStatus: Joi.string().valid('unpaid', 'paid').optional().default('unpaid')
})

const importSchema = movementSchema.keys({
  /** Giá nhập theo đơn vị phiếu — bắt buộc khi nhập để cập nhật vốn kho */
  unitCost: Joi.number().min(0).required()
})

export const inventoryValidation = {
  importStock: validateRequest(importSchema),
  exportStock: validateRequest(movementSchema)
}
