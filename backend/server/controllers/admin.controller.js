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
  getAttributionStats,
  listRecentPaidSales,
  getStaleMusicOrders,
} from '../services/supabase.service.js'
import { generateLyricsForOrder } from './lyrics.controller.js'
import {
  generateMusicForOrder,
  retryMusicGeneration,
  ensureAllMusicVersions,
  tryFinalizeFromSunoTask,
} from './music.controller.js'
import { buildMusicTitle, getGenreStyle } from '../utils/prompt.builder.js'
import { formatDatePt } from '../utils/date.formatter.js'

async function selfHealStaleMusic(limit = 5) {
  try {
    const stale = await getStaleMusicOrders(limit)
    await Promise.all(
      stale.map(async (order) => {
        if (!order.suno_task_id) return
        try {
          await tryFinalizeFromSunoTask(order.id, order.suno_task_id, {
            title: order.music_title || buildMusicTitle(order),
            style: order.music_tags || getGenreStyle(order.genre),
          })
        } catch (err) {
          console.warn('[FLUISOM] Self-heal admin falhou:', order.id, err.message)
        }
      }),
    )
  } catch (err) {
    console.warn('[FLUISOM] Self-heal admin (lista) falhou:', err.message)
  }
}

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
    await selfHealStaleMusic(5)
    const [stats, ordersChart, { orders }, attributionStats] = await Promise.all([
      getDashboardStats(),
      getOrdersLast7Days(),
      listOrders({ page: 1, limit: 10 }),
      getAttributionStats(),
    ])
    res.json({ stats, ordersChart, recentOrders: orders, attributionStats })
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
    let order = await getOrderById(req.params.orderId)

    if (order.suno_task_id && ['generating_music', 'music_ready', 'preview_shown', 'payment_pending'].includes(order.status)) {
      try {
        const synced = await ensureAllMusicVersions(order, {
          title: order.music_title || buildMusicTitle(order),
          style: order.music_tags || getGenreStyle(order.genre),
        })
        if (synced) order = synced
      } catch (err) {
        console.warn('[FLUISOM] Sync no detalhe do pedido falhou:', err.message)
      }
    }

    const logs = await getGenerationLogs({ orderId: req.params.orderId, limit: 100 })
    res.json({ order, logs })
  } catch (err) {
    next(err)
  }
}

export async function retryOrder(req, res, next) {
  try {
    const order = await getOrderById(req.params.orderId)

    if (order.suno_task_id && ['generating_music', 'music_ready', 'preview_shown', 'payment_pending'].includes(order.status)) {
      const synced = await ensureAllMusicVersions(order, {
        title: order.music_title || buildMusicTitle(order),
        style: order.music_tags || getGenreStyle(order.genre),
      })
      if (order.status === 'generating_music' && synced.status === 'generating_music') {
        return res.status(409).json({
          error: true,
          message: 'Música ainda em processamento na Suno. Tente novamente em instantes.',
          code: 'MUSIC_STILL_GENERATING',
        })
      }
    } else if (order.status === 'failed' && order.generated_lyrics) {
      await updateOrder(order.id, { status: 'lyrics_ready', error_message: null })
      await retryMusicGeneration(order.id)
    } else if (!order.generated_lyrics) {
      await updateOrder(order.id, { status: 'pending', error_message: null, retry_count: (order.retry_count || 0) + 1 })
      await generateLyricsForOrder(order.id)
      await generateMusicForOrder(order.id)
    } else {
      await generateMusicForOrder(order.id)
    }

    res.json({ message: 'Retentativa concluída', orderId: order.id })
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

export async function recentSales(req, res, next) {
  try {
    const since = req.query.since || null
    const sales = await listRecentPaidSales({ since, limit: Number(req.query.limit) || 20 })
    res.json({ sales })
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
      'id', 'created_at', 'honored_name', 'full_name', 'email', 'genre', 'voice', 'status',
      'payment_status', 'payment_amount', 'paid_at', 'traffic_src', 'utm_source', 'utm_medium',
      'utm_campaign', 'utm_term', 'utm_content', 'landing_page',
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
