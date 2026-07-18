import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

export const validateRequest = (schema, property = 'body') => {
  return async (req, res, next) => {
    try {
      const validated = await schema.validateAsync(req[property], {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      })

      req[property] = validated
      next()
    } catch (error) {
      const message =
        error.details?.map((detail) => detail.message).join(', ') || error.message

      next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, message))
    }
  }
}
