/* eslint-disable no-console */
import { env } from '~/config/environment'
import { telegramClient } from '~/services/telegram/telegramClient'
import { telegramService } from '~/services/telegram/telegramService'
import { telegramCommands } from '~/services/telegram/telegramCommands'

let running = false
let stopped = false
let offset = 0

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Long-poll Telegram getUpdates when no public webhook URL is configured.
 * Required for local /start, /id replies.
 */
export const startTelegramPolling = async () => {
  if (!telegramClient.isEnabled()) {
    console.log('[telegram] polling skipped (disabled)')
    return
  }

  if (env.TELEGRAM_WEBHOOK_URL) {
    console.log('[telegram] webhook mode — polling skipped')
    return
  }

  if (running) return
  running = true
  stopped = false

  // Webhook and polling cannot run together
  await telegramClient.deleteWebhook({ drop_pending_updates: false })

  const me = await telegramClient.getMe({ force: true })
  if (!me.ok) {
    console.error(
      '[telegram] KHÔNG kết nối được api.telegram.org — bot sẽ không gửi/nhận tin.',
      'Thử: bật VPN, đổi DNS (1.1.1.1), hoặc kiểm tra firewall.',
      me.error || ''
    )
  } else {
    console.log(`[telegram] connected as @${me.data?.username || 'unknown'}`)
  }

  const commands = await telegramCommands.registerBotCommands()
  if (commands.ok) {
    console.log('[telegram] bot commands registered')
  } else {
    console.warn('[telegram] setMyCommands failed', commands.error || '')
  }

  console.log('[telegram] long-polling started (local mode)')

  while (!stopped) {
    try {
      const result = await telegramClient.getUpdates({
        offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query']
      })

      if (result.skipped) break

      if (!result.ok) {
        await sleep(3000)
        continue
      }

      const updates = result.data || []
      for (const update of updates) {
        offset = update.update_id + 1
        await telegramService.processUpdate(update)
      }
    } catch (error) {
      console.error('[telegram] polling error', error?.message || error)
      await sleep(3000)
    }
  }

  running = false
}

export const stopTelegramPolling = () => {
  stopped = true
}
