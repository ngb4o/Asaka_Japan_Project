import express from 'express'
import { VIETNAM_PROVINCES } from '~/utils/vietnamRegions'

const Router = express.Router()

Router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Lấy danh sách khu vực thành công!',
    data: VIETNAM_PROVINCES
  })
})

export const regionRoute = Router
