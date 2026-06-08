import { Router } from 'express'
import {
  login,
  dashboard,
  orders,
  orderDetail,
  retryOrder,
  updateStatus,
  generationLogs,
  realtimeStats,
  exportOrdersCsv,
  getSettings,
  updateSettings,
} from '../controllers/admin.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = Router()

router.post('/login', login)

router.use(authMiddleware)

router.get('/dashboard', dashboard)
router.get('/orders', orders)
router.get('/orders/export', exportOrdersCsv)
router.get('/orders/:orderId', orderDetail)
router.post('/orders/:orderId/retry', retryOrder)
router.post('/orders/:orderId/status', updateStatus)
router.get('/generation-logs', generationLogs)
router.get('/stats/realtime', realtimeStats)
router.get('/settings', getSettings)
router.post('/settings', updateSettings)

export default router
