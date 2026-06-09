<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getMyOrders } from '../services/api.service'
import { getSavedOrderId } from '../quiz/quizState'
import { LOGO_URL } from '../constants'

const router = useRouter()
const route = useRoute()

const email = ref('')
const orders = ref([])
const loading = ref(false)
const error = ref('')
const searched = ref(false)
const playingId = ref(null)
const audioEls = ref({})

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

onMounted(() => {
  const saved = sessionStorage.getItem('fluisom_orders_email') || route.query.email
  if (saved) {
    email.value = String(saved)
    fetchOrders()
  }
})

async function fetchOrders() {
  const trimmed = email.value.trim()
  if (!trimmed) {
    error.value = 'Informe seu email'
    return
  }

  loading.value = true
  error.value = ''
  searched.value = true

  try {
    const data = await getMyOrders(trimmed, getSavedOrderId() || undefined)
    orders.value = data.orders || []
    sessionStorage.setItem('fluisom_orders_email', trimmed)
  } catch (err) {
    error.value = err.message || 'Não foi possível carregar seus pedidos'
    orders.value = []
  } finally {
    loading.value = false
  }
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

function setAudioEl(orderId, el) {
  if (el) audioEls.value[orderId] = el
  else delete audioEls.value[orderId]
}

function pauseAllExcept(orderId) {
  for (const [id, el] of Object.entries(audioEls.value)) {
    if (id !== orderId && el) {
      el.pause()
      el.currentTime = 0
    }
  }
}

function togglePlay(order) {
  const id = order.orderId
  const el = audioEls.value[id]
  if (!el) return

  if (playingId.value === id) {
    el.pause()
    playingId.value = null
    return
  }

  pauseAllExcept(id)
  playingId.value = id
  el.play().catch(() => {
    playingId.value = null
  })
}

function onAudioEnded(orderId) {
  if (playingId.value === orderId) playingId.value = null
}

onBeforeUnmount(() => {
  Object.values(audioEls.value).forEach((el) => el?.pause())
})
</script>

<template>
  <div class="orders-page">
    <header class="orders-header">
      <a href="/pv" class="logo-link" @click.prevent="goHome">
        <img :src="LOGO_URL" alt="Fluisom" class="logo" />
      </a>
      <button type="button" class="btn-back-home" @click="goHome">← Voltar ao site</button>
    </header>

    <main class="orders-main">
      <h1>Meus Pedidos</h1>
      <p class="lead">Digite o email usado no quiz para ver o status e ouvir as prévias das suas músicas.</p>

      <form class="search-form" @submit.prevent="fetchOrders">
        <input
          v-model="email"
          type="email"
          class="search-input"
          placeholder="seu@email.com"
          required
        />
        <button type="submit" class="btn-search" :disabled="loading">
          {{ loading ? 'Buscando…' : 'Buscar pedidos' }}
        </button>
      </form>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <div v-if="loading" class="loading-box">
        <div class="spinner" />
        <p>Carregando seus pedidos…</p>
      </div>

      <div v-else-if="searched && !orders.length" class="empty-box">
        <p>Nenhum pedido encontrado para <strong>{{ email }}</strong>.</p>
        <p class="empty-hint">Verifique o email ou <button type="button" class="link-btn" @click="router.push('/passo/1')">crie sua primeira música</button>.</p>
      </div>

      <div v-else-if="orders.length" class="orders-list">
        <article v-for="order in orders" :key="order.orderId" class="order-card">
          <div class="order-top">
            <img
              v-if="order.coverImageUrl"
              :src="order.coverImageUrl"
              :alt="order.musicTitle || order.honoredName"
              class="order-cover"
            />
            <div v-else class="order-cover placeholder">🎵</div>
            <div class="order-info">
              <h2>{{ order.musicTitle || `Música para ${order.honoredName}` }}</h2>
              <p class="order-honored">Para: <strong>{{ order.honoredName }}</strong></p>
              <p class="order-date">{{ formatDate(order.createdAt) }}</p>
              <span class="status-badge" :style="{ background: statusColor(order.status) + '22', color: statusColor(order.status) }">
                {{ order.statusLabel }}
              </span>
            </div>
          </div>

          <div v-if="order.canPreview && order.previewAudioUrl" class="preview-block">
            <audio
              :ref="(el) => setAudioEl(order.orderId, el)"
              :src="order.previewAudioUrl"
              preload="metadata"
              class="sr-only-audio"
              @ended="onAudioEnded(order.orderId)"
            />
            <button
              type="button"
              class="btn-play"
              :class="{ playing: playingId === order.orderId }"
              @click="togglePlay(order)"
            >
              {{ playingId === order.orderId ? '⏸ Pausar prévia' : '▶ Ouvir prévia' }}
            </button>
          </div>

          <div v-if="order.needsPayment" class="payment-alert">
            <p>💳 Pagamento pendente — finalize para baixar a versão completa (R$ {{ order.paymentAmount.toFixed(2).replace('.', ',') }})</p>
            <button type="button" class="btn-pay" @click="goPay(order.orderId)">Finalizar pagamento</button>
          </div>

          <div v-else-if="order.canDownload && order.fullAudioUrl" class="download-block">
            <p>✅ Pagamento confirmado! Baixe sua música completa:</p>
            <a :href="order.fullAudioUrl" target="_blank" rel="noopener" class="btn-download">⬇ Baixar música</a>
          </div>

          <div v-else-if="['pending', 'generating_lyrics', 'generating_music'].includes(order.status)" class="progress-alert">
            <p>⏳ Sua música ainda está sendo criada. Atualize esta página em alguns minutos.</p>
          </div>

          <div v-else-if="order.status === 'failed'" class="failed-alert">
            <p>❌ Houve um problema na geração. Entre em contato: contato@fluisom.com</p>
          </div>
        </article>
      </div>
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

.btn-back-home {
  background: none;
  border: none;
  color: #0099b8;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.orders-main {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 16px 48px;
}

h1 {
  font-size: 1.75rem;
  margin: 0 0 8px;
}

.lead {
  color: #4a6a80;
  margin: 0 0 24px;
  line-height: 1.5;
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

@media (min-width: 480px) {
  .search-form { flex-direction: row; }
}

.search-input {
  flex: 1;
  height: 48px;
  border: 1px solid #daeaf5;
  border-radius: 12px;
  padding: 0 16px;
  font-size: 1rem;
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

.error-msg {
  color: #ef4444;
  margin-bottom: 16px;
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

.btn-download {
  background: linear-gradient(135deg, #22c55e, #00c9d4);
}
</style>
