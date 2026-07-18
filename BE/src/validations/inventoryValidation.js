import Joi from 'joi'
import { OBJECT_ID_RULE } from '~/utils/validators'
import { validateRequest } from '~/validations/validateRequest'

const objectIdRule = Joi.string().pattern(OBJECT_ID_RULE).message('Invalid id')

const movementSchema = Joi.object({
  warehouseId: objectIdRule.required(),
  productId: objectIdRule.required(),
  quantity: Joi.number().integer().min(1).required(),
  unitType: Joi.string().valid('chai', 'thung').default('chai'),
  note: Joi.string().trim().allow('').max(500).optional()
})

export const inventoryValidation = {
  importStock: validateRequest(movementSchema),
  exportStock: validateRequest(movementSchema)
}
