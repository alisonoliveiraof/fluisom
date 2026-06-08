const API = 'http://localhost:3001/api'
const POLL_MS = 5000
const MAX_POLLS = 120 // ~10 min

const quizPayload = {
  relationship: 'mae',
  honoredName: 'Maria E2E',
  specialQualities: 'Ela é carinhosa, dedicada e sempre presente na minha vida com muito amor e paciência.',
  specialMoments: 'Lembro quando ela me abraçou no meu aniversário e cantou parabéns com lágrimas nos olhos de emoção.',
  specialMessage: 'Obrigado por tudo, mãe.',
  genre: 'romantico',
  voice: 'feminino',
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  console.log('[E2E] 1/4 Health check...')
  const health = await request('/health')
  if (!health.ok) throw new Error('Backend offline')
  console.log('[E2E] ✅ Backend OK')

  console.log('[E2E] 2/4 Iniciando quiz (POST /quiz/start)...')
  const start = await request('/quiz/start', { method: 'POST', body: JSON.stringify(quizPayload) })
  if (!start.ok) throw new Error(`Start failed: ${start.data.message}`)
  const { orderId, status } = start.data
  console.log(`[E2E] ✅ Pedido criado: ${orderId} (status: ${status})`)

  console.log('[E2E] 3/4 Aguardando geração (letra + música)...')
  let lastStatus = ''
  for (let i = 1; i <= MAX_POLLS; i++) {
    await sleep(POLL_MS)
    const poll = await request(`/quiz/status/${orderId}`)
    if (!poll.ok) {
      console.log(`[E2E] Poll ${i}: erro ${poll.status}`)
      continue
    }
    const { status: s, progress, statusLabel, errorMessage } = poll.data
    if (s !== lastStatus) {
      console.log(`[E2E] [${i}] ${s} — ${progress}% — ${statusLabel}`)
      lastStatus = s
    }

    if (s === 'music_ready' || s === 'preview_shown') {
      console.log('[E2E] ✅ Música pronta!')
      break
    }
    if (s === 'failed') {
      throw new Error(`Geração falhou: ${errorMessage}`)
    }
    if (i === MAX_POLLS) {
      throw new Error(`Timeout após ${MAX_POLLS} polls (último status: ${s})`)
    }
  }

  console.log('[E2E] 4/4 Buscando prévia (GET /quiz/preview/:orderId)...')
  const preview = await request(`/quiz/preview/${orderId}`)
  if (!preview.ok && preview.status !== 202) {
    throw new Error(`Preview failed: ${preview.data.message}`)
  }
  const p = preview.data
  console.log('[E2E] ✅ Preview:')
  console.log('  - Título:', p.musicTitle)
  console.log('  - Áudio:', p.previewAudioUrl ? 'OK' : 'ausente')
  console.log('  - Capa:', p.coverImageUrl ? 'OK' : 'ausente')
  console.log('  - Letra (preview):', p.lyricsPreview?.slice(0, 120) + '...')
  console.log('\n[E2E] 🎉 Fluxo end-to-end concluído com sucesso!')
  console.log('[E2E] orderId:', orderId)
}

main().catch((err) => {
  console.error('\n[E2E] ❌ Falhou:', err.message)
  process.exit(1)
})
