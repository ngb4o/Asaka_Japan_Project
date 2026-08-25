import { productCategoryModel } from '~/models/productCategoryModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { slugify, formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { buildSearchFilter } from '~/utils/search.js'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'

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
    pestTypes: reqBody.pestTypes || [],
    status: reqBody.status || productCategoryModel.PRODUCT_CATEGORY_STATUS.ACTIVE,
    order: typeof reqBody.order === 'number' ? reqBody.order : 9999,
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

  const nameSearch = buildSearchFilter(['name'], query.search)
  if (nameSearch) Object.assign(findQuery, nameSearch)

  const pagination = parsePaginationQuery(query)

  const options = {
    limit: pagination.limit,
    skip: pagination.skip,
    sort: { order: 1, name: 1 }
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

  if (updateData.pestTypes !== undefined) {
    dataToUpdate.pestTypes = updateData.pestTypes
  }

  if (updateData.order !== undefined) {
    dataToUpdate.order = updateData.order
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

const reorder = async (orderedIds) => {
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Danh sách id không hợp lệ!')
  }

  const uniqueIds = [...new Set(orderedIds)]
  if (uniqueIds.length !== orderedIds.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Danh sách id bị trùng lặp!')
  }

  const collection = GET_DB().collection(
    productCategoryModel.PRODUCT_CATEGORY_COLLECTION_NAME
  )

  const objectIds = uniqueIds.map((id) => new ObjectId(id))
  const existing = await collection
    .find({ _id: { $in: objectIds }, _destroy: false }, { projection: { _id: 1 } })
    .toArray()

  if (existing.length !== uniqueIds.length) {
    const found = new Set(existing.map((d) => d._id.toString()))
    const missing = uniqueIds.find((id) => !found.has(id))
    throw new ApiError(StatusCodes.NOT_FOUND, `Không tìm thấy loại sản phẩm: ${missing}`)
  }

  const now = new Date()
  const bulkOps = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: new ObjectId(id), _destroy: false },
      update: { $set: { order: index, updatedAt: now } }
    }
  }))

  await collection.bulkWrite(bulkOps)

  return { message: 'Đã cập nhật thứ tự loại sản phẩm.', updated: orderedIds.length }
}

export const productCategoryService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne,
  reorder
}
