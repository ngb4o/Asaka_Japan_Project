import { newsModel } from '~/models/newsModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { formatDocument, formatDocuments, slugify } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'

const formatNews = (news) => {
  const formatted = news?.id ? news : formatDocument(news)
  if (!formatted) return null

  return {
    ...formatted,
    displayOrder: Number.isFinite(Number(formatted.displayOrder))
      ? Number(formatted.displayOrder)
      : 0
  }
}

const pickNewsPayload = (reqBody, userId) => ({
  title: reqBody.title,
  slug: slugify(reqBody.slug || reqBody.title),
  content: reqBody.content,
  image: reqBody.image ?? '',
  displayOrder: Number.isFinite(Number(reqBody.displayOrder))
    ? Math.max(0, Math.floor(Number(reqBody.displayOrder)))
    : 0,
  status: reqBody.status ?? newsModel.NEWS_STATUS.ACTIVE,
  createdBy: userId
})

const ensureSlugUnique = async (slug, excludeId = null) => {
  const existing = await newsModel.findOneBySlug(slug, excludeId)

  if (existing) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'News slug already exists!')
  }
}

const createNew = async (reqBody, userId) => {
  const payload = pickNewsPayload(reqBody, userId)
  await ensureSlugUnique(payload.slug)

  const created = await newsModel.createNew(payload)
  const news = await newsModel.findOneById(created.insertedId)

  return formatNews(news)
}

const getList = async (query) => {
  const findQuery = {}

  if (query.status) {
    findQuery.status = query.status
  }

  if (query.search) {
    findQuery.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { content: { $regex: query.search, $options: 'i' } }
    ]
  }

  const pagination = parsePaginationQuery(query)

  const options = {
    limit: pagination.limit,
    skip: pagination.skip
  }

  const result = await newsModel.findMany(findQuery, options)

  return buildPaginationResult(
    {
      items: formatDocuments(result.items).map(formatNews),
      total: result.total,
      limit: pagination.limit,
      skip: pagination.skip
    },
    pagination.page
  )
}

const getDetails = async (newsId) => {
  const news = await newsModel.findOneById(newsId)

  if (!news) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'News not found!')
  }

  return formatNews(news)
}

const update = async (newsId, updateData) => {
  const news = await newsModel.findOneById(newsId)

  if (!news) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'News not found!')
  }

  const allowedFields = ['title', 'slug', 'content', 'image', 'displayOrder', 'status']
  const dataToUpdate = {}

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      dataToUpdate[field] = updateData[field]
    }
  })

  if (dataToUpdate.displayOrder !== undefined) {
    dataToUpdate.displayOrder = Math.max(0, Math.floor(Number(dataToUpdate.displayOrder) || 0))
  }

  if (dataToUpdate.title && !dataToUpdate.slug) {
    dataToUpdate.slug = slugify(dataToUpdate.title)
  }

  if (dataToUpdate.slug) {
    dataToUpdate.slug = slugify(dataToUpdate.slug)
    await ensureSlugUnique(dataToUpdate.slug, newsId)
  }

  await newsModel.update(newsId, dataToUpdate)

  return await getDetails(newsId)
}

const deleteOne = async (newsId) => {
  const news = await newsModel.findOneById(newsId)

  if (!news) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'News not found!')
  }

  await newsModel.deleteOne(newsId)

  return { message: 'News deleted successfully!' }
}

export const newsService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
