import { Router } from 'express'
import getSupabase from '../config/supabase.config.js'
import { getOrderById, updateOrder, insertGenerationLog } from '../services/supabase.service.js'
import { finalizeMusicFromWebhookClips } from '../controllers/music.controller.js'
import { handleMercadoPagoWebhook } from '../controllers/payment.controller.js'
import { buildMusicTitle, getGenreStyle } from '../utils/prompt.builder.js'

const router = Router()

router.post('/suno', async (req, res) => {
  try {
    const { code, msg, data } = req.body
    console.log('[FLUISOM] Webhook Suno recebido:', code, msg)

    const taskId = data?.task_id || data?.taskId
    if (!taskId) {
      return res.status(200).json({ status: 'received' })
    }

    const supabase = getSupabase()
    const { data: orders } = await supabase.from('quiz_orders').select('id').eq('suno_task_id', taskId).limit(1)
    const orderId = orders?.[0]?.id

    if (!orderId) {
      return res.status(200).json({ status: 'received' })
    }

    await insertGenerationLog({
      order_id: orderId,
      step: 'webhook',
      status: code === 200 ? 'success' : 'error',
      message: msg,
      payload: req.body,
    })

    const clips = Array.isArray(data?.data) ? data.data : []
    const callbackType = data?.callbackType

    if (clips.length && ['complete', 'first'].includes(callbackType)) {
      const order = await getOrderById(orderId)
      if (!['music_ready', 'preview_shown', 'payment_pending', 'paid', 'delivered'].includes(order.status)) {
        await finalizeMusicFromWebhookClips(orderId, clips, {
          title: order.music_title || buildMusicTitle(order),
          style: order.music_tags || getGenreStyle(order.genre),
        })
      }
    } else if (data?.status) {
      await updateOrder(orderId, {
        suno_status: data.status,
        suno_raw_response: req.body,
      })
    }

    res.status(200).json({ status: 'received' })
  } catch (err) {
    console.error('[FLUISOM] Webhook error:', err.message)
    res.status(200).json({ status: 'received' })
  }
})

router.post('/mercadopago', handleMercadoPagoWebhook)

export default router
