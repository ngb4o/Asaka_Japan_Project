import { StatusCodes } from 'http-status-codes'
import { inventoryService } from '~/services/inventoryService'

const importStock = async (req, res, next) => {
  try {
    const result = await inventoryService.importStock(req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Stock imported successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const exportStock = async (req, res, next) => {
  try {
    const result = await inventoryService.exportStock(req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Stock exported successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getStocks = async (req, res, next) => {
  try {
    const result = await inventoryService.getStocks(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Get warehouse stocks successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

const getTransactions = async (req, res, next) => {
  try {
    const result = await inventoryService.getTransactions(req.query)

    res.status(StatusCodes.OK).json({
      message: 'Get inventory transactions successfully!',
      data: result
    })
  } catch (error) {
    next(error)
  }
}

export const inventoryController = {
  importStock,
  exportStock,
  getStocks,
  getTransactions
}
