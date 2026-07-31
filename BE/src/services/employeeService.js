import { ObjectId } from 'mongodb'
import { employeeModel } from '~/models/employeeModel'
import { userModel } from '~/models/userModel'
import { GET_DB } from '~/config/mongodb'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { formatDocument } from '~/utils/formatters'
import { buildPaginationResult, parsePaginationQuery } from '~/utils/pagination'
import { generateDocumentCode } from '~/utils/documentCode'
import { buildSearchFilter } from '~/utils/search.js'

const formatEmployee = (employee, userMap = new Map()) => {
  const formatted = formatDocument(employee)
  if (!formatted) return null

  return {
    ...formatted,
    userId: employee.userId ? employee.userId.toString() : null,
    userName: employee.userId
      ? userMap.get(employee.userId.toString()) || ''
      : ''
  }
}

const loadUserMap = async (employees) => {
  const userIds = [
    ...new Set(
      employees.filter((item) => item.userId).map((item) => item.userId.toString())
    )
  ]
  if (!userIds.length) return new Map()

  const docs = await GET_DB()
    .collection(userModel.USER_COLLECTION_NAME)
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
    .toArray()

  return new Map(docs.map((user) => [user._id.toString(), user.email || user.username]))
}

const createNew = async (reqBody, userId) => {
  if (reqBody.userId) {
    const user = await userModel.findOneById(reqBody.userId)
    if (!user || user._destroy) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không tìm thấy tài khoản liên kết!')
    }
  }

  const code =
    reqBody.code?.trim() ||
    (await generateDocumentCode(employeeModel.EMPLOYEE_COLLECTION_NAME, 'NV'))

  const created = await employeeModel.createNew({
    code,
    fullName: reqBody.fullName,
    phone: reqBody.phone || '',
    email: reqBody.email || '',
    title: reqBody.title || '',
    department: reqBody.department || '',
    userId: reqBody.userId || null,
    baseSalary: Number(reqBody.baseSalary) || 0,
    commissionPercent: Number(reqBody.commissionPercent) || 0,
    allowance: Number(reqBody.allowance) || 0,
    bankAccount: reqBody.bankAccount || '',
    bankName: reqBody.bankName || '',
    bankQrImage: reqBody.bankQrImage || '',
    status: reqBody.status || employeeModel.EMPLOYEE_STATUS.ACTIVE,
    note: reqBody.note || '',
    createdBy: userId
  })

  return await getDetails(created.insertedId.toString())
}

const getList = async (query) => {
  const findQuery = {}
  if (query.status) findQuery.status = query.status
  const searchFilter = buildSearchFilter(
    ['fullName', 'code', 'phone', 'email', 'title'],
    query.search
  )
  if (searchFilter) Object.assign(findQuery, searchFilter)

  const pagination = parsePaginationQuery(query)
  const result = await employeeModel.findMany(findQuery, {
    limit: pagination.limit,
    skip: pagination.skip
  })
  const userMap = await loadUserMap(result.items)

  return buildPaginationResult(
    {
      items: result.items.map((item) => formatEmployee(item, userMap)),
      total: result.total,
      limit: pagination.limit,
      skip: pagination.skip
    },
    pagination.page
  )
}

const getDetails = async (employeeId) => {
  const employee = await employeeModel.findOneById(employeeId)
  if (!employee) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy nhân viên!')
  }
  const userMap = await loadUserMap([employee])
  return formatEmployee(employee, userMap)
}

const update = async (employeeId, updateData) => {
  const employee = await employeeModel.findOneById(employeeId)
  if (!employee) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy nhân viên!')
  }

  if (updateData.userId) {
    const user = await userModel.findOneById(updateData.userId)
    if (!user || user._destroy) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không tìm thấy tài khoản liên kết!')
    }
  }

  const dataToUpdate = {}
  const fields = [
    'fullName',
    'phone',
    'email',
    'title',
    'department',
    'bankAccount',
    'bankName',
    'bankQrImage',
    'status',
    'note',
    'code'
  ]
  for (const field of fields) {
    if (updateData[field] !== undefined) dataToUpdate[field] = updateData[field]
  }
  if (updateData.userId !== undefined) dataToUpdate.userId = updateData.userId || null
  if (updateData.baseSalary !== undefined) {
    dataToUpdate.baseSalary = Number(updateData.baseSalary) || 0
  }
  if (updateData.commissionPercent !== undefined) {
    dataToUpdate.commissionPercent = Number(updateData.commissionPercent) || 0
  }
  if (updateData.allowance !== undefined) {
    dataToUpdate.allowance = Number(updateData.allowance) || 0
  }

  await employeeModel.update(employeeId, dataToUpdate)
  return await getDetails(employeeId)
}

const deleteOne = async (employeeId) => {
  const employee = await employeeModel.findOneById(employeeId)
  if (!employee) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy nhân viên!')
  }
  await employeeModel.deleteOne(employeeId)
  return { message: 'Đã xóa nhân viên thành công!' }
}

export const employeeService = {
  createNew,
  getList,
  getDetails,
  update,
  deleteOne
}
