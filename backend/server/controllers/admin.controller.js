import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import {
  getDashboardStats,
  getOrdersLast7Days,
  listOrders,
  getOrderById,
  updateOrder,
  getGenerationLogs,
  getRealtimeStats,
  exportOrders,
  getAdminSetting,
  setAdminSetting,
} from '../services/supabase.service.js'
import { retryMusicGeneration } from './music.controller.js'
import { runGenerationPipeline } from './quiz.controller.js'
import { formatDatePt } from '../utils/date.formatter.js'

export function login(req, res) {
  const { secretKey } = req.body
  if (secretKey !== env.adminSecretKey) {
    return res.status(401).json({ error: true, message: 'Chave de acesso inválida', code: 'INVALID_KEY' })
  }

  const token = jwt.sign({ role: 'admin' }, env.adminJwtSecret, { expiresIn: '24h' })
  res.json({ token })
}

export async function dashboard(req, res, next) {
  try {
    const [stats, ordersChart, { orders }] = await Promise.all([
      getDashboardStats(),
      getOrdersLast7Days(),
      listOrders({ page: 1, limit: 10 }),
    ])
    res.json({ stats, ordersChart, recentOrders: orders })
  } catch (err) {
    next(err)
  }
}

export async function orders(req, res, next) {
  try {
    const result = await listOrders({
      status: req.query.status,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: req.query.search,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function orderDetail(req, res, next) {
  try {
    const order = await getOrderById(req.params.orderId)
    const logs = await getGenerationLogs({ orderId: req.params.orderId, limit: 100 })
    res.json({ order, logs })
  } catch (err) {
    next(err)
  }
}

export async function retryOrder(req, res, next) {
  try {
    const order = await getOrderById(req.params.orderId)

    if (order.status === 'failed' && order.generated_lyrics) {
      await updateOrder(order.id, { status: 'lyrics_ready', error_message: null })
      retryMusicGeneration(order.id).catch((err) => console.error('[FLUISOM] Retry music:', err.message))
    } else if (order.status === 'failed' || !order.generated_lyrics) {
      await updateOrder(order.id, { status: 'pending', error_message: null, retry_count: (order.retry_count || 0) + 1 })
      runGenerationPipeline(order.id).catch((err) => console.error('[FLUISOM] Retry pipeline:', err.message))
    } else {
      runGenerationPipeline(order.id).catch((err) => console.error('[FLUISOM] Retry pipeline:', err.message))
    }

    res.json({ message: 'Retentativa iniciada', orderId: order.id })
  } catch (err) {
    next(err)
  }
}

export async function updateStatus(req, res, next) {
  try {
    const { status } = req.body
    const order = await updateOrder(req.params.orderId, { status })
    res.json({ order })
  } catch (err) {
    next(err)
  }
}

export async function generationLogs(req, res, next) {
  try {
    const logs = await getGenerationLogs({
      orderId: req.query.orderId,
      limit: Number(req.query.limit) || 50,
    })
    res.json({ logs })
  } catch (err) {
    next(err)
  }
}

export async function realtimeStats(req, res, next) {
  try {
    const counts = await getRealtimeStats()
    res.json({ counts })
  } catch (err) {
    next(err)
  }
}

export async function exportOrdersCsv(req, res, next) {
  try {
    const orders = await exportOrders({
      status: req.query.status,
      search: req.query.search,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
    })

    const headers = [
      'id', 'created_at', 'honored_name', 'full_name', 'email', 'genre', 'voice', 'status', 'payment_status', 'payment_amount',
    ]
    const rows = orders.map((o) =>
      headers.map((h) => `"${String(o[h] ?? '').replace(/"/g, '""')}"`).join(','),
    )

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=fluisom-pedidos.csv')
    res.send([headers.join(','), ...rows].join('\n'))
  } catch (err) {
    next(err)
  }
}

export async function getSettings(req, res, next) {
  try {
    const generationEnabled = await getAdminSetting('generation_enabled')
    const maxDaily = await getAdminSetting('max_daily_generations')
    const price = await getAdminSetting('price_brl')

    res.json({
      generationEnabled: generationEnabled !== false && generationEnabled !== 'false',
      maxDailyGenerations: Number(maxDaily) || 100,
      priceBrl: Number(price) || 47.9,
      envKeys: [
        'PORT', 'NODE_ENV', 'FRONTEND_URL', 'OPENAI_MODEL', 'SUNO_BASE_URL',
        'SUPABASE_URL', 'SUPABASE_STORAGE_BUCKET', 'MAX_GENERATION_RETRIES',
      ],
    })
  } catch (err) {
    next(err)
  }
}

export async function updateSettings(req, res, next) {
  try {
    const { generationEnabled, maxDailyGenerations, priceBrl } = req.body
    if (generationEnabled !== undefined) await setAdminSetting('generation_enabled', generationEnabled)
    if (maxDailyGenerations !== undefined) await setAdminSetting('max_daily_generations', maxDailyGenerations)
    if (priceBrl !== undefined) await setAdminSetting('price_brl', priceBrl)
    res.json({ message: 'Configurações atualizadas' })
  } catch (err) {
    next(err)
  }
}

export { formatDatePt }
