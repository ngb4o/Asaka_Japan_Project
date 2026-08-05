const { getToolsForRoles, findTool } = require('../src/services/chat/toolRegistry')
const {
  createPendingAction,
  getPendingAction,
  cancelPendingAction,
  consumePendingAction
} = require('../src/services/chat/pendingActions')
const { hasAnyRole } = require('../src/utils/roles')

async function main() {
  const sales = getToolsForRoles(['sales']).map((t) => t.name)
  const accountant = getToolsForRoles(['accountant']).map((t) => t.name)
  const warehouse = getToolsForRoles(['warehouse']).map((t) => t.name)
  const admin = getToolsForRoles(['admin']).map((t) => t.name)

  const assert = (cond, msg) => {
    if (!cond) throw new Error(msg)
  }

  assert(!sales.includes('get_sales_report'), 'sales must not see sales report')
  assert(accountant.includes('get_sales_report'), 'accountant must see sales report')
  assert(admin.includes('get_sales_report'), 'admin must see sales report')
  assert(!warehouse.includes('record_order_payment'), 'warehouse no payment')
  assert(sales.includes('record_order_payment'), 'sales can payment')
  assert(sales.includes('update_order_status'), 'sales can update order')
  assert(findTool('create_dealer').kind === 'write', 'create_dealer is write')

  const pending = createPendingAction({
    userId: 'user-a',
    toolName: 'update_order_status',
    args: {},
    preview: 'test',
    execute: async () => ({ done: true })
  })
  assert(!getPendingAction(pending.token, 'user-b'), 'user B cannot read A pending')
  assert(!!getPendingAction(pending.token, 'user-a'), 'user A can read pending')
  assert(cancelPendingAction(pending.token, 'user-a'), 'cancel works')
  assert(!getPendingAction(pending.token, 'user-a'), 'gone after cancel')

  const pending2 = createPendingAction({
    userId: 'user-a',
    toolName: 'x',
    args: {},
    preview: 'p',
    execute: async () => ({ ok: 1 })
  })
  const consumed = consumePendingAction(pending2.token, 'user-a')
  const result = await consumed.execute()
  assert(result.ok === 1, 'execute works')

  console.log('SMOKE_OK', {
    salesTools: sales.length,
    accountantTools: accountant.length,
    warehouseTools: warehouse.length,
    adminTools: admin.length,
    adminBypass: hasAnyRole(['admin'], 'accountant')
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
