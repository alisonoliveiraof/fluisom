import { v4 as uuidv4 } from 'uuid'
import { generateLyricsForOrder } from './lyrics.controller.js'
import {
  generateMusicForOrder,
  ensureAllMusicVersions,
  refreshOrderSunoStatus,
  checkOrderNeedsSunoSync,
} from './music.controller.js'
import { buildMusicTitle, getGenreStyle } from '../utils/prompt.builder.js'
import {
  createOrder,
  getOrderById,
  updateOrder,
  getAdminSetting,
  countTodayGenerations,
  listOrdersByEmail,
} from '../services/supabase.service.js'
import { getLyricsPreview } from '../utils/prompt.builder.js'
import { mapVersionsForClient } from '../utils/musicVersions.js'
import { orderStatusToProgress, orderStatusLabel } from '../utils/status.mapper.js'

export async function startQuiz(req, res, next) {
  try {
    const enabled = await getAdminSetting('generation_enabled')
    if (enabled === false || enabled === 'false') {
      return res.status(503).json({ error: true, message: 'Geração temporariamente pausada', code: 'GENERATION_DISABLED' })
    }

    const maxDaily = Number(await getAdminSetting('max_daily_generations')) || 100
    const todayCount = await countTodayGenerations()
    if (todayCount >= maxDaily) {
      return res.status(429).json({ error: true, message: 'Limite diário de gerações atingido', code: 'DAILY_LIMIT' })
    }

    const sessionId = req.body.sessionId || uuidv4()
    const orderData = mapQuizBodyToOrder(req.body, req)

    const order = await createOrder({
      ...orderData,
      session_id: sessionId,
      status: 'pending',
    })

    res.status(201).json({
      orderId: order.id,
      sessionId,
      status: order.status,
    })
  } catch (err) {
    next(err)
  }
}

export async function generateLyricsStep(req, res, next) {
  try {
    const order = await getOrderById(req.params.orderId)

    if (['lyrics_ready', 'generating_music', 'music_ready', 'preview_shown', 'payment_pending', 'paid', 'delivered'].includes(order.status)) {
      return res.json({
        orderId: order.id,
        status: order.status,
        progress: orderStatusToProgress(order.status, order.suno_status),
        statusLabel: orderStatusLabel(order.status),
        skipped: true,
      })
    }

    if (order.status === 'failed' && order.generated_lyrics) {
      await updateOrder(order.id, { status: 'lyrics_ready', error_message: null })
      const updated = await getOrderById(order.id)
      return res.json({
        orderId: updated.id,
        status: updated.status,
        progress: orderStatusToProgress(updated.status),
        statusLabel: orderStatusLabel(updated.status),
      })
    }

    if (order.status === 'generating_lyrics') {
      return res.status(409).json({
        error: true,
        message: 'Letra já está sendo gerada',
        code: 'LYRICS_IN_PROGRESS',
        orderId: order.id,
        status: order.status,
      })
    }

    const updated = await generateLyricsForOrder(order.id)
    res.json({
      orderId: updated.id,
      status: updated.status,
      progress: orderStatusToProgress(updated.status),
      statusLabel: orderStatusLabel(updated.status),
    })
  } catch (err) {
    next(err)
  }
}

export async function submitMusicStep(req, res, next) {
  try {
    const order = await getOrderById(req.params.orderId)

    if (['music_ready', 'preview_shown', 'payment_pending', 'paid', 'delivered'].includes(order.status)) {
      return res.json({
        orderId: order.id,
        status: order.status,
        progress: orderStatusToProgress(order.status, order.suno_status),
        statusLabel: orderStatusLabel(order.status),
        skipped: true,
      })
    }

    if (order.status === 'generating_music' && order.suno_task_id) {
      return res.json({
        orderId: order.id,
        status: order.status,
        progress: orderStatusToProgress(order.status, order.suno_status),
        statusLabel: orderStatusLabel(order.status),
        skipped: true,
      })
    }

    if (!order.generated_lyrics) {
      return res.status(400).json({
        error: true,
        message: 'Gere a letra antes de enviar a música',
        code: 'LYRICS_REQUIRED',
      })
    }

    if (order.status !== 'lyrics_ready') {
      await updateOrder(order.id, { status: 'lyrics_ready', error_message: null })
    }

    const updated = await generateMusicForOrder(order.id)
    res.json({
      orderId: updated.id,
      status: updated.status,
      progress: orderStatusToProgress(updated.status, updated.suno_status),
      statusLabel: orderStatusLabel(updated.status),
    })
  } catch (err) {
    next(err)
  }
}

