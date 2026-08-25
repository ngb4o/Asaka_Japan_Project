import { ObjectId } from 'mongodb'
import { GET_DB, CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { productCategoryModel } from '~/models/productCategoryModel'
import { productModel } from '~/models/productModel'

const QUOTE_COLLECTION_NAME = 'quotes'
const PRODUCT_COLLECTION_NAME = 'products'
const PRODUCT_CATEGORY_COLLECTION_NAME = 'product_categories'

const backfillQuoteLinesCategory = async () => {
  const db = GET_DB()
  const quotes = await db.collection(QUOTE_COLLECTION_NAME).find({ _destroy: false }).toArray()

  if (!quotes.length) {
    console.log('Không có báo giá nào trong DB.')
    return { updatedQuotes: 0, updatedLines: 0 }
  }

  const productIds = new Set()
  for (const quote of quotes) {
    for (const line of quote.lines || []) {
      if (line?.productId && (!line.categoryName || !line.categoryId)) {
        productIds.add(line.productId)
      }
    }
  }

  if (!productIds.size) {
    console.log('Tất cả line đều đã có categoryName/categoryId.')
    return { updatedQuotes: 0, updatedLines: 0 }
  }

  const products = await db.collection(PRODUCT_COLLECTION_NAME)
    .find({
      _id: { $in: [...productIds].map((id) => new ObjectId(id)) },
      _destroy: false
    })
    .toArray()

  const productMap = new Map()
  for (const p of products) {
    productMap.set(p._id.toString(), p)
  }

  const categoryIds = new Set(
    products
      .map((p) => p.categoryId)
      .filter(Boolean)
      .map((id) => id.toString ? id.toString() : id)
  )

  const categories = await db.collection(PRODUCT_CATEGORY_COLLECTION_NAME)
    .find({
      _id: { $in: [...categoryIds].map((id) => new ObjectId(id)) },
      _destroy: false
    })
    .toArray()

  const categoryMap = new Map()
  for (const c of categories) {
    categoryMap.set(c._id.toString(), c)
  }

  let updatedQuotes = 0
  let updatedLines = 0

  for (const quote of quotes) {
    let modified = false
    const newLines = (quote.lines || []).map((line) => {
      const needCatId = !line.categoryId
      const needCatName = !line.categoryName
      if (!needCatId && !needCatName) return line
      if (!line.productId) return line

      const product = productMap.get(line.productId.toString ? line.productId.toString() : line.productId)
      if (!product) return line

      const categoryId = (product.categoryId || '').toString()
      const category = categoryId ? categoryMap.get(categoryId) : null
      const categoryName = category?.name || ''

      if (!categoryId && !categoryName) return line

      modified = true
      updatedLines += 1
      return {
        ...line,
        categoryId: needCatId ? categoryId : line.categoryId,
        categoryName: needCatName ? categoryName : line.categoryName
      }
    })

    if (modified) {
      await db.collection(QUOTE_COLLECTION_NAME).updateOne(
        { _id: quote._id },
        { $set: { lines: newLines, updatedAt: new Date() } }
      )
      updatedQuotes += 1
    }
  }

  return { updatedQuotes, updatedLines }
}

const main = async () => {
  try {
    await CONNECT_DB()
    console.log('Kết nối DB thành công.')
    const { updatedQuotes, updatedLines } = await backfillQuoteLinesCategory()
    console.log(`Đã cập nhật ${updatedLines} dòng trong ${updatedQuotes} báo giá.`)
  } catch (error) {
    console.error('Lỗi khi backfill:', error)
    process.exitCode = 1
  } finally {
    await CLOSE_DB()
  }
}

main()