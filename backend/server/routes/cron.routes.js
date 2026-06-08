import { Router } from 'express'
import {
  getStaleMusicOrders,
  getOrdersNeedingMusicSubmit,
  getOldestPendingOrder,
} from '../services/supabase.service.js'
import { tryFinalizeFromSunoTask, generateMusicForOrder } from '../controllers/music.controller.js'
import { generateLyricsForOrder } from '../controllers/lyrics.controller.js'
import { buildMusicTitle, getGenreStyle } from '../utils/prompt.builder.js'

const router = Router()

function isAuthorizedCron(req) {
  if (req.headers['x-vercel-cron'] === '1') return true
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  return req.headers.authorization === `Bearer ${secret}`
}

router.get('/process-queue', async (req, res) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: true, message: 'Não autorizado' })
  }

  const result = { musicSubmitted: 0, finalized: 0 }

  try {
    const needsMusic = await getOrdersNeedingMusicSubmit(5)
    for (const order of needsMusic) {
      await generateMusicForOrder(order.id)
      result.musicSubmitted += 1
    }

    const stale = await getStaleMusicOrders(5)
    for (const order of stale) {
      if (!order.suno_task_id) continue
      const finalized = await tryFinalizeFromSunoTask(order.id, order.suno_task_id, {
        title: order.music_title || buildMusicTitle(order),
        style: order.music_tags || getGenreStyle(order.genre),
      })
      if (finalized) result.finalized += 1
    }

    res.json({ ok: true, ...result })
  } catch (err) {
    console.error('[FLUISOM] Cron process-queue:', err.message)
    res.status(500).json({ error: true, message: err.message, ...result })
  }
})

router.get('/process-pending', async (req, res) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: true, message: 'Não autorizado' })
  }

  try {
    const pending = await getOldestPendingOrder()
    if (!pending) {
      return res.json({ ok: true, processed: false })
    }

    await generateLyricsForOrder(pending.id)
    await generateMusicForOrder(pending.id)
    res.json({ ok: true, processed: true, orderId: pending.id })
  } catch (err) {
    console.error('[FLUISOM] Cron process-pending:', err.message)
    res.status(500).json({ error: true, message: err.message })
  }
})

router.get('/poll-stale', async (req, res) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: true, message: 'Não autorizado' })
  }

  try {
    const orders = await getStaleMusicOrders(10)
    let finalized = 0

    for (const order of orders) {
      if (!order.suno_task_id) continue
      const result = await tryFinalizeFromSunoTask(order.id, order.suno_task_id, {
        title: order.music_title || buildMusicTitle(order),
        style: order.music_tags || getGenreStyle(order.genre),
      })
      if (result) finalized += 1
    }

    res.json({ ok: true, checked: orders.length, finalized })
  } catch (err) {
    console.error('[FLUISOM] Cron poll-stale:', err.message)
    res.status(500).json({ error: true, message: err.message })
  }
})

export default router