function mapOrderForClient(order) {
  const isPaid = order.payment_status === 'paid'
  const versions = mapVersionsForClient(order, { includeFullAudio: isPaid })
  const primary = versions[0]
  return {
    orderId: order.id,
    honoredName: order.honored_name,
    status: order.status,
    statusLabel: orderStatusLabel(order.status),
    musicTitle: order.music_title,
    previewAudioUrl: primary?.previewAudioUrl || order.preview_audio_url,
    fullAudioUrl: isPaid ? primary?.fullAudioUrl || order.full_audio_url : null,
    coverImageUrl: primary?.coverImageUrl || order.cover_image_url,
    versions,
    lyrics: isPaid ? order.generated_lyrics || null : null,
    paymentStatus: order.payment_status || 'unpaid',
    paymentAmount: Number(order.payment_amount || 47.9),
    createdAt: order.created_at,
    canPreview: versions.some((v) => v.previewAudioUrl) && ['music_ready', 'preview_shown', 'payment_pending', 'paid', 'delivered'].includes(order.status),
    canDownload: isPaid && versions.some((v) => v.fullAudioUrl),
    needsPayment: ['music_ready', 'preview_shown', 'payment_pending'].includes(order.status) && !isPaid,
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const email = (req.query.email || '').trim()
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email)) {
      return res.status(400).json({ error: true, message: 'Informe um email válido', code: 'INVALID_EMAIL' })
    }

    const normalizedEmail = email.toLowerCase()
    const orderId = (req.query.orderId || '').trim()

    if (orderId) {
      try {
        const linked = await getOrderById(orderId)
        const linkedEmail = (linked.email || '').trim().toLowerCase()
        if (!linkedEmail) {
          await updateOrder(orderId, { email: normalizedEmail })
        }
      } catch {
        // orderId inválido — segue só com busca por email
      }
    }

    let orders = await listOrdersByEmail(normalizedEmail)

    orders = await Promise.all(
      orders.map(async (order) => {
        try {
          return await syncMusicFromSunoIfNeeded(order)
        } catch {
          return order
        }
      }),
    )

    res.json({
      email: normalizedEmail,
      orders: orders.map(mapOrderForClient),
    })
  } catch (err) {
    next(err)
  }
}

const SUNO_SYNC_MIN_MS = 8000

async function syncMusicFromSunoIfNeeded(order, { blocking = true } = {}) {
  if (!order.suno_task_id) return order

  const { needsSync } = await checkOrderNeedsSunoSync(order)
  if (!needsSync) return order

  const sinceUpdate = Date.now() - new Date(order.updated_at || order.music_generation_started_at).getTime()
  if (order.status === 'generating_music' && sinceUpdate < SUNO_SYNC_MIN_MS) return order

  try {
    const refreshed = await refreshOrderSunoStatus(order)
    return await ensureAllMusicVersions(refreshed, {
      title: refreshed.music_title || buildMusicTitle(refreshed),
      style: refreshed.music_tags || getGenreStyle(refreshed.genre),
    }, { blocking })
  } catch (err) {
    console.warn('[FLUISOM] Falha ao sincronizar Suno:', err.message)
    return order
  }
}

export async function getQuizStatus(req, res, next) {
  try {
    const order = await syncMusicFromSunoIfNeeded(await getOrderById(req.params.orderId), { blocking: true })
    const progress = orderStatusToProgress(order.status, order.suno_status)

    const versions = mapVersionsForClient(order)
    res.json({
      orderId: order.id,
      status: order.status,
      progress,
      statusLabel: orderStatusLabel(order.status),
      previewAudioUrl: versions[0]?.previewAudioUrl || order.preview_audio_url || null,
      coverImageUrl: versions[0]?.coverImageUrl || order.cover_image_url || null,
      musicTitle: order.music_title || null,
      versions,
      errorMessage: order.error_message || null,
    })
  } catch (err) {
    next(err)
  }
}

export async function getQuizPreview(req, res, next) {
  try {
    const order = await syncMusicFromSunoIfNeeded(await getOrderById(req.params.orderId))

    if (!['music_ready', 'preview_shown', 'payment_pending', 'paid', 'delivered'].includes(order.status)) {
      return res.status(202).json({
        orderId: order.id,
        status: order.status,
        message: 'Música ainda em geração',
      })
    }

    if (order.status === 'music_ready') {
      await updateOrder(order.id, { status: 'preview_shown' })
    }

    const versions = mapVersionsForClient(order)
    const price = Number(await getAdminSetting('price_brl')) || Number(order.payment_amount) || 47.9

    res.json({
      orderId: order.id,
      honoredName: order.honored_name,
      previewAudioUrl: versions[0]?.previewAudioUrl || order.preview_audio_url,
      coverImageUrl: versions[0]?.coverImageUrl || order.cover_image_url,
      musicTitle: order.music_title,
      versions,
      genre: order.genre,
      voice: order.voice,
      relationship: order.relationship,
      customRelationship: order.custom_relationship,
      fullName: order.full_name,
      email: order.email,
      lyricsPreview: getLyricsPreview(order.generated_lyrics, 4),
      duration: 30,
      paymentAmount: price,
      paymentStatus: order.payment_status || 'unpaid',
      paid: order.payment_status === 'paid',
    })
  } catch (err) {
    next(err)
  }
}

export async function updateContact(req, res, next) {
  try {
    const { fullName, email, whatsapp, discreteMode } = req.body
    const price = Number(await getAdminSetting('price_brl')) || 47.9
    const order = await updateOrder(req.params.orderId, {
      full_name: fullName,
      email,
      whatsapp,
      discrete_mode: discreteMode ?? false,
      payment_amount: price,
      status: 'payment_pending',
    })
    res.json({
      orderId: order.id,
      status: order.status,
      paymentAmount: Number(order.payment_amount || price),
    })
  } catch (err) {
    next(err)
  }
}

function mapQuizBodyToOrder(body, req) {
  const attr = body.attribution || {}
  return {
    relationship: body.relationship,
    custom_relationship: body.customRelationship || null,
    honored_name: body.honoredName,
    special_qualities: body.specialQualities,
    special_moments: body.specialMoments,
    special_message: body.specialMessage || null,
    genre: body.genre,
    voice: body.voice,
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
    traffic_src: attr.trafficSrc || body.src || null,
    utm_source: attr.utmSource || null,
    utm_medium: attr.utmMedium || null,
    utm_campaign: attr.utmCampaign || null,
    utm_term: attr.utmTerm || null,
    utm_content: attr.utmContent || null,
    landing_page: attr.landingPage || null,
  }
}
