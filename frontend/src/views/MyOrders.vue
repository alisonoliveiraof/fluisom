<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getMyOrders } from '../services/api.service'
import { getSavedOrderId } from '../quiz/quizState'
import { downloadMusicFile } from '../utils/musicDownload'
import MusicVersionList from '../components/MusicVersionList.vue'
import { LOGO_URL } from '../constants'

const SESSION_KEY = 'fluisom_orders_session'

const router = useRouter()
const route = useRoute()

const email = ref('')
const loggedEmail = ref('')
const orders = ref([])
const loading = ref(false)
const error = ref('')
const downloadingKey = ref(null)
const copiedOrderId = ref(null)

const isLoggedIn = computed(() => !!loggedEmail.value)

const STATUS_COLORS = {
  pending: '#8aaabb',
  generating_lyrics: '#f59e0b',
  generating_music: '#f59e0b',
  music_ready: '#0099b8',
  preview_shown: '#0099b8',
  payment_pending: '#a855f7',
  paid: '#22c55e',
  delivered: '#22c55e',
  failed: '#ef4444',
}

function saveSession(value) {
  sessionStorage.setItem(SESSION_KEY, value)
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem('fluisom_orders_email')
}

function restoreSession() {
  const saved = sessionStorage.getItem(SESSION_KEY) || route.query.email
  if (!saved) return false
  loggedEmail.value = String(saved)
  email.value = loggedEmail.value
  return true
}

onMounted(() => {
  if (restoreSession()) {
    fetchOrders()
  }
})

async function login() {
  const trimmed = email.value.trim()
  if (!trimmed) {
    error.value = 'Informe seu email'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const data = await getMyOrders(trimmed, getSavedOrderId() || undefined)
    loggedEmail.value = trimmed
    orders.value = data.orders || []
    saveSession(trimmed)
    sessionStorage.setItem('fluisom_orders_email', trimmed)
  } catch (err) {
    error.value = err.message || 'Não foi possível acessar seus pedidos'
    orders.value = []
  } finally {
    loading.value = false
  }
}

async function fetchOrders() {
  if (!loggedEmail.value) return

  loading.value = true
  error.value = ''

  try {
    const data = await getMyOrders(loggedEmail.value, getSavedOrderId() || undefined)
    orders.value = data.orders || []
  } catch (err) {
    error.value = err.message || 'Não foi possível carregar seus pedidos'
    orders.value = []
  } finally {
    loading.value = false
  }
}

function logout() {
  clearSession()
  loggedEmail.value = ''
  email.value = ''
  orders.value = []
  error.value = ''
}

