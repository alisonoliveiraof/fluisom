import getSupabase from '../config/supabase.config.js'

export async function createOrder(data) {
  const supabase = getSupabase()
  const { data: order, error } = await supabase
    .from('quiz_orders')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(`Erro ao criar pedido: ${error.message}`)
  return order
}

export async function getOrderById(orderId) {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('quiz_orders').select('*').eq('id', orderId).single()
  if (error) throw new Error(`Pedido não encontrado: ${error.message}`)
  return data
}

export async function updateOrder(orderId, fields) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('quiz_orders')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (error) throw new Error(`Erro ao atualizar pedido: ${error.message}`)
  return data
}

export async function listOrders({ status, page = 1, limit = 20, search, dateFrom, dateTo } = {}) {
  const supabase = getSupabase()
  let query = supabase.from('quiz_orders').select('*', { count: 'exact' })

  if (status && status !== 'undefined') query = query.eq('status', status)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo)
  if (search && search !== 'undefined') {
    const term = search.replace(/[%_,]/g, '')
    query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%,honored_name.ilike.%${term}%`)
  }

  const from = (page - 1) * limit
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) throw new Error(`Erro ao listar pedidos: ${error.message}`)
  return { orders: data, total: count, page, totalPages: Math.ceil((count || 0) / limit) }
}

export async function exportOrders(filters = {}) {
  const { orders } = await listOrders({ ...filters, page: 1, limit: 10000 })
  return orders
}

export async function insertGenerationLog(log) {
  const supabase = getSupabase()
  const { error } = await supabase.from('generation_logs').insert(log)
  if (error) console.error('[FLUISOM] Erro ao inserir log:', error.message)
}

export async function getGenerationLogs({ orderId, limit = 50 } = {}) {
  const supabase = getSupabase()
  let query = supabase.from('generation_logs').select('*').order('created_at', { ascending: false }).limit(limit)
  if (orderId) query = query.eq('order_id', orderId)
  const { data, error } = await query
  if (error) throw new Error(`Erro ao buscar logs: ${error.message}`)
  return data
}

export async function getDashboardStats() {
  const supabase = getSupabase()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: orders, error } = await supabase.from('quiz_orders').select('*')
  if (error) throw new Error(`Erro ao buscar stats: ${error.message}`)

  const todayOrders = orders.filter((o) => new Date(o.created_at) >= today)
  const pendingGeneration = orders.filter((o) =>
    ['pending', 'generating_lyrics', 'lyrics_ready', 'generating_music'].includes(o.status),
  ).length
  const musicReady = orders.filter((o) => o.status === 'music_ready').length
  const paid = orders.filter((o) => o.status === 'paid' || o.status === 'delivered').length
  const failed = orders.filter((o) => o.status === 'failed').length
  const totalRevenue = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.payment_amount || 0), 0)

  const completed = orders.filter((o) => o.music_generation_completed_at && o.music_generation_started_at)
  const avgGenerationTimeMs =
    completed.length > 0
      ? completed.reduce((sum, o) => {
          const ms = new Date(o.music_generation_completed_at) - new Date(o.music_generation_started_at)
          return sum + ms
        }, 0) / completed.length
      : 0

  return {
    totalOrders: orders.length,
    todayOrders: todayOrders.length,
    pendingGeneration,
    musicReady,
    paid,
    failed,
    totalRevenue,
    avgGenerationTimeMs: Math.round(avgGenerationTimeMs),
  }
}

export async function getOrdersLast7Days() {
  const supabase = getSupabase()
  const days = []
  const now = new Date()

  for (let i = 6; i >= 0; i--) {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - i)

    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    days.push({
      date: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }),
      start: start.toISOString(),
      end: end.toISOString(),
    })
  }

  const { data, error } = await supabase
    .from('quiz_orders')
    .select('created_at')
    .gte('created_at', days[0].start)

  if (error) throw new Error(`Erro ao buscar gráfico: ${error.message}`)

  return days.map((day) => ({
    date: day.date,
    label: day.label,
    count: (data || []).filter((order) => {
      const created = new Date(order.created_at)
      return created >= new Date(day.start) && created < new Date(day.end)
    }).length,
  }))
}

export async function getRealtimeStats() {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('quiz_orders').select('status')
  if (error) throw new Error(error.message)

  const counts = {}
  for (const row of data) {
    counts[row.status] = (counts[row.status] || 0) + 1
  }
  return counts
}

export async function getAdminSetting(key) {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('admin_settings').select('value').eq('key', key).single()
  if (error) return null
  return data.value
}

export async function setAdminSetting(key, value) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

export async function getOrdersNeedingMusicSubmit(limit = 5) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('quiz_orders')
    .select('*')
    .eq('status', 'lyrics_ready')
    .is('suno_task_id', null)
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Erro ao buscar pedidos para música: ${error.message}`)
  return data || []
}

export async function getOldestPendingOrder() {
  const supabase = getSupabase()
  const staleBefore = new Date(Date.now() - 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('quiz_orders')
    .select('*')
    .eq('status', 'pending')
    .lt('created_at', staleBefore)
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw new Error(`Erro ao buscar pedido pendente: ${error.message}`)
  return data?.[0] || null
}

export async function listOrdersByEmail(email) {
  const supabase = getSupabase()
  const normalized = email.trim().toLowerCase()
  const { data, error } = await supabase
    .from('quiz_orders')
    .select(
      'id, created_at, honored_name, status, music_title, music_versions, suno_raw_response, preview_audio_url, full_audio_url, cover_image_url, payment_status, payment_amount, email, full_name, suno_clip_id, music_duration_seconds',
    )
    .ilike('email', normalized)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(`Erro ao buscar pedidos: ${error.message}`)
  return data || []
}

export async function getStaleMusicOrders(limit = 10) {
  const supabase = getSupabase()
  const staleBefore = new Date(Date.now() - 2 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('quiz_orders')
    .select('*')
    .eq('status', 'generating_music')
    .not('suno_task_id', 'is', null)
    .lt('updated_at', staleBefore)
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Erro ao buscar pedidos pendentes: ${error.message}`)
  return data || []
}

export async function countTodayGenerations() {
  const supabase = getSupabase()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count, error } = await supabase
    .from('quiz_orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  if (error) throw new Error(error.message)
  return count || 0
}
