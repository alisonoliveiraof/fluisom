<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  adminLogin,
  getAdminDashboard,
  getAdminRecentSales,
  getAdminOrders,
  getAdminOrderDetail,
  retryAdminOrder,
  updateAdminOrderStatus,
  getAdminSettings,
  updateAdminSettings,
  exportAdminOrders,
} from '../services/api.service'
import { LOGO_URL } from '../constants'
import { downloadMusicFile, normalizeOrderVersions } from '../utils/musicDownload'
import { formatAttributionLabel } from '../utils/attribution'

const ADMIN_LOGO_URL = LOGO_URL

const TOKEN_KEY = 'fluisom_admin_token'
const SALES_SEEN_KEY = 'fluisom_admin_sales_seen_at'

const isAuthenticated = ref(!!localStorage.getItem(TOKEN_KEY))
const secretKey = ref('')
const loginError = ref('')
const loginLoading = ref(false)

const section = ref('dashboard')
const mobileNavOpen = ref(false)

const stats = ref(null)
const recentOrders = ref([])
const orders = ref([])
const ordersTotal = ref(0)
const ordersPage = ref(1)
const ordersTotalPages = ref(1)
const filterStatus = ref('')
const filterSearch = ref('')
const loading = ref(false)
const ordersError = ref('')
const coverDownloading = ref(false)
const musicDownloadingKey = ref(null)

const selectedOrder = ref(null)
const selectedLogs = ref([])
const detailOpen = ref(false)

const settings = ref({ generationEnabled: true, maxDailyGenerations: 100, priceBrl: 47.9, envKeys: [] })
const chartData = ref([])
const attributionStats = ref([])
const salesNotifications = ref([])
const salesNotificationsOpen = ref(true)

let refreshTimer = null
let knownSaleIds = new Set()

const statusLabels = {
  pending: 'Pendente',
  generating_lyrics: 'Gerando letra',
  lyrics_ready: 'Letra pronta',
  generating_music: 'Gerando música',
  music_ready: 'Música pronta',
  preview_shown: 'Prévia exibida',
  payment_pending: 'Aguardando pagamento',
  paid: 'Pago',
  delivered: 'Entregue',
  failed: 'Falhou',
  refunded: 'Reembolsado',
}

async function handleLogin() {
  loginLoading.value = true
  loginError.value = ''
  try {
    const { token } = await adminLogin(secretKey.value)
    localStorage.setItem(TOKEN_KEY, token)
    isAuthenticated.value = true
    await requestSalesNotificationPermission()
    await loadDashboard()
    startAutoRefresh()
  } catch (err) {
    loginError.value = err.message || 'Falha no login'
  } finally {
    loginLoading.value = false
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY)
  isAuthenticated.value = false
  stopAutoRefresh()
}

async function loadDashboard() {
  loading.value = true
  try {
    const data = await getAdminDashboard()
    stats.value = data.stats
    chartData.value = data.ordersChart || []
    recentOrders.value = data.recentOrders || []
    attributionStats.value = data.attributionStats || []
    await checkSalesNotifications()
  } catch (err) {
    if (err.status === 401) logout()
  } finally {
    loading.value = false
  }
}

function getSalesSeenAt() {
  return localStorage.getItem(SALES_SEEN_KEY)
}

function markSalesSeen() {
  localStorage.setItem(SALES_SEEN_KEY, new Date().toISOString())
  salesNotifications.value = []
  salesNotificationsOpen.value = false
}

async function requestSalesNotificationPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'default') return
  if (!window.matchMedia('(max-width: 768px)').matches) return
  try {
    await Notification.requestPermission()
  } catch {
    // permissão negada ou indisponível
  }
}

function notifySaleNative(sale) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const amount = formatMoney(sale.payment_amount)
  const name = sale.honored_name || sale.full_name || 'Cliente'
  const origin = formatAttributionLabel(sale)
  try {
    new Notification('Nova venda Fluisom!', {
      body: `${amount} — ${name} (${origin})`,
      tag: `sale-${sale.id}`,
    })
  } catch {
    // notificações nativas indisponíveis
  }
}

