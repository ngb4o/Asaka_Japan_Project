import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { validateRequest } from '~/validations/validateRequest'

const POSITIONS = ['trai-ngoai', 'trai-trong', 'phai-ngoai', 'phai-trong', 'don', 'trai', 'phai', 'ngoai', '']

const placeFields = {
  kind: Joi.string().valid('dau', 'mooc', 'kho').required().messages({
    'any.only': 'Chọn đầu, mooc hoặc kho',
    'any.required': 'Chọn nơi gắn lốp'
  }),
  plate: Joi.string().trim().allow('').max(20).default('').messages({
    'string.max': 'Biển số tối đa 20 ký tự'
  }),
  axle: Joi.number().integer().min(1).max(12).allow(null).empty('').default(null).messages({
    'number.base': 'Cầu phải là số',
    'number.min': 'Cầu từ 1 đến 12',
    'number.max': 'Cầu từ 1 đến 12'
  }),
  position: Joi.string().valid(...POSITIONS).default('').messages({
    'any.only': 'Chọn vị trí bánh'
  }),
  note: Joi.string().trim().allow('').max(300).default('').messages({
    'string.max': 'Ghi chú tối đa 300 ký tự'
  }),
  brand: Joi.string().trim().allow('').max(60).default('').messages({
    'string.max': 'Loại lốp tối đa 60 ký tự'
  }),
  wear: Joi.number().integer().min(0).max(100).default(100).messages({
    'number.base': '% còn phải là số',
    'number.min': '% còn từ 0 đến 100',
    'number.max': '% còn từ 0 đến 100'
  }),
  km: Joi.number().integer().min(0).max(9999999).allow(null).empty('').optional().messages({
    'number.base': 'Km phải là số',
    'number.min': 'Km không được âm',
    'number.max': 'Km quá lớn'
  })
}

const createSchema = Joi.object({
  serial: Joi.string().trim().min(1).max(40).required().messages({
    'string.empty': 'Nhập số seri',
    'any.required': 'Nhập số seri',
    'string.max': 'Số seri tối đa 40 ký tự'
  }),
  ...placeFields
})

const lineSchema = Joi.object({
  serial: Joi.string().trim().min(1).max(40).required().messages({
    'string.empty': 'Nhập số seri',
    'any.required': 'Nhập số seri',
    'string.max': 'Số seri tối đa 40 ký tự'
  }),
  brand: Joi.string().trim().allow('').max(60).default(''),
  wear: Joi.number().integer().min(0).max(100).default(100).messages({
    'number.base': '% còn phải là số',
    'number.min': '% còn từ 0 đến 100',
    'number.max': '% còn từ 0 đến 100'
  }),
  axle: Joi.number().integer().min(1).max(12).required().messages({
    'number.base': 'Cầu phải là số',
    'number.min': 'Cầu từ 1 đến 12',
    'number.max': 'Cầu từ 1 đến 12',
    'any.required': 'Nhập cầu'
  }),
  side: Joi.string().valid('trai', 'phai').required().messages({
    'any.only': 'Chọn bên trái hoặc bên phải',
    'any.required': 'Chọn bên trái hoặc bên phải'
  })
})

const mountSchema = Joi.object({
  kind: Joi.string().valid('dau', 'mooc').required().messages({
    'any.only': 'Chọn đầu hoặc mooc',
    'any.required': 'Chọn đầu hoặc mooc'
  }),
  plate: Joi.string().trim().min(1).max(20).required().messages({
    'string.empty': 'Nhập biển số',
    'any.required': 'Nhập biển số',
    'string.max': 'Biển số tối đa 20 ký tự'
  }),
  lines: Joi.array().items(lineSchema).min(1).max(20).required().messages({
    'array.min': 'Thêm ít nhất một lốp',
    'array.max': 'Một phiếu tối đa 20 lốp',
    'any.required': 'Thêm ít nhất một lốp'
  }),
  km: Joi.number().integer().min(0).max(9999999).allow(null).empty('').optional().messages({
    'number.base': 'Km phải là số',
    'number.min': 'Km không được âm',
    'number.max': 'Km quá lớn'
  })
})

const correctSchema = Joi.object({
  serial: Joi.string().trim().min(1).max(40).required().messages({
    'string.empty': 'Nhập số seri',
    'any.required': 'Nhập số seri',
    'string.max': 'Số seri tối đa 40 ký tự'
  }),
  brand: Joi.string().trim().allow('').max(60).default('').messages({
    'string.max': 'Loại lốp tối đa 60 ký tự'
  }),
  wear: Joi.number().integer().min(0).max(100).required().messages({
    'number.base': '% còn phải là số',
    'number.min': '% còn từ 0 đến 100',
    'number.max': '% còn từ 0 đến 100',
    'any.required': 'Nhập % còn'
  }),
  km: Joi.number().integer().min(0).max(9999999).allow(null).empty('').optional().messages({
    'number.base': 'Km phải là số',
    'number.min': 'Km không được âm',
    'number.max': 'Km quá lớn'
  }),
  kmAccumulated: Joi.number().min(0).max(9999999).allow(null).empty('').optional().messages({
    'number.base': 'Km đã đi phải là số',
    'number.min': 'Km không được âm',
    'number.max': 'Km quá lớn'
  })
})

const moveSchema = Joi.object(placeFields)

const validateId = (req, res, next) => {
  if (!OBJECT_ID_RULE.test(req.params.id || '')) {
    next(new ApiError(StatusCodes.BAD_REQUEST, OBJECT_ID_RULE_MESSAGE))
    return
  }
  next()
}

export const tireValidation = {
  create: validateRequest(createSchema),
  mount: validateRequest(mountSchema),
  correct: validateRequest(correctSchema),
  move: validateRequest(moveSchema),
  validateId
}
