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
import { orderRoute } from '~/routes/v1/orderRoute'
import { employeeRoute } from '~/routes/v1/employeeRoute'
import { tripRoute } from '~/routes/v1/tripRoute'
import { payrollRoute } from '~/routes/v1/payrollRoute'
import { dashboardRoute } from '~/routes/v1/dashboardRoute'
import { notificationRoute } from '~/routes/v1/notificationRoute'
import { telegramRoute } from '~/routes/v1/telegramRoute'

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
Router.use('/orders', orderRoute)
Router.use('/employees', employeeRoute)
Router.use('/trips', tripRoute)
Router.use('/payroll', payrollRoute)
Router.use('/dashboard', dashboardRoute)
Router.use('/notifications', notificationRoute)
Router.use('/telegram', telegramRoute)

export const APIs_V1 = Router
