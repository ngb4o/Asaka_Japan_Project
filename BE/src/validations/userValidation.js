import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { validateRequest } from '~/validations/validateRequest'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE, EMAIL_JOI_OPTIONS } from '~/utils/validators'

const register = async (req, res, next) => {
  next(new ApiError(StatusCodes.FORBIDDEN, 'Public registration is disabled!'))
}

const login = async (req, res, next) => {
  const correctCondition = Joi.object({
    email: Joi.string().email(EMAIL_JOI_OPTIONS).required().trim().strict(),
    password: Joi.string().required().trim().strict()
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message))
  }
}

const getUserById = async (req, res, next) => {
  const correctCondition = Joi.object({
    id: Joi.string().required().trim().strict()
  })

  try {
    await correctCondition.validateAsync(req.params, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, error.message))
  }
}

const updateRoleSchema = Joi.object({
  role: Joi.string().valid('admin', 'sales', 'warehouse', 'accountant').required()
})

const createByAdminSchema = Joi.object({
  employeeId: Joi.string()
    .required()
    .pattern(OBJECT_ID_RULE)
    .message(OBJECT_ID_RULE_MESSAGE),
  email: Joi.string().email(EMAIL_JOI_OPTIONS).trim().allow('', null),
  password: Joi.string().min(6).trim().allow('', null),
  role: Joi.string().valid('admin', 'sales', 'warehouse', 'accountant').default('sales')
})

const updatePasswordSchema = Joi.object({
  password: Joi.string().required().min(6).trim().strict()
})

const changeOwnPasswordSchema = Joi.object({
  currentPassword: Joi.string().required().min(6).trim().strict(),
  newPassword: Joi.string().required().min(6).trim().strict()
})

export const userValidation = {
  register,
  login,
  getUserById,
  createByAdmin: validateRequest(createByAdminSchema),
  updateRole: validateRequest(updateRoleSchema),
  updatePassword: validateRequest(updatePasswordSchema),
  changeOwnPassword: validateRequest(changeOwnPasswordSchema)
}
