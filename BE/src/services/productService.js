import { productModel } from '~/models/productModel'
import { productCategoryModel } from '~/models/productCategoryModel'
import { warehouseStockModel } from '~/models/warehouseStockModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import { formatDocument, formatDocuments } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'

const MAX_PRODUCT_IMAGES = 5

const normalizeImages = (payload = {}) => {
  let images = []

  if (Array.isArray(payload.images)) {
    images = payload.images
  } else if (payload.image) {
    images = [payload.image]
  }

  images = images
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, MAX_PRODUCT_IMAGES)

  return {
    images,
    image: images[0] || ''
  }
}

const formatProduct = (product) => {
  const formatted = product?.id ? product : formatDocument(product)
  if (!formatted) return null

  const { images, image } = normalizeImages(formatted)

  return {
    ...formatted,
    images,
    image,
    displayOrder: Number.isFinite(Number(formatted.displayOrder))
      ? Number(formatted.displayOrder)
      : 0
  }
}

const pickProductPayload = (reqBody, userId) => {
  const { images, image } = normalizeImages(reqBody)

  return {
    name: reqBody.name,
    categoryId: reqBody.categoryId,
    price: reqBody.price,
    sku: reqBody.sku ?? '',
    description: reqBody.description ?? '',
    shortDescription: reqBody.shortDescription ?? '',
    unit: reqBody.unit ?? 'chai',
    unitsPerCase: reqBody.unitsPerCase ?? 1,
    costPrice: reqBody.costPrice ?? 0,
    activeIngredient: reqBody.activeIngredient ?? '',
    packaging: reqBody.packaging ?? '',
    image,
    images,
    displayOrder: Number.isFinite(Number(reqBody.displayOrder))
      ? Math.max(0, Math.floor(Number(reqBody.displayOrder)))
      : 0,
    status: reqBody.status ?? productModel.PRODUCT_STATUS.ACTIVE,
    createdBy: userId
  }
}

const ensureCategoryExists = async (categoryId) => {
  const category = await productCategoryModel.findOneById(categoryId)

  if (!category) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Không tìm thấy loại sản phẩm!')
  }

  return category
}

const createNew = async (reqBody, userId) => {
  await ensureCategoryExists(reqBody.categoryId)

  const created = await productModel.createNew(pickProductPayload(reqBody, userId))

  const product = await productModel.findOneById(created.insertedId)
  return formatProduct(product)
}

const getList = async (query) => {
  const findQuery = {}

  if (query.status) {
    findQuery.status = query.status
  }

  if (query.categoryId) {
    findQuery.categoryId = new ObjectId(query.categoryId)
  }

  if (query.search) {
    findQuery.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { sku: { $regex: query.search, $options: 'i' } },
      { activeIngredient: { $regex: query.search, $options: 'i' } }
    ]
  }

  const pagination = parsePaginationQuery(query)

  const options = {
    limit: pagination.limit,
    skip: pagination.skip
  }

  const result = await productModel.findMany(findQuery, options)
  const categories = await productCategoryModel.findMany({}, { limit: 200 })
  const categoryMap = new Map(
    categories.items.map((item) => [item._id.toString(), item.name])
  )

  const items = formatDocuments(result.items).map((item) => {
    const formatted = formatProduct(item)
    return {
      ...formatted,
      categoryName: categoryMap.get(item.categoryId) || ''
    }
  })

  const stockTotals = await warehouseStockModel.getTotalsByProductIds(
    items.map((item) => item.id)
  )

  const itemsWithStock = items.map((item) => ({
    ...item,
    totalStock: stockTotals.get(item.id) || 0
  }))

  return buildPaginationResult(
    {
      items: itemsWithStock,
      total: result.total,
      limit: pagination.limit,
      skip: pagination.skip
    },
    pagination.page
  )
}

const getDetails = async (productId) => {
  const product = await productModel.findOneById(productId)

  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm!')
  }

  const formatted = formatProduct(product)
  const category = await productCategoryModel.findOneById(product.categoryId)

  return {
    ...formatted,
    categoryName: category?.name || ''
  }
}

const update = async (productId, updateData) => {
  const product = await productModel.findOneById(productId)

  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm!')
  }

  if (updateData.categoryId) {
    await ensureCategoryExists(updateData.categoryId)
  }

  const allowedFields = [
    'name',
    'sku',
    'categoryId',
    'description',
    'shortDescription',
    'unit',
    'unitsPerCase',
    'price',
    'costPrice',
    'activeIngredient',
    'packaging',
    'displayOrder',
    'status'
  ]

  const dataToUpdate = {}
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      dataToUpdate[field] = updateData[field]
    }
  })

  if (dataToUpdate.displayOrder !== undefined) {
    dataToUpdate.displayOrder = Math.max(0, Math.floor(Number(dataToUpdate.displayOrder) || 0))
  }
  if (updateData.images !== undefined || updateData.image !== undefined) {
    const { images, image } = normalizeImages(updateData)
    dataToUpdate.images = images
    dataToUpdate.image = image
  }

  await productModel.update(productId, dataToUpdate)

  return await getDetails(productId)
}

const deleteOne = async (productId) => {
  const product = await productModel.findOneById(productId)

  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm!')
  }

  const totalStock = await warehouseStockModel.getTotalByProductId(productId)
  if (totalStock > 0) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Không thể xóa sản phẩm còn tồn trong kho!'
    )
  }

  await productModel.deleteOne(productId)

  return { message: 'Đã xóa sản phẩm thành công!' }
}

export const productService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
