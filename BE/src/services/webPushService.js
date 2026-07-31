/* eslint-disable no-console */
import webpush from 'web-push'
import { env } from '~/config/environment'
import { pushSubscriptionModel } from '~/models/pushSubscriptionModel'

let configured = false
let indexesReady = false

const isConfigured = () =>
  Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)

const ensureConfigured = () => {
  if (configured) return isConfigured()
  configured = true

  if (!isConfigured()) {
    console.warn('[web-push] VAPID keys missing — push disabled')
    return false
  }

  webpush.setVapidDetails(
    env.VAPID_SUBJECT || 'mailto:admin@asaka.local',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  )
  return true
}

const ensureIndexes = async () => {
  if (indexesReady) return
  try {
    await pushSubscriptionModel.ensureIndexes()
    indexesReady = true
  } catch (error) {
    console.warn('[web-push] indexes', error?.message || error)
  }
}

const hrefFromTrack = (track) => {
  const type = track?.entityType
  if (type === 'order') return '/orders'
  if (type === 'lead') return '/leads'
  if (type === 'dealer') return '/dealers'
  if (type === 'trip') return '/trips'
  if (type === 'product') return '/inventory'
  return '/dashboard'
}

const buildPayload = (text, options = {}) => {
  if (options.push?.title) {
    return {
      title: String(options.push.title).slice(0, 48),
      body: String(options.push.body || '').slice(0, 90),
      url: options.push.url || hrefFromTrack(options.track) || '/dashboard',
      tag: options.push.tag || options.track?.kind || 'asaka-crm'
    }
  }

  // Fallback only — prefer explicit short `options.push` from notify callers
  return {
    title: 'ASAKA CRM',
    body: 'Có cập nhật mới',
    url: options.pushUrl || hrefFromTrack(options.track) || '/dashboard',
    tag: options.track?.kind || 'asaka-crm'
  }
}

const sendToSubscription = async (doc, payload) => {
  const subscription = {
    endpoint: doc.endpoint,
    keys: doc.keys
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url,
        tag: payload.tag,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png'
      }),
      {
        // Apple Push (iOS) drops messages more aggressively without TTL/urgency
        TTL: 60 * 60 * 24,
        urgency: 'high'
      }
    )
    return { ok: true }
  } catch (error) {
    const statusCode = error?.statusCode
    // Gone / expired subscription
    if (statusCode === 404 || statusCode === 410) {
      await pushSubscriptionModel.removeByEndpointOnly(doc.endpoint)
      return { ok: false, removed: true }
    }
    console.error('[web-push] send failed', statusCode || error?.message || error)
    return { ok: false }
  }
}

/** Broadcast to every CRM device that enabled push. */
const notifyStaff = async (text, options = {}) => {
  if (!ensureConfigured()) return { skipped: true, reason: 'not_configured' }

  await ensureIndexes()
  const subs = await pushSubscriptionModel.listAll()
  if (!subs.length) return { skipped: true, reason: 'no_subscribers' }

  const payload = buildPayload(text, options)
  const results = await Promise.all(subs.map((doc) => sendToSubscription(doc, payload)))

  return {
    sent: results.filter((item) => item.ok).length,
    removed: results.filter((item) => item.removed).length,
    total: subs.length
  }
}

const subscribe = async (userId, subscription, userAgent) => {
  if (!ensureConfigured()) {
    const error = new Error('Web Push chưa được cấu hình (thiếu VAPID keys)')
    error.statusCode = 503
    throw error
  }
  await ensureIndexes()
  return pushSubscriptionModel.upsert(userId, subscription, userAgent)
}

const unsubscribe = async (userId, endpoint) => {
  await ensureIndexes()
  return pushSubscriptionModel.removeByEndpoint(userId, endpoint)
}

const getStatusForUser = async (userId) => {
  await ensureIndexes()
  const count = await pushSubscriptionModel.countByUser(userId)
  return {
    enabled: isConfigured(),
    publicKey: env.VAPID_PUBLIC_KEY || null,
    subscribed: count > 0,
    deviceCount: count
  }
}

export const webPushService = {
  isConfigured,
  getPublicKey: () => env.VAPID_PUBLIC_KEY || null,
  subscribe,
  unsubscribe,
  getStatusForUser,
  notifyStaff,
  buildPayload
}
