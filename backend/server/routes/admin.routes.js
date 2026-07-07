import { Router } from 'express'
import rateLimit from 'express-rate-limit'
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
  recentSales,
} from '../controllers/admin.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: true, message: 'Muitas tentativas de login. Aguarde 15 minutos.', code: 'RATE_LIMIT' },
})

router.post('/login', loginLimiter, login)

router.use(authMiddleware)

router.get('/dashboard', dashboard)
router.get('/sales/recent', recentSales)
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
