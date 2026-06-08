/** Mapeia status da Suno (GET /api/v1/generate/record-info) para progresso interno. */

export const SUNO_STATUS = {
  PENDING: 'PENDING',
  TEXT_SUCCESS: 'TEXT_SUCCESS',
  FIRST_SUCCESS: 'FIRST_SUCCESS',
  SUCCESS: 'SUCCESS',
  CREATE_TASK_FAILED: 'CREATE_TASK_FAILED',
  GENERATE_AUDIO_FAILED: 'GENERATE_AUDIO_FAILED',
  CALLBACK_EXCEPTION: 'CALLBACK_EXCEPTION',
  SENSITIVE_WORD_ERROR: 'SENSITIVE_WORD_ERROR',
}

const FAILED_STATUSES = new Set([
  SUNO_STATUS.CREATE_TASK_FAILED,
  SUNO_STATUS.GENERATE_AUDIO_FAILED,
  SUNO_STATUS.CALLBACK_EXCEPTION,
  SUNO_STATUS.SENSITIVE_WORD_ERROR,
])

export function isSunoFailed(status) {
  return FAILED_STATUSES.has(status)
}

export function isSunoComplete(status) {
  return status === SUNO_STATUS.SUCCESS
}

export function isSunoStreamReady(status) {
  return status === SUNO_STATUS.FIRST_SUCCESS || status === SUNO_STATUS.SUCCESS
}

export function sunoStatusToProgress(status, pollAttempt = 0, maxAttempts = 60) {
  const map = {
    [SUNO_STATUS.PENDING]: 45,
    [SUNO_STATUS.TEXT_SUCCESS]: 55,
    [SUNO_STATUS.FIRST_SUCCESS]: 75,
    [SUNO_STATUS.SUCCESS]: 90,
  }
  if (map[status] !== undefined) return map[status]

  const base = 40
  const increment = Math.min(50, Math.floor((pollAttempt / maxAttempts) * 50))
  return base + increment
}

export function sunoStatusLabel(status) {
  const labels = {
    [SUNO_STATUS.PENDING]: 'Aguardando processamento',
    [SUNO_STATUS.TEXT_SUCCESS]: 'Letra processada pela Suno',
    [SUNO_STATUS.FIRST_SUCCESS]: 'Primeira faixa pronta (stream)',
    [SUNO_STATUS.SUCCESS]: 'Música gerada com sucesso',
    [SUNO_STATUS.CREATE_TASK_FAILED]: 'Falha ao criar tarefa',
    [SUNO_STATUS.GENERATE_AUDIO_FAILED]: 'Falha na geração de áudio',
    [SUNO_STATUS.CALLBACK_EXCEPTION]: 'Erro no callback',
    [SUNO_STATUS.SENSITIVE_WORD_ERROR]: 'Conteúdo sensível detectado',
  }
  return labels[status] || status
}

export function orderStatusToProgress(status, sunoStatus = null, pollAttempt = 0) {
  const base = {
    pending: 0,
    generating_lyrics: 15,
    lyrics_ready: 35,
    generating_music: sunoStatus ? sunoStatusToProgress(sunoStatus, pollAttempt) : 40,
    music_ready: 100,
    preview_shown: 100,
    payment_pending: 100,
    paid: 100,
    delivered: 100,
    failed: -1,
    refunded: -1,
  }
  return base[status] ?? 0
}

export function orderStatusLabel(status) {
  const labels = {
    pending: 'Preparando sua história...',
    generating_lyrics: '✍️ Compondo a letra da sua música...',
    lyrics_ready: '🎵 Letra pronta! Iniciando produção musical...',
    generating_music: '🎧 Produzindo sua música com vocais profissionais...',
    music_ready: '✨ Sua música está pronta!',
    preview_shown: '✨ Sua música está pronta!',
    payment_pending: 'Aguardando pagamento',
    paid: 'Pagamento confirmado',
    delivered: 'Música entregue',
    failed: 'Erro na geração',
    refunded: 'Reembolsado',
  }
  return labels[status] || status
}
