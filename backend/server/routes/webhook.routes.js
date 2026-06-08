import { Router } from 'express'
import getSupabase from '../config/supabase.config.js'
import { updateOrder, insertGenerationLog } from '../services/supabase.service.js'

const router = Router()

router.post('/suno', async (req, res) => {
  try {
    const { code, msg, data } = req.body
    console.log('[FLUISOM] Webhook Suno recebido:', code, msg)

    const taskId = data?.task_id || data?.taskId
    if (taskId) {
      const supabase = getSupabase()
      const { data: orders } = await supabase.from('quiz_orders').select('id').eq('suno_task_id', taskId).limit(1)

      if (orders?.[0]) {
        await insertGenerationLog({
          order_id: orders[0].id,
          step: 'webhook',
          status: code === 200 ? 'success' : 'error',
          message: msg,
          payload: req.body,
        })

        if (data?.callbackType === 'complete' && Array.isArray(data?.data)) {
          const clip = data.data[0]
          await updateOrder(orders[0].id, {
            suno_raw_response: req.body,
            suno_status: 'SUCCESS',
            suno_clip_id: clip?.id,
          })
        }
      }
    }

    res.status(200).json({ status: 'received' })
  } catch (err) {
    console.error('[FLUISOM] Webhook error:', err.message)
    res.status(200).json({ status: 'received' })
  }
})

export default router
