import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { validateRequest } from '~/validations/validateRequest'

const register = async (req, res, next) => {
  next(new ApiError(StatusCodes.FORBIDDEN, 'Public registration is disabled!'))
}

const login = async (req, res, next) => {
  const correctCondition = Joi.object({
    account: Joi.string().trim().optional(),
    email: Joi.string().trim().optional(),
    password: Joi.string().required().trim().strict()
  }).or('account', 'email')

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

export const userValidation = {
  register,
  login,
  getUserById,
  updateRole: validateRequest(updateRoleSchema)
}