async function checkSalesNotifications() {
  const since = getSalesSeenAt()
  const data = await getAdminRecentSales(since)
  const sales = data.sales || []
  const fresh = sales.filter((sale) => !knownSaleIds.has(sale.id))

  if (!since && sales.length) {
    knownSaleIds = new Set(sales.map((sale) => sale.id))
    return
  }

  if (!fresh.length) return

  fresh.forEach((sale) => {
    knownSaleIds.add(sale.id)
    notifySaleNative(sale)
  })

  salesNotifications.value = fresh
  salesNotificationsOpen.value = true
}

function dismissSalesNotifications() {
  markSalesSeen()
}

function formatAttribution(order) {
  return formatAttributionLabel(order)
}

async function loadOrders(page = 1) {
  loading.value = true
  ordersError.value = ''
  try {
    const data = await getAdminOrders({
      page,
      limit: 20,
      status: filterStatus.value || undefined,
      search: filterSearch.value.trim() || undefined,
    })
    orders.value = data.orders || []
    ordersTotal.value = data.total ?? 0
    ordersPage.value = data.page || 1
    ordersTotalPages.value = data.totalPages || 1
  } catch (err) {
    ordersError.value = err.message || 'Erro ao carregar pedidos'
    if (err.status === 401) logout()
  } finally {
    loading.value = false
  }
}

function orderVersions(order) {
  return normalizeOrderVersions(order).filter((v) => v.audioUrl)
}

async function downloadMusic(order, version) {
  const url = version?.audioUrl
  if (!url) return

  const honoredName = order?.honored_name || order?.honoredName
  const key = `${order.id}-v${version.version}`
  musicDownloadingKey.value = key
  try {
    await downloadMusicFile({ url, honoredName, version: version.version })
  } finally {
    musicDownloadingKey.value = null
  }
}

async function downloadCover(order) {
  const url = order?.cover_image_url
  if (!url) return
  coverDownloading.value = true
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Não foi possível baixar a capa')
    const blob = await res.blob()
    const ext = url.includes('.png') ? 'png' : 'jpg'
    const name = (order.honored_name || 'capa').replace(/\s+/g, '-').toLowerCase()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `fluisom-capa-${name}-${order.id.slice(0, 8)}.${ext}`
    link.click()
    URL.revokeObjectURL(link.href)
  } catch (err) {
    window.open(url, '_blank')
  } finally {
    coverDownloading.value = false
  }
}

async function openOrderDetail(orderId) {
  try {
    const data = await getAdminOrderDetail(orderId)
    selectedOrder.value = data.order
    selectedLogs.value = data.logs || []
    detailOpen.value = true
  } catch (err) {
    console.error('[FLUISOM]', err.message)
  }
}

async function handleRetry(orderId) {
  await retryAdminOrder(orderId)
  await loadDashboard()
  if (section.value === 'orders') await loadOrders(ordersPage.value)
}

async function handleStatusChange(orderId, status) {
  await updateAdminOrderStatus(orderId, status)
  await openOrderDetail(orderId)
  await loadDashboard()
}

async function loadSettings() {
  settings.value = await getAdminSettings()
}

async function saveSettings() {
  await updateAdminSettings({
    generationEnabled: settings.value.generationEnabled,
    maxDailyGenerations: settings.value.maxDailyGenerations,
    priceBrl: settings.value.priceBrl,
  })
}

async function handleExport() {
  const res = await exportAdminOrders({
    status: filterStatus.value || undefined,
    search: filterSearch.value || undefined,
  })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fluisom-pedidos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function formatDate(d) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d))
}

