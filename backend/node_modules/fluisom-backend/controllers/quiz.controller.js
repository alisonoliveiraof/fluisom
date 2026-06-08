import { v4 as uuidv4 } from 'uuid'
import { generateLyricsForOrder } from './lyrics.controller.js'
import { generateMusicForOrder, retryMusicGeneration } from './music.controller.js'
import {
  createOrder,
  getOrderById,
  updateOrder,
  getAdminSetting,
  countTodayGenerations,
} from '../services/supabase.service.js'
import { getLyricsPreview } from '../utils/prompt.builder.js'
import { orderStatusToProgress, orderStatusLabel } from '../utils/status.mapper.js'
import { runInBackground } from '../utils/background.js'

const activeGenerations = new Set()

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

    runInBackground(() => runGenerationPipeline(order.id))
  } catch (err) {
    next(err)
  }
}

export async function getQuizStatus(req, res, next) {
  try {
    const order = await getOrderById(req.params.orderId)
    const progress = orderStatusToProgress(order.status, order.suno_status)

    res.json({
      orderId: order.id,
      status: order.status,
      progress,
      statusLabel: orderStatusLabel(order.status),
      previewAudioUrl: order.preview_audio_url || null,
      coverImageUrl: order.cover_image_url || null,
      musicTitle: order.music_title || null,
      errorMessage: order.error_message || null,
    })
  } catch (err) {
    next(err)
  }
}

export async function getQuizPreview(req, res, next) {
  try {
    const order = await getOrderById(req.params.orderId)

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

    res.json({
      orderId: order.id,
      honoredName: order.honored_name,
      previewAudioUrl: order.preview_audio_url,
      coverImageUrl: order.cover_image_url,
      musicTitle: order.music_title,
      genre: order.genre,
      voice: order.voice,
      lyricsPreview: getLyricsPreview(order.generated_lyrics, 4),
      duration: 30,
    })
  } catch (err) {
    next(err)
  }
}

export async function updateContact(req, res, next) {
  try {
    const { fullName, email, whatsapp, discreteMode } = req.body
    const order = await updateOrder(req.params.orderId, {
      full_name: fullName,
      email,
      whatsapp,
      discrete_mode: discreteMode ?? false,
      status: 'payment_pending',
    })
    res.json({ orderId: order.id, status: order.status })
  } catch (err) {
    next(err)
  }
}

async function runGenerationPipeline(orderId) {
  if (activeGenerations.has(orderId)) return
  activeGenerations.add(orderId)

  try {
    await generateLyricsForOrder(orderId)
    await generateMusicForOrder(orderId)
  } finally {
    activeGenerations.delete(orderId)
  }
}

function mapQuizBodyToOrder(body, req) {
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
  }
}

export { runGenerationPipeline, retryMusicGeneration }
