import { productCategoryModel } from '~/models/productCategoryModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { slugify, formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'

const createNew = async (reqBody, userId) => {
  const slug = slugify(reqBody.slug || reqBody.name)

  const existingSlug = await productCategoryModel.findOneBySlug(slug)
  if (existingSlug) {
    throw new ApiError(StatusCodes.CONFLICT, 'Slug loại sản phẩm đã tồn tại!')
  }

  const created = await productCategoryModel.createNew({
    name: reqBody.name,
    slug,
    description: reqBody.description || '',
    status: reqBody.status || productCategoryModel.PRODUCT_CATEGORY_STATUS.ACTIVE,
    createdBy: userId
  })

  const category = await productCategoryModel.findOneById(created.insertedId)
  return formatDocument(category)
}

const getList = async (query) => {
  const findQuery = {}

  if (query.status) {
    findQuery.status = query.status
  }

  if (query.search) {
    const keyword = String(query.search).trim()
    if (keyword) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      findQuery.name = { $regex: escaped, $options: 'i' }
    }
  }

  const pagination = parsePaginationQuery(query)

  const options = {
    limit: pagination.limit,
    skip: pagination.skip
  }

  const result = await productCategoryModel.findMany(findQuery, options)

  return buildPaginationResult(
    {
      items: formatDocuments(result.items),
      total: result.total,
      limit: pagination.limit,
      skip: pagination.skip
    },
    pagination.page
  )
}

const getDetails = async (categoryId) => {
  const category = await productCategoryModel.findOneById(categoryId)

  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy loại sản phẩm!')
  }

  return formatDocument(category)
}

const update = async (categoryId, updateData) => {
  const category = await productCategoryModel.findOneById(categoryId)

  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy loại sản phẩm!')
  }

  const dataToUpdate = {}

  if (updateData.description !== undefined) {
    dataToUpdate.description = updateData.description
  }

  if (updateData.status !== undefined) {
    dataToUpdate.status = updateData.status
  }

  if (updateData.name !== undefined) {
    const nextSlug = slugify(updateData.name)
    const existingSlug = await productCategoryModel.findOneBySlug(nextSlug)

    if (existingSlug && existingSlug._id.toString() !== categoryId) {
      throw new ApiError(StatusCodes.CONFLICT, 'Slug loại sản phẩm đã tồn tại!')
    }

    dataToUpdate.name = updateData.name
    dataToUpdate.slug = nextSlug
  }

  await productCategoryModel.update(categoryId, dataToUpdate)

  const updatedCategory = await productCategoryModel.findOneById(categoryId)
  return formatDocument(updatedCategory)
}

const deleteOne = async (categoryId) => {
  const category = await productCategoryModel.findOneById(categoryId)

  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy loại sản phẩm!')
  }

  const productCount = await productCategoryModel.countProductsByCategoryId(categoryId)
  if (productCount > 0) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Không thể xóa loại sản phẩm còn chứa sản phẩm!'
    )
  }

  await productCategoryModel.deleteOne(categoryId)

  return { message: 'Đã xóa loại sản phẩm thành công!' }
}

export const productCategoryService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
