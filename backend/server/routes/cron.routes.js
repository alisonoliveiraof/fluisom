import { Router } from 'express'
import { getStaleMusicOrders } from '../services/supabase.service.js'
import { tryFinalizeFromSunoTask } from '../controllers/music.controller.js'
import { buildMusicTitle, getGenreStyle } from '../utils/prompt.builder.js'

const router = Router()

function isAuthorizedCron(req) {
  if (req.headers['x-vercel-cron'] === '1') return true
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  return req.headers.authorization === `Bearer ${secret}`
}

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
