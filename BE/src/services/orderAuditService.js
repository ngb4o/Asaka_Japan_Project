import { ObjectId } from 'mongodb'
import { orderAuditModel } from '~/models/orderAuditModel'
import { userModel } from '~/models/userModel'
import { employeeModel } from '~/models/employeeModel'
import { GET_DB } from '~/config/mongodb'

/**
 * Fire-and-forget safe logger — never breaks the main order flow.
 */
const log = async ({ orderId, orderCode, action, actorUserId, meta = {} }) => {
  try {
    if (!orderId || !action) return
    await orderAuditModel.createNew({
      orderId: String(orderId),
      orderCode: orderCode || '',
      action,
      actorUserId: actorUserId || null,
      meta: meta || {}
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[orderAudit] failed to write', action, error?.message || error)
  }
}

const resolveActorLabels = async (userIds) => {
  const unique = [...new Set(userIds.filter(Boolean).map(String))]
  if (!unique.length) return new Map()

  const objectIds = unique.map((id) => new ObjectId(id))
  const [users, employees] = await Promise.all([
    GET_DB()
      .collection(userModel.USER_COLLECTION_NAME)
      .find({ _id: { $in: objectIds } }, { projection: { email: 1, username: 1 } })
      .toArray(),
    GET_DB()
      .collection(employeeModel.EMPLOYEE_COLLECTION_NAME)
      .find(
        { userId: { $in: objectIds }, _destroy: false },
        { projection: { userId: 1, fullName: 1, code: 1 } }
      )
      .toArray()
  ])

  const employeeByUser = new Map(
    employees.map((item) => [item.userId.toString(), item])
  )
  const map = new Map()
  for (const user of users) {
    const id = user._id.toString()
    const employee = employeeByUser.get(id)
    map.set(id, {
      actorUserId: id,
      actorName: employee?.fullName || user.username || user.email || 'Người dùng',
      actorEmail: user.email || '',
      actorCode: employee?.code || ''
    })
  }
  return map
}

const getByOrderId = async (orderId) => {
  const result = await orderAuditModel.findByOrderId(orderId, { limit: 100, skip: 0 })
  const actorMap = await resolveActorLabels(
    result.items.map((item) => item.actorUserId?.toString?.() || item.actorUserId)
  )

  const items = result.items.map((doc) => {
    const actorId = doc.actorUserId?.toString?.() || null
    const actor = actorId ? actorMap.get(actorId) : null
    return {
      id: doc._id.toString(),
      orderId: doc.orderId?.toString?.() || '',
      orderCode: doc.orderCode || '',
      action: doc.action,
      meta: doc.meta || {},
      actorUserId: actorId,
      actorName: actor?.actorName || (actorId ? 'Người dùng đã xóa' : 'Hệ thống'),
      actorEmail: actor?.actorEmail || '',
      actorCode: actor?.actorCode || '',
      createdAt: doc.createdAt
    }
  })

  return { items, total: result.total }
}

export const orderAuditService = {
  AUDIT_ACTION: orderAuditModel.AUDIT_ACTION,
  log,
  getByOrderId
}
