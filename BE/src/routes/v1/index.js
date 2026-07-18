import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userRoute } from '~/routes/v1/userRoute'
import { productCategoryRoute } from '~/routes/v1/productCategoryRoute'
import { productRoute } from '~/routes/v1/productRoute'
import { newsRoute } from '~/routes/v1/newsRoute'
import { warehouseRoute } from '~/routes/v1/warehouseRoute'
import { inventoryRoute } from '~/routes/v1/inventoryRoute'
import { uploadRoute } from '~/routes/v1/uploadRoute'

const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'ASAKA CRM API is ready' })
})

Router.use('/users', userRoute)
Router.use('/product-categories', productCategoryRoute)
Router.use('/products', productRoute)
Router.use('/news', newsRoute)
Router.use('/warehouses', warehouseRoute)
Router.use('/inventory', inventoryRoute)
Router.use('/uploads', uploadRoute)

export const APIs_V1 = Router