function statusColor(status) {
  return STATUS_COLORS[status] || '#8aaabb'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goPay(orderId) {
  router.push({ path: '/passo/6', query: { orderId } })
}

function goHome() {
  router.push('/pv')
}

function orderVersions(order) {
  if (order.versions?.length) return order.versions
  if (order.previewAudioUrl) {
    return [{
      version: 1,
      title: `Música Especial para ${order.honoredName?.trim() || 'você'} - Versão 1`,
      previewAudioUrl: order.previewAudioUrl,
      fullAudioUrl: order.fullAudioUrl,
      coverImageUrl: order.coverImageUrl,
    }]
  }
  return []
}

async function downloadVersion(order, version) {
  const url = version.fullAudioUrl
  if (!url) return

  const key = `v${version.version}`
  downloadingKey.value = key
  try {
    await downloadMusicFile({
      url,
      honoredName: order.honoredName,
      version: version.version,
    })
  } finally {
    downloadingKey.value = null
  }
}

async function copyLyrics(order) {
  if (!order.lyrics) return

  try {
    await navigator.clipboard.writeText(order.lyrics)
    copiedOrderId.value = order.orderId
    setTimeout(() => {
      if (copiedOrderId.value === order.orderId) copiedOrderId.value = null
    }, 2000)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = order.lyrics
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copiedOrderId.value = order.orderId
    setTimeout(() => {
      if (copiedOrderId.value === order.orderId) copiedOrderId.value = null
    }, 2000)
  }
}
</script>

<template>
  <div class="orders-page">
    <header class="orders-header">
      <a href="/pv" class="logo-link" @click.prevent="goHome">
        <img :src="LOGO_URL" alt="Fluisom" class="logo" />
      </a>
      <div class="header-actions">
        <button v-if="isLoggedIn" type="button" class="btn-logout" @click="logout">Sair</button>
        <button type="button" class="btn-back-home" @click="goHome">← Voltar ao site</button>
      </div>
    </header>

    <main class="orders-main">
      <!-- Tela de login -->
      <template v-if="!isLoggedIn">
        <div class="login-card">
          <h1>Meus Pedidos</h1>
          <p class="lead">Entre com o email usado no pedido para acessar suas músicas.</p>

          <form class="login-form" @submit.prevent="login">
            <label class="field-label" for="orders-email">Email</label>
            <input
              id="orders-email"
              v-model="email"
              type="email"
              class="search-input"
              placeholder="seu@email.com"
              autocomplete="email"
              required
            />
            <button type="submit" class="btn-search" :disabled="loading">
              {{ loading ? 'Entrando…' : 'Entrar' }}
            </button>
          </form>

          <p class="secure-note">🔒 Acesso Seguro e privado</p>
          <p v-if="error" class="error-msg">{{ error }}</p>
        </div>
      </template>

      <!-- Área logada -->
      <template v-else>
        <div class="session-bar">
          <div class="session-info">
            <span class="session-icon">👤</span>
            <div>
              <p class="session-label">Conectado como</p>
              <p class="session-email">{{ loggedEmail }}</p>
            </div>
          </div>
          <button type="button" class="btn-logout-inline" @click="logout">Sair</button>
        </div>

        <h1 class="dashboard-title">Seus pedidos</h1>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <div v-if="loading" class="loading-box">
          <div class="spinner" />
          <p>Carregando seus pedidos…</p>
        </div>

        <div v-else-if="!orders.length" class="empty-box">
          <p>Nenhum pedido encontrado para <strong>{{ loggedEmail }}</strong>.</p>
          <p class="empty-hint">
            Verifique o email ou
            <button type="button" class="link-btn" @click="router.push({ path: '/passo/1', query: { novo: '1' } })">crie sua primeira música</button>.
          </p>
        </div>

        <div v-else class="orders-list">
          <article v-for="order in orders" :key="order.orderId" class="order-card">
            <div class="order-top">
              <div class="order-info order-info-full">
                <h2>Pedido para <strong>{{ order.honoredName?.trim() }}</strong></h2>
                <p class="order-date">{{ formatDate(order.createdAt) }}</p>
                <span
                  class="status-badge"
                  :style="{ background: statusColor(order.status) + '22', color: statusColor(order.status) }"
                >
                  {{ order.statusLabel }}
                </span>
              </div>
            </div>

            <div v-if="(order.canPreview || order.canDownload) && orderVersions(order).length" class="preview-block">
              <MusicVersionList
                :versions="orderVersions(order)"
                :honored-name="order.honoredName"
                :preview-only="!order.canDownload"
                :preview-max-seconds="30"
                :show-download="order.canDownload"
                :downloading-key="downloadingKey"
                @download="(v) => downloadVersion(order, v)"
              />
            </div>

            <div v-if="order.canDownload && order.lyrics" class="lyrics-block">
              <div class="lyrics-header">
                <h3>Letra completa</h3>
                <button type="button" class="btn-copy-lyrics" @click="copyLyrics(order)">
                  {{ copiedOrderId === order.orderId ? '✓ Copiado!' : '📋 Copiar letra' }}
                </button>
              </div>
              <pre class="lyrics-text">{{ order.lyrics }}</pre>
            </div>

            <div v-if="order.needsPayment" class="payment-alert">
              <p>💳 Pagamento pendente — finalize para baixar a versão completa (R$ {{ order.paymentAmount.toFixed(2).replace('.', ',') }})</p>
              <button type="button" class="btn-pay" @click="goPay(order.orderId)">Finalizar pagamento</button>
            </div>

            <div v-else-if="order.canDownload" class="download-block">
              <p>✅ Pagamento confirmado! Ouça, baixe suas 2 versões e copie a letra acima.</p>
            </div>

            <div v-else-if="['pending', 'generating_lyrics', 'generating_music'].includes(order.status)" class="progress-alert">
              <p>⏳ Sua música ainda está sendo criada. Atualize esta página em alguns minutos.</p>
            </div>

            <div v-else-if="order.status === 'failed'" class="failed-alert">
              <p>❌ Houve um problema na geração. Entre em contato: contato@fluisom.com</p>
            </div>
          </article>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.orders-page {
  min-height: 100svh;
  background: #f7f9ff;
  font-family: 'Inter', sans-serif;
  color: #0d2137;
}

.orders-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(12px + env(safe-area-inset-top, 0)) 16px 12px;
  background: white;
  border-bottom: 1px solid #daeaf5;
  position: sticky;
  top: 0;
  z-index: 10;
}