function formatMoney(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function statusClass(status) {
  return `badge badge-${status}`
}

function navigateTo(s) {
  section.value = s
  mobileNavOpen.value = false
  if (s === 'dashboard') loadDashboard()
  if (s === 'orders') loadOrders(1)
  if (s === 'settings') loadSettings()
}

function startAutoRefresh() {
  stopAutoRefresh()
  refreshTimer = setInterval(() => {
    if (section.value === 'dashboard') loadDashboard()
    if (section.value === 'orders') loadOrders(ordersPage.value)
    checkSalesNotifications().catch(() => {})
  }, 30000)
}

function stopAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer)
}

const maxChart = computed(() => Math.max(...chartData.value.map((d) => d.count), 1))

onMounted(() => {
  if (isAuthenticated.value) {
    loadDashboard()
    startAutoRefresh()
    requestSalesNotificationPermission()
  }
})

onUnmounted(stopAutoRefresh)
</script>

<template>
  <div class="admin-app">
    <div v-if="!isAuthenticated" class="login-screen">
      <div class="login-card">
        <img :src="ADMIN_LOGO_URL" alt="Fluisom" class="admin-logo admin-logo-login" width="240" height="62" />
        <h1>Painel Fluisom</h1>
        <p>Digite a chave de acesso para continuar</p>
        <input v-model="secretKey" type="password" placeholder="Chave de Acesso" class="login-input" @keyup.enter="handleLogin" />
        <p v-if="loginError" class="login-error">{{ loginError }}</p>
        <button class="btn-primary" :disabled="loginLoading" @click="handleLogin">
          {{ loginLoading ? 'Entrando...' : 'Entrar' }}
        </button>
      </div>
    </div>

    <div v-else class="admin-layout">
      <aside class="sidebar" :class="{ open: mobileNavOpen }">
        <img :src="ADMIN_LOGO_URL" alt="Fluisom" class="admin-logo admin-logo-sidebar" width="240" height="62" />
        <nav>
          <button :class="{ active: section === 'dashboard' }" @click="navigateTo('dashboard')">Dashboard</button>
          <button :class="{ active: section === 'orders' }" @click="navigateTo('orders')">Pedidos</button>
          <button :class="{ active: section === 'settings' }" @click="navigateTo('settings')">Configurações</button>
        </nav>
        <button class="btn-logout" @click="logout">Sair</button>
      </aside>

      <main class="main">
        <header class="topbar">
          <button class="menu-btn" @click="mobileNavOpen = !mobileNavOpen">☰</button>
          <h2>Painel Fluisom</h2>
          <span class="date">{{ new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) }}</span>
        </header>

        <div v-if="salesNotificationsOpen && salesNotifications.length" class="sales-notifications">
          <div class="sales-notifications-head">
            <strong>🎉 {{ salesNotifications.length }} nova(s) venda(s)</strong>
            <button type="button" class="sales-dismiss" @click="dismissSalesNotifications">Marcar como vistas</button>
          </div>
          <div class="sales-notifications-list">
            <article v-for="sale in salesNotifications" :key="sale.id" class="sales-notification-card">
              <div>
                <p class="sales-notification-title">{{ formatMoney(sale.payment_amount) }} — {{ sale.honored_name || sale.full_name || 'Cliente' }}</p>
                <p class="sales-notification-meta">{{ formatAttribution(sale) }} · {{ formatDate(sale.paid_at || sale.created_at) }}</p>
              </div>
              <button type="button" @click="openOrderDetail(sale.id)">Ver</button>
            </article>
          </div>
        </div>

        <section v-if="section === 'dashboard'" class="section">
          <div class="metrics">
            <div class="metric metric-cyan">
              <span class="metric-icon">🎵</span>
              <span class="metric-value">{{ stats?.totalOrders ?? '—' }}</span>
              <span class="metric-label">Total de Músicas</span>
            </div>
            <div class="metric metric-amber" :class="{ pulse: (stats?.pendingGeneration || 0) > 0 }">
              <span class="metric-icon">⏳</span>
              <span class="metric-value">{{ stats?.pendingGeneration ?? '—' }}</span>
              <span class="metric-label">Em Geração</span>
            </div>
            <div class="metric metric-green">
              <span class="metric-icon">✅</span>
              <span class="metric-value">{{ stats?.todayOrders ?? '—' }}</span>
              <span class="metric-label">Pedidos Hoje</span>
            </div>
            <div class="metric metric-coral">
              <span class="metric-icon">💰</span>
              <span class="metric-value">{{ formatMoney(stats?.totalRevenue) }}</span>
              <span class="metric-label">Receita Total</span>
            </div>
          </div>

          <div class="chart-card">
            <h3>Pedidos — últimos 7 dias</h3>
            <div class="chart-bars">
              <div v-for="day in chartData" :key="day.date" class="chart-bar-wrap">
                <span class="chart-value">{{ day.count }}</span>
                <div
                  class="chart-bar"
                  :style="{ height: day.count ? (day.count / maxChart) * 100 + '%' : '4px' }"
                  :title="`${day.count} pedido(s) em ${day.label}`"
                />
                <span class="chart-label">{{ day.label }}</span>
              </div>
            </div>
          </div>

          <div class="table-card">
            <h3>Vendas por origem (src / UTM)</h3>
            <p class="orders-hint">Rastreie de onde vieram os pedidos pagos. Use links como <code>/pv?utm_source=instagram&utm_campaign=lancamento</code> ou <code>/pv?src=bio</code>.</p>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Origem</th>
                    <th>Leads</th>
                    <th>Vendas</th>
                    <th>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!attributionStats.length">
                    <td colspan="4" class="empty-row">Nenhuma venda com origem rastreada ainda.</td>
                  </tr>
                  <tr v-for="row in attributionStats" :key="row.label">
                    <td><strong>{{ row.label }}</strong></td>
                    <td>{{ row.leads || 0 }}</td>
                    <td>{{ row.sales }}</td>
                    <td>{{ formatMoney(row.revenue) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="table-card">
            <h3>Pedidos recentes</h3>
            <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Homenageado</th>
                  <th>Gênero</th>
                  <th>Origem</th>
                  <th>Status</th>
                  <th>Criado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in recentOrders" :key="o.id">
                  <td class="mono">{{ o.id.slice(0, 8) }}…</td>
                  <td>{{ o.full_name || '—' }}</td>
                  <td>{{ o.honored_name }}</td>
                  <td>{{ o.genre }}</td>
                  <td class="origin-cell">{{ formatAttribution(o) }}</td>
                  <td><span :class="statusClass(o.status)">{{ statusLabels[o.status] || o.status }}</span></td>
                  <td>{{ formatDate(o.created_at) }}</td>
                  <td class="actions">
                    <button @click="openOrderDetail(o.id)">Ver</button>
                    <button v-if="o.status === 'failed'" @click="handleRetry(o.id)">Retry</button>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </section>

        <section v-if="section === 'orders'" class="section section-orders">
          <div class="orders-panel">
            <div class="table-head">
              <h3>Pedidos</h3>
              <span class="orders-count">{{ ordersTotal }} registro(s)</span>
            </div>

            <p class="orders-hint">
              Todos os pedidos iniciados no quiz aparecem aqui — o email só é preenchido no passo 5 (contato), antes do pagamento.
              Busque também por <code>src</code>, <code>utm_source</code> ou campanha.
            </p>

            <div class="filters">
              <select v-model="filterStatus">
                <option value="">Todos os status</option>
                <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
              </select>
              <input v-model="filterSearch" type="search" placeholder="Buscar homenageado, nome ou email" @keyup.enter="loadOrders(1)" />
              <button class="btn-filter" @click="loadOrders(1)">Filtrar</button>
              <button class="btn-filter btn-filter-outline" @click="handleExport">Exportar CSV</button>
            </div>

            <p v-if="ordersError" class="orders-error">{{ ordersError }}</p>

            <div class="table-wrap">
              <table class="orders-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Homenageado</th>
                    <th>Contato</th>
                    <th>Status</th>
                    <th>Pagamento</th>
                    <th>Origem</th>
                    <th>Criado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!loading && orders.length === 0">
                    <td colspan="8" class="empty-row">Nenhum pedido encontrado.</td>
                  </tr>
                  <tr v-for="o in orders" :key="o.id">
                    <td class="mono">{{ o.id.slice(0, 8) }}…</td>
                    <td><strong>{{ o.honored_name }}</strong></td>
                    <td>
                      <span v-if="o.email">{{ o.email }}</span>
                      <span v-else class="muted">Sem email ainda</span>
                    </td>
                    <td><span :class="statusClass(o.status)">{{ statusLabels[o.status] || o.status }}</span></td>
                    <td>{{ o.payment_status === 'paid' ? 'Pago' : 'Não pago' }}</td>
                    <td class="origin-cell">{{ formatAttribution(o) }}</td>
                    <td>{{ formatDate(o.created_at) }}</td>
                    <td class="actions">
                      <button @click="openOrderDetail(o.id)">Ver</button>
                      <button v-if="o.status === 'failed'" @click="handleRetry(o.id)">Retry</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="pagination">
              <button :disabled="ordersPage <= 1" @click="loadOrders(ordersPage - 1)">←</button>
              <span>{{ ordersPage }} / {{ ordersTotalPages }}</span>
              <button :disabled="ordersPage >= ordersTotalPages" @click="loadOrders(ordersPage + 1)">→</button>
            </div>
          </div>
        </section>

        <section v-if="section === 'settings'" class="section settings">
          <div class="settings-card">
            <h3>Configurações de geração</h3>
            <label class="toggle-row">
              <input v-model="settings.generationEnabled" type="checkbox" />
              Geração ativa
            </label>
            <label>
              Limite diário
              <input v-model.number="settings.maxDailyGenerations" type="number" min="1" />
            </label>
            <label>
              Preço (R$)
              <input v-model.number="settings.priceBrl" type="number" step="0.01" />
            </label>
            <button class="btn-primary" @click="saveSettings">Salvar</button>
          </div>
          <div class="settings-card">
            <h3>Variáveis de ambiente (keys)</h3>
            <ul>
              <li v-for="key in settings.envKeys" :key="key">{{ key }}</li>
            </ul>
          </div>
        </section>
      </main>
    </div>

    <div v-if="detailOpen && selectedOrder" class="modal-overlay" @click.self="detailOpen = false">
      <div class="modal">
        <header>
          <h3>Pedido {{ selectedOrder.id.slice(0, 8) }}…</h3>
          <button @click="detailOpen = false">✕</button>
        </header>

        <div class="modal-body">
          <section>
            <h4>Dados do Quiz</h4>
            <p><strong>Homenageado:</strong> {{ selectedOrder.honored_name }}</p>
            <p><strong>Relacionamento:</strong> {{ selectedOrder.relationship }}</p>
            <p><strong>Gênero:</strong> {{ selectedOrder.genre }} / {{ selectedOrder.voice }}</p>
          </section>

          <section v-if="selectedOrder.generated_lyrics">
            <h4>Letra gerada</h4>
            <textarea readonly :value="selectedOrder.generated_lyrics" rows="8" />
          </section>

          <section v-if="orderVersions(selectedOrder).length || selectedOrder.cover_image_url">
            <h4>Áudio e capa</h4>
            <div
              v-for="version in orderVersions(selectedOrder)"
              :key="`${selectedOrder.id}-v${version.version}`"
              class="audio-block"
            >
              <audio :src="version.audioUrl" controls />
              <p class="download-filename">📁 {{ version.displayName }}</p>
              <button
                type="button"
                class="btn-download-music"
                :disabled="musicDownloadingKey === `${selectedOrder.id}-v${version.version}`"
                @click="downloadMusic(selectedOrder, version)"
              >
                {{
                  musicDownloadingKey === `${selectedOrder.id}-v${version.version}`
                    ? 'Baixando...'
                    : `⬇ Baixar ${version.displayName}`
                }}
              </button>
            </div>
            <div v-if="selectedOrder.cover_image_url" class="cover-block">
              <img :src="selectedOrder.cover_image_url" class="modal-cover" alt="Capa da música" />
              <button type="button" class="btn-download-cover" :disabled="coverDownloading" @click="downloadCover(selectedOrder)">
                {{ coverDownloading ? 'Baixando...' : '⬇ Baixar capa' }}
              </button>
            </div>
          </section>

          <section>
            <h4>Origem do tráfego</h4>
            <p><strong>Resumo:</strong> {{ formatAttribution(selectedOrder) }}</p>
            <p><strong>src:</strong> {{ selectedOrder.traffic_src || '—' }}</p>
            <p><strong>utm_source:</strong> {{ selectedOrder.utm_source || '—' }}</p>
            <p><strong>utm_medium:</strong> {{ selectedOrder.utm_medium || '—' }}</p>
            <p><strong>utm_campaign:</strong> {{ selectedOrder.utm_campaign || '—' }}</p>
            <p><strong>utm_term:</strong> {{ selectedOrder.utm_term || '—' }}</p>
            <p><strong>utm_content:</strong> {{ selectedOrder.utm_content || '—' }}</p>
            <p><strong>Landing:</strong> {{ selectedOrder.landing_page || '—' }}</p>
          </section>

          <section>
            <h4>Status Suno</h4>
            <p>Task: {{ selectedOrder.suno_task_id || '—' }}</p>
            <p>Status: {{ selectedOrder.suno_status || '—' }}</p>
            <p>Início: {{ formatDate(selectedOrder.music_generation_started_at) }}</p>
            <p>Fim: {{ formatDate(selectedOrder.music_generation_completed_at) }}</p>
          </section>

          <section>
            <h4>Logs de geração</h4>
            <div class="timeline">
              <div v-for="log in selectedLogs" :key="log.id" class="timeline-item" :class="'log-' + log.status">
                <span class="log-time">{{ formatDate(log.created_at) }}</span>
                <span class="log-step">{{ log.step }}</span>
                <span class="log-msg">{{ log.message }}</span>
                <span v-if="log.duration_ms" class="log-dur">{{ log.duration_ms }}ms</span>
              </div>
            </div>
          </section>

          <div class="modal-actions">
            <button v-if="selectedOrder.status === 'failed'" @click="handleRetry(selectedOrder.id)">Retry</button>
            <select @change="handleStatusChange(selectedOrder.id, $event.target.value)">
              <option value="">Alterar status...</option>
              <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-app {
  min-height: 100vh;
  background: #f7f9ff;
  color: #0d2137;
  font-family: 'Inter', sans-serif;
}

.login-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.login-card {
  background: #fff;
  border: 1px solid #daeaf5;
  border-radius: 20px;
  padding: 32px;
  width: 100%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 153, 184, 0.1);
}

.admin-logo {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  object-fit: contain;
  image-rendering: auto;
}

.admin-logo-login {
  max-height: 72px;
  margin: 0 auto 16px;
}

.admin-logo-sidebar {
  max-height: 64px;
  margin-bottom: 12px;
}
.login-input {
  width: 100%;
  margin: 16px 0;
  padding: 12px 14px;
  border: 1px solid #daeaf5;
  border-radius: 12px;
}
.login-error { color: #ef4444; font-size: 0.85rem; }

.btn-primary {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #00c9d4, #0066a8);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.admin-layout { display: flex; min-height: 100vh; }

.sidebar {
  width: 240px;
  background: #fff;
  border-right: 1px solid #daeaf5;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar nav { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.sidebar nav button,
.btn-logout {
  text-align: left;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  color: #4a6a80;
  font-weight: 600;
}
.sidebar nav button.active { background: rgba(0, 153, 184, 0.12); color: #0099b8; }
.btn-logout { color: #ef4444; margin-top: auto; }

.main {
  flex: 1;
  min-width: 0;
  padding: 20px;
  box-sizing: border-box;
}

.section {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.topbar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.topbar h2 { margin: 0; flex: 1; }
.date { color: #8aaabb; font-size: 0.9rem; }
.menu-btn { display: none; border: none; background: #fff; padding: 8px 12px; border-radius: 8px; }

.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.metric {
  background: #fff;
  border: 1px solid #daeaf5;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-value { font-size: 1.6rem; font-weight: 800; }
.metric-label { color: #8aaabb; font-size: 0.85rem; }
.metric-cyan .metric-value { color: #0099b8; }
.metric-amber .metric-value { color: #ffb347; }
.metric-green .metric-value { color: #22c55e; }
.metric-coral .metric-value { color: #ff6b6b; }
.metric.pulse { animation: pulse 1.5s infinite; }

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 179, 71, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(255, 179, 71, 0); }
}

.chart-card, .table-card, .settings-card, .orders-panel {
  background: #fff;
  border: 1px solid #daeaf5;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.orders-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid #eef5fb;
  border-radius: 12px;
  background: #fafcff;
}

.table-wrap table {
  margin: 0;
  min-width: 720px;
}

.table-wrap th:first-child,
.table-wrap td:first-child {
  padding-left: 14px;
}

.table-wrap th:last-child,
.table-wrap td:last-child {
  padding-right: 14px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 160px;
  padding-top: 12px;
}

.chart-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  gap: 4px;
  min-width: 0;
}

.chart-value {
  font-size: 0.75rem;
  font-weight: 700;
  color: #0099b8;
  min-height: 1rem;
}

.chart-label {
  font-size: 0.7rem;
  color: #8aaabb;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.chart-bar {
  width: 100%;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(180deg, #00c9d4, #a855f7);
  min-height: 4px;
}

table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
th, td { padding: 10px 8px; border-bottom: 1px solid #eef5fb; text-align: left; }
.mono { font-family: monospace; font-size: 0.8rem; }
.actions { display: flex; gap: 6px; }
.actions button {
  padding: 4px 10px;
  border: 1px solid #daeaf5;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 0.8rem;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}
.badge-pending { background: #e5e7eb; color: #4b5563; }
.badge-generating_lyrics, .badge-generating_music { background: #fef3c7; color: #b45309; animation: pulse 1.5s infinite; }
.badge-music_ready, .badge-delivered { background: #dcfce7; color: #15803d; }
.badge-paid { background: #cffafe; color: #0e7490; }
.badge-failed { background: #fee2e2; color: #b91c1c; }

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 16px;
  padding: 14px;
  background: #f7f9ff;
  border: 1px solid #eef5fb;
  border-radius: 12px;
}

.filters input,
.filters select {
  flex: 1;
  min-width: 140px;
  padding: 8px 12px;
  border: 1px solid #daeaf5;
  border-radius: 10px;
  background: #fff;
  box-sizing: border-box;
}

.btn-filter {
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #00c9d4, #0066a8);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn-filter-outline {
  background: #fff;
  color: #0099b8;
  border: 1px solid #daeaf5;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  margin-top: 4px;
  border-top: 1px solid #eef5fb;
}

.pagination button {
  padding: 6px 14px;
  border: 1px solid #daeaf5;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.settings { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.settings label { display: block; margin-bottom: 12px; }
.settings input[type="number"] { width: 100%; padding: 8px; border: 1px solid #daeaf5; border-radius: 8px; margin-top: 4px; }
.toggle-row { display: flex; align-items: center; gap: 8px; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(13, 33, 55, 0.5);
  display: grid;
  place-items: center;
  z-index: 100;
  padding: 20px;
}

.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  overflow: auto;
}

.modal header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eef5fb;
}

.modal-body { padding: 20px; }
.modal-body section { margin-bottom: 20px; }
.modal-body textarea {
  width: 100%;
  border: 1px solid #daeaf5;
  border-radius: 10px;
  padding: 10px;
  font-family: inherit;
}
.audio-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e8f4fb;
}

.audio-block:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.audio-block audio {
  width: 100%;
}

.download-filename {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #15803d;
}

.btn-download-music {
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #22c55e, #00c9d4);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-download-music:disabled {
  opacity: 0.6;
  cursor: wait;
}

.cover-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-top: 12px;
}

.modal-cover {
  width: 200px;
  max-width: 100%;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 153, 184, 0.15);
}

.btn-download-cover {
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #00c9d4, #0066a8);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-download-cover:disabled { opacity: 0.6; cursor: wait; }

.orders-hint {
  margin: 0 0 16px;
  padding: 12px 14px;
  color: #4a6a80;
  font-size: 0.88rem;
  line-height: 1.5;
  background: #f0f8ff;
  border: 1px solid #daeaf5;
  border-radius: 10px;
}

.orders-error {
  color: #ef4444;
  margin-bottom: 12px;
  font-size: 0.9rem;
}

.table-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef5fb;
}

.table-head h3 { margin: 0; }

.orders-count {
  color: #8aaabb;
  font-size: 0.85rem;
}

.empty-row {
  text-align: center;
  color: #8aaabb;
  padding: 24px !important;
}

.muted { color: #8aaabb; font-size: 0.85rem; }

.origin-cell {
  font-size: 0.82rem;
  color: #5b7a94;
  max-width: 180px;
}

.orders-hint code {
  background: #eef5fb;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.8rem;
}

.sales-notifications {
  margin-bottom: 16px;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ecfdf5, #e0f7fa);
  border: 1px solid #86efac;
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.12);
}

.sales-notifications-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.sales-dismiss {
  border: none;
  background: #0d2137;
  color: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.8rem;
  cursor: pointer;
}

.sales-notifications-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sales-notification-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 153, 184, 0.15);
}

.sales-notification-title {
  margin: 0 0 4px;
  font-weight: 700;
  color: #0d2137;
}

.sales-notification-meta {
  margin: 0;
  font-size: 0.82rem;
  color: #5b7a94;
}

.sales-notification-card button {
  border: none;
  background: #0099b8;
  color: #fff;
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
  white-space: nowrap;
}

.modal-actions { display: flex; gap: 10px; }

.timeline { display: flex; flex-direction: column; gap: 8px; }
.timeline-item {
  padding: 10px 12px;
  border-left: 3px solid #daeaf5;
  background: #f7f9ff;
  border-radius: 0 8px 8px 0;
  font-size: 0.85rem;
}
.log-success { border-left-color: #22c55e; }
.log-error { border-left-color: #ef4444; }
.log-retry { border-left-color: #ffb347; }
.log-time { color: #8aaabb; margin-right: 8px; }
.log-dur { color: #0099b8; margin-left: 8px; }

@media (max-width: 900px) {
  .metrics { grid-template-columns: repeat(2, 1fr); }
  .settings { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .main { padding: 12px; }
  .orders-panel,
  .table-card,
  .chart-card { padding: 14px; }
  .filters { flex-direction: column; }
  .filters input,
  .filters select { width: 100%; min-width: 0; }
  .btn-filter { width: 100%; }
  .menu-btn { display: block; }
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.2s;
  }
  .sidebar.open { transform: translateX(0); }
  .metrics { grid-template-columns: 1fr; }
  .sales-notifications {
    position: sticky;
    top: 8px;
    z-index: 20;
  }
  .sales-notifications-head {
    flex-direction: column;
    align-items: stretch;
  }
  .sales-dismiss { width: 100%; }
}
</style>
