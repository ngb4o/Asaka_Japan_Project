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
    env.VAPID_SUBJECT || 'mailto:crm@asaka.jp',
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

const isAppleEndpoint = (endpoint = '') =>
  String(endpoint).includes('web.push.apple.com')

const hrefFromTrack = (track) => {
  const type = track?.entityType
  const id = track?.entityId ? String(track.entityId) : ''
  const withId = (path) => (id ? `${path}?id=${encodeURIComponent(id)}` : path)

  if (type === 'order') return withId('/orders')
  if (type === 'lead') return withId('/leads')
  if (type === 'dealer') return withId('/dealers')
  if (type === 'trip') return withId('/trips')
  if (type === 'product') return withId('/inventory')
  return '/dashboard'
}

const buildPayload = (text, options = {}) => {
  if (options.push?.title) {
    return {
      title: String(options.push.title).slice(0, 64),
      body: String(options.push.body || 'Có cập nhật mới').slice(0, 240),
      url: options.push.url || hrefFromTrack(options.track) || '/dashboard',
      tag: options.push.tag || options.track?.kind || 'asaka-crm'
    }
  }

  return {
    title: 'ASAKA CRM',
    body: 'Có cập nhật mới',
    url: options.pushUrl || hrefFromTrack(options.track) || '/dashboard',
    tag: options.track?.kind || 'asaka-crm'
  }
}

const sendToSubscription = async (doc, payload) => {
  const endpoint = doc.endpoint
  const subscription = {
    endpoint,
    keys: {
      p256dh: doc.keys?.p256dh,
      auth: doc.keys?.auth
    }
  }

  if (!subscription.keys.p256dh || !subscription.keys.auth) {
    console.error('[web-push] missing keys', endpoint?.slice?.(0, 48))
    return { ok: false }
  }

  const apple = isAppleEndpoint(endpoint)

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body || 'Có cập nhật mới',
        url: payload.url,
        tag: payload.tag
      }),
      {
        TTL: 60 * 60 * 24,
        // Apple Web Push is picky; high is OK, prefer normal fallback handled below
        urgency: apple ? 'high' : 'high',
        contentEncoding: 'aes128gcm'
      }
    )
    return { ok: true, apple }
  } catch (error) {
    const statusCode = error?.statusCode
    const body = error?.body || error?.message

    if (statusCode === 404 || statusCode === 410) {
      await pushSubscriptionModel.removeByEndpointOnly(endpoint)
      return { ok: false, removed: true, apple }
    }

    console.error('[web-push] send failed', {
      apple,
      statusCode,
      body,
      endpoint: String(endpoint || '').slice(0, 64)
    })
    return { ok: false, apple, statusCode }
  }
}

const sendToDocs = async (docs, payload) => {
  const results = await Promise.all(docs.map((doc) => sendToSubscription(doc, payload)))
  return {
    sent: results.filter((item) => item.ok).length,
    removed: results.filter((item) => item.removed).length,
    apple: results.filter((item) => item.apple).length,
    total: docs.length
  }
}

/** Broadcast to every CRM device that enabled push. */
const notifyStaff = async (text, options = {}) => {
  if (!ensureConfigured()) return { skipped: true, reason: 'not_configured' }

  await ensureIndexes()
  const subs = await pushSubscriptionModel.listAll()
  if (!subs.length) return { skipped: true, reason: 'no_subscribers' }

  const payload = buildPayload(text, options)
  return sendToDocs(subs, payload)
}

/** Send only to the signed-in user's devices (for "Gửi thử"). */
const notifyUser = async (userId, payloadInput = {}) => {
  if (!ensureConfigured()) return { skipped: true, reason: 'not_configured' }

  await ensureIndexes()
  const subs = await pushSubscriptionModel.listByUser(userId)
  if (!subs.length) return { skipped: true, reason: 'no_subscribers' }

  const payload = {
    title: payloadInput.title || 'ASAKA CRM',
    body: payloadInput.body || 'Tin thử thông báo đẩy',
    url: payloadInput.url || '/dashboard',
    tag: payloadInput.tag || 'asaka-push-test'
  }

  return sendToDocs(subs, payload)
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
  const subs = await pushSubscriptionModel.listByUser(userId)
  return {
    enabled: isConfigured(),
    publicKey: env.VAPID_PUBLIC_KEY || null,
    subscribed: subs.length > 0,
    deviceCount: subs.length,
    hasAppleDevice: subs.some((item) => isAppleEndpoint(item.endpoint))
  }
}

export const webPushService = {
  isConfigured,
  getPublicKey: () => env.VAPID_PUBLIC_KEY || null,
  subscribe,
  unsubscribe,
  getStatusForUser,
  notifyStaff,
  notifyUser,
  buildPayload
}
