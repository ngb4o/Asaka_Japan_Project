import { StatusCodes } from 'http-status-codes'
import { inventoryService } from '~/services/inventoryService'

const importStock = async (req, res, next) => {
  try {
    const result = await inventoryService.importStock(req.body, req.userId)

    res.status(StatusCodes.CREATED).json({
      message: 'Nhập kho thành công!',
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
      message: 'Xuất kho thành công!',
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
      message: 'Lấy tồn kho thành công!',
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
      message: 'Lấy lịch sử kho thành công!',
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
