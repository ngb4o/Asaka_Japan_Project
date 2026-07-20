import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userRoute } from '~/routes/v1/userRoute'
import { productCategoryRoute } from '~/routes/v1/productCategoryRoute'
import { productRoute } from '~/routes/v1/productRoute'
import { newsRoute } from '~/routes/v1/newsRoute'
import { warehouseRoute } from '~/routes/v1/warehouseRoute'
import { inventoryRoute } from '~/routes/v1/inventoryRoute'
import { uploadRoute } from '~/routes/v1/uploadRoute'
import { leadRoute } from '~/routes/v1/leadRoute'
import { dealerRoute } from '~/routes/v1/dealerRoute'
import { quoteRoute } from '~/routes/v1/quoteRoute'
import { orderRoute } from '~/routes/v1/orderRoute'
import { dashboardRoute } from '~/routes/v1/dashboardRoute'
import { notificationRoute } from '~/routes/v1/notificationRoute'

const Router = express.Router()

Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'ASAKA CRM API is ready' })
})

Router.get('/health', (req, res) => {
  res.status(StatusCodes.OK).json({
    ok: true,
    service: 'asaka-api',
    time: new Date().toISOString()
  })
})

Router.use('/users', userRoute)
Router.use('/product-categories', productCategoryRoute)
Router.use('/products', productRoute)
Router.use('/news', newsRoute)
Router.use('/warehouses', warehouseRoute)
Router.use('/inventory', inventoryRoute)
Router.use('/uploads', uploadRoute)
Router.use('/leads', leadRoute)
Router.use('/dealers', dealerRoute)
Router.use('/quotes', quoteRoute)
Router.use('/orders', orderRoute)
Router.use('/dashboard', dashboardRoute)
Router.use('/notifications', notificationRoute)

export const APIs_V1 = Router