.logo { height: 44px; width: auto; object-fit: contain; }
.logo-link { display: flex; }

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-back-home,
.btn-logout {
  background: none;
  border: none;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-back-home { color: #0099b8; }

.btn-logout {
  color: #ef4444;
  padding: 6px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
}

.orders-main {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 16px 48px;
}

.login-card {
  background: white;
  border: 1px solid #daeaf5;
  border-radius: 20px;
  padding: 28px 24px;
  box-shadow: 0 8px 32px rgba(0, 153, 184, 0.08);
}

h1 {
  font-size: 1.75rem;
  margin: 0 0 8px;
}

.dashboard-title {
  font-size: 1.5rem;
  margin: 0 0 20px;
}

.lead {
  color: #4a6a80;
  margin: 0 0 24px;
  line-height: 1.5;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a6a80;
}

.secure-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 16px 0 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a6a80;
}

.session-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: white;
  border: 1px solid #daeaf5;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 24px;
  box-shadow: 0 4px 16px rgba(0, 153, 184, 0.06);
}

.session-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.session-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.session-label {
  margin: 0;
  font-size: 0.75rem;
  color: #4a6a80;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.session-email {
  margin: 2px 0 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0d2137;
  word-break: break-all;
}

.btn-logout-inline {
  flex-shrink: 0;
  background: #fef2f2;
  color: #ef4444;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 8px 16px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.search-input {
  width: 100%;
  height: 48px;
  border: 1px solid #daeaf5;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 1rem;
  box-sizing: border-box;
}

.btn-search {
  background: linear-gradient(135deg, #ff6b6b, #ffb347);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 0 24px;
  height: 48px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.btn-search:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-msg {
  color: #ef4444;
  margin-bottom: 16px;
  text-align: center;
}

.loading-box,
.empty-box {
  text-align: center;
  padding: 40px 16px;
  color: #4a6a80;
}

.spinner {
  width: 36px;
  height: 36px;
  margin: 0 auto 12px;
  border: 3px solid #daeaf5;
  border-top-color: #0099b8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.link-btn {
  background: none;
  border: none;
  color: #0099b8;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-card {
  background: white;
  border: 1px solid #daeaf5;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 153, 184, 0.06);
}

.order-top {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.order-info-full {
  width: 100%;
}

.order-cover {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
}

.order-cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #00c9d4, #0066a8);
  font-size: 1.5rem;
}

.order-info h2 {
  font-size: 1rem;
  margin: 0 0 4px;
}

.order-honored,
.order-date {
  font-size: 0.85rem;
  color: #4a6a80;
  margin: 0 0 4px;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  margin-top: 6px;
}

.preview-block { margin-bottom: 12px; }

.lyrics-block {
  margin: 16px 0 12px;
  padding: 16px;
  border-radius: 14px;
  background: #f7f9ff;
  border: 1px solid #daeaf5;
}

.lyrics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.lyrics-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #0d2137;
}

.btn-copy-lyrics {
  flex-shrink: 0;
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #00c9d4, #0066a8);
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.lyrics-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 0.92rem;
  line-height: 1.6;
  color: #4a6a80;
  max-height: 320px;
  overflow-y: auto;
}

.sr-only-audio {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.btn-play {
  width: 100%;
  background: linear-gradient(135deg, #00c9d4, #0066a8);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 12px;
  font-weight: 700;
  cursor: pointer;
}

.btn-play.playing {
  background: linear-gradient(135deg, #0066a8, #004d80);
}

.payment-alert,
.download-block,
.progress-alert,
.failed-alert {
  border-radius: 12px;
  padding: 14px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.payment-alert {
  background: #fff8e8;
  border: 1px solid #fde68a;
}

.download-block {
  background: #f0fff8;
  border: 1px solid #bbf7d0;
}

.download-filename {
  margin: 0 0 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #15803d;
}

.progress-alert {
  background: #f0f8ff;
  border: 1px solid #bae6fd;
}

.failed-alert {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.btn-pay,
.btn-download {
  display: inline-block;
  margin-top: 10px;
  background: linear-gradient(135deg, #ff6b6b, #ffb347);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
}

.btn-download:disabled {
  opacity: 0.7;
  cursor: wait;
}

.btn-download {
  background: linear-gradient(135deg, #22c55e, #00c9d4);
}
</style>
