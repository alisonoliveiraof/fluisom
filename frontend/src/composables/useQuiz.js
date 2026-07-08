import { ref, computed, watch, onUnmounted, inject, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  startQuiz,
  generateQuizLyrics,
  submitQuizMusic,
  getQuizStatus,
  getQuizPreview,
  updateQuizContact,
  createQuizPayment,
  getQuizPaymentStatus,
} from '../services/api.service'
import { createCardToken } from '../utils/mercadopago'

const QUIZ_KEY = Symbol('quiz')

import {
  form,
  payment,
  canProceed,
  resetQuizState,
  getRelationshipLabel,
  getGenreLabel,
  getSavedOrderId,
  isPersistedOrderId,
  setPersistOrderId,
  persistQuizNow,
} from '../quiz/quizState'
import {
  relationships,
  genres,
  testimonials,
  guarantees,
  confettiEmojis,
} from '../data/quizData'
import { maskWhatsapp } from '../utils/masks'
import { getAttributionQuery } from '../utils/attribution'

export function provideQuiz() {
  const quiz = createQuiz()
  provide(QUIZ_KEY, quiz)
  return quiz
}

export function useQuiz() {
  const injected = inject(QUIZ_KEY, null)
  if (injected) return injected
  return createQuiz()
}

function createQuiz() {
  const router = useRouter()
  const route = useRoute()

  const savedOrderId = getSavedOrderId()
  const orderId = ref(savedOrderId || 'FS-' + Math.random().toString(36).substr(2, 8).toUpperCase())
  if (savedOrderId) {
    setPersistOrderId(savedOrderId)
  }
  const audioPlaying = ref(false)
  const audioProgress = ref(0)
  const audioLocked = ref(true)
  const videoPlaying = ref(false)
  const videoProgress = ref(0)
  const cardFlipped = ref(false)
  const showConfetti = ref(false)

  const generationProgress = ref(0)
  const generationStatus = ref('pending')
  const generationStatusLabel = ref('Preparando sua história...')
  const generationError = ref(null)
  const generationLoading = ref(false)
  const previewData = ref(null)
  const previewAudioEl = ref(null)
  const previewLoading = ref(false)
  const paymentAmount = ref(47.9)
  const paymentLoading = ref(false)
  const paymentError = ref('')
  const pixData = ref(null)
  const pixWaiting = ref(false)
  const verifyingPayment = ref(false)
  const verifyMessage = ref('')

  const waveHeights = Array.from({ length: 40 }, () => Math.floor(Math.random() * 40 + 8))
  const videoWaveBars = Array.from({ length: 20 }, (_, i) => i)

  let audioInterval = null
  let videoInterval = null
  let pollTimer = null
  let pollInFlight = false
  let pollAttempts = 0
  let lastPollProgress = -1

  function activeOrderId() {
    const fromRoute = route.query.orderId
    if (typeof fromRoute === 'string' && isPersistedOrderId(fromRoute)) return fromRoute
    return isPersistedOrderId(orderId.value) ? orderId.value : null
  }

  function clearGenerationSession() {
    clearPollTimer()
    generationProgress.value = 0
    generationStatus.value = 'pending'
    generationStatusLabel.value = 'Preparando sua história...'
    generationError.value = null
    generationLoading.value = false
    previewData.value = null
    previewLoading.value = false
  }

  function beginNewQuizSession() {
    clearGenerationSession()
    orderId.value = 'FS-' + Math.random().toString(36).substr(2, 8).toUpperCase()
    setPersistOrderId(null)
    persistQuizNow()
  }

  const currentStep = computed(() => Number(route.meta.step) || 1)

  const genreLabel = computed(() => getGenreLabel())
  const relationshipLabel = computed(() => getRelationshipLabel())
  const progressPercent = computed(() => ((currentStep.value - 1) / 6) * 100)
  const honoredDisplay = computed(() => form.honoredName.trim() || 'essa pessoa')

  const cardLastFour = computed(() => {
    const digits = payment.cardNumber.replace(/\D/g, '')
    return digits.slice(-4) || '••••'
  })

  const paymentAmountLabel = computed(() => paymentAmount.value.toFixed(2).replace('.', ','))

  const audioTimeDisplay = computed(() => {
    const total = 30
    const current = Math.floor((audioProgress.value / 100) * total)
    const fmt = (n) => String(n).padStart(2, '0')
    return `${fmt(current)}:00 / 0:${fmt(total)}`
  })

  const playedBars = computed(() => Math.floor((audioProgress.value / 100) * 40))

  function fieldProgress(len) {
    if (len < 20) {
      return {
        fill: '#ef4444',
        msg: `Conta mais um pouquinho… (faltam ${20 - len})`,
        msgColor: '#ef4444',
        pct: (len / 20) * 100,
      }
    }
    if (len < 400) {
      return {
        fill: '#ffb347',
        msg: 'Ótimo! Continue escrevendo...',
        msgColor: '#f59e0b',
        pct: (len / 500) * 100,
      }
    }
    return {
      fill: '#22c55e',
      msg: 'Perfeito! Temos material de sobra 🎉',
      msgColor: '#22c55e',
      pct: 100,
    }
  }

  const qualitiesProgress = computed(() => fieldProgress(form.specialQualities.length))
  const momentsProgress = computed(() => fieldProgress(form.specialMoments.length))

  function clearAudioInterval() {
    if (audioInterval) {
      clearInterval(audioInterval)
      audioInterval = null
    }
  }

  function clearVideoInterval() {
    if (videoInterval) {
      clearInterval(videoInterval)
      videoInterval = null
    }
  }

  function clearPollTimer() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  async function pollGenerationStatus() {
    const id = activeOrderId()
    if (!id || pollInFlight) return

    pollInFlight = true
    pollAttempts += 1
    try {
      const status = await getQuizStatus(id)
      const progress = Math.max(0, status.progress ?? 0)
      generationProgress.value = progress
      generationStatus.value = status.status
      generationStatusLabel.value = status.statusLabel || generationStatusLabel.value

      if (progress === lastPollProgress && pollAttempts > 8) {
        generationStatusLabel.value = '🎧 Finalizando suas músicas...'
      }
      lastPollProgress = progress

      if (status.status === 'music_ready' || status.status === 'preview_shown') {
        clearPollTimer()
        await loadPreview()
      } else if (status.status === 'failed') {
        clearPollTimer()
        generationError.value = status.errorMessage || 'Erro na geração da música'
      }
    } catch (err) {
      if (err.message?.includes('não encontrado') || err.message?.includes('invalid input syntax')) {
        beginNewQuizSession()
        generationError.value = 'Sessão expirada. Volte ao passo 3 e clique em Próximo para gerar novamente.'
        clearPollTimer()
        return
      }
      generationError.value = err.message
    } finally {
      pollInFlight = false
    }
  }

  function startGenerationPolling() {
    clearPollTimer()
    pollAttempts = 0
    lastPollProgress = -1
    pollGenerationStatus()
    pollTimer = setInterval(pollGenerationStatus, 5000)
  }

  async function resumeGenerationIfNeeded() {
    const id = activeOrderId()
    if (!id || generationLoading.value) return

    if (id !== orderId.value) {
      orderId.value = id
      setPersistOrderId(id)
      persistQuizNow()
    }

    try {
      const status = await getQuizStatus(id)
      generationStatus.value = status.status
      generationProgress.value = status.progress ?? generationProgress.value
      generationStatusLabel.value = status.statusLabel || generationStatusLabel.value

      if (status.status === 'failed') {
        generationError.value = status.errorMessage || 'Erro na geração'
        return
      }

      if (['music_ready', 'preview_shown'].includes(status.status)) {
        clearPollTimer()
        await loadPreview()
        return
      }

      if (status.status === 'lyrics_ready') {
        generationStatusLabel.value = '🎧 Enviando para produção musical...'
        await submitQuizMusic(id)
        startGenerationPolling()
        return
      }

      if (['generating_music', 'generating_lyrics'].includes(status.status)) {
        startGenerationPolling()
        return
      }

      if (status.status === 'pending') {
        generationLoading.value = true
        generationStatusLabel.value = '✍️ Compondo a letra da sua música...'
        await generateQuizLyrics(id)
        generationStatusLabel.value = '🎧 Enviando para produção musical...'
        await submitQuizMusic(id)
        startGenerationPolling()
      }
    } catch (err) {
      if (err.message?.includes('não encontrado') || err.message?.includes('invalid input syntax')) {
        beginNewQuizSession()
        generationError.value = 'Sessão expirada. Volte ao passo 3 e clique em Próximo para gerar novamente.'
        return
      }
      generationError.value = err.message
    } finally {
      generationLoading.value = false
    }
  }

  function hydrateFormFromOrder(preview) {
    if (!preview) return
    if (preview.honoredName) form.honoredName = preview.honoredName
    if (preview.genre) form.genre = preview.genre
    if (preview.voice) form.voice = preview.voice
    if (preview.relationship) form.relationship = preview.relationship
    if (preview.customRelationship) form.customRelationship = preview.customRelationship
    if (preview.fullName) form.fullName = preview.fullName
    if (preview.email) form.email = preview.email
    persistQuizNow()
  }

  async function ensureContactSaved() {
    const id = activeOrderId()
    if (!id || !form.email) return
    try {
      await updateQuizContact(id, {
        fullName: form.fullName || form.honoredName || 'Cliente',
        email: form.email,
        whatsapp: form.whatsapp,
        discreteMode: form.discreteMode,
      })
    } catch (err) {
      console.error('[FLUISOM] Erro ao salvar contato:', err.message)
    }
  }

  async function loadPreview() {
    const id = activeOrderId()
    if (!id) return
    previewLoading.value = true
    try {
      const preview = await getQuizPreview(id)
      previewData.value = preview
      syncPaymentAmountFromPreview(preview)
      if (preview.paid && Number(route.meta.step) === 6) {
        goToStep(7)
      }
      hydrateFormFromOrder(preview)
      generationProgress.value = 100
      generationStatus.value = preview.status || 'preview_shown'
      generationStatusLabel.value = '✨ Sua música está pronta!'
      if (preview.previewAudioUrl) {
        audioLocked.value = false
      }
    } catch (err) {
      if (err.message?.includes('não encontrado') || err.message?.includes('invalid input syntax')) {
        beginNewQuizSession()
        generationError.value = 'Sessão expirada. Volte ao passo 3 e clique em Próximo para gerar novamente.'
        return
      }
      generationError.value = err.message
    } finally {
      previewLoading.value = false
    }
  }

  async function startGeneration() {
    if (!canProceed(3) || generationLoading.value) return

    clearPollTimer()
    clearGenerationSession()
    generationLoading.value = true

    try {
      const result = await startQuiz(form)
      orderId.value = result.orderId
      setPersistOrderId(result.orderId)
      persistQuizNow()
      generationStatus.value = result.status
      generationProgress.value = 5
      goToStep(4)

      generationStatusLabel.value = '✍️ Compondo a letra da sua música...'
      const lyrics = await generateQuizLyrics(orderId.value)
      generationStatus.value = lyrics.status
      generationProgress.value = lyrics.progress ?? 35
      generationStatusLabel.value = lyrics.statusLabel || generationStatusLabel.value

      generationStatusLabel.value = '🎧 Enviando para produção musical...'
      const music = await submitQuizMusic(orderId.value)
      generationStatus.value = music.status
      generationProgress.value = music.progress ?? 45
      generationStatusLabel.value = music.statusLabel || '🎧 Produzindo sua música...'

      startGenerationPolling()
    } catch (err) {
      generationError.value = err.message || 'Não foi possível iniciar a geração'
    } finally {
      generationLoading.value = false
    }
  }

  function syncAudioProgress() {
    const el = previewAudioEl.value
    if (!el || !el.duration) return
    audioProgress.value = (el.currentTime / el.duration) * 100
  }

  function toggleAudio() {
    const el = previewAudioEl.value
    if (el && previewData.value?.previewAudioUrl) {
      if (audioLocked.value) {
        audioLocked.value = false
      }
      if (audioPlaying.value) {
        el.pause()
        audioPlaying.value = false
        clearAudioInterval()
        return
      }
      el.play()
      audioPlaying.value = true
      clearAudioInterval()
      audioInterval = setInterval(syncAudioProgress, 200)
      return
    }

    if (audioLocked.value) {
      audioLocked.value = false
      audioPlaying.value = true
      clearAudioInterval()
      audioInterval = setInterval(() => {
        if (audioProgress.value >= 100) {
          audioPlaying.value = false
          clearAudioInterval()
          return
        }
        audioProgress.value += 1
      }, 300)
      return
    }
    if (audioPlaying.value) {
      audioPlaying.value = false
      clearAudioInterval()
      return
    }
    audioPlaying.value = true
    clearAudioInterval()
    audioInterval = setInterval(() => {
      if (audioProgress.value >= 100) {
        audioPlaying.value = false
        clearAudioInterval()
        return
      }
      audioProgress.value += 1
    }, 300)
  }

  function toggleVideo() {
    if (videoPlaying.value) {
      videoPlaying.value = false
      clearVideoInterval()
      return
    }
    videoPlaying.value = true
    clearVideoInterval()
    videoInterval = setInterval(() => {
      if (videoProgress.value >= 100) {
        videoPlaying.value = false
        clearVideoInterval()
        return
      }
      videoProgress.value += 0.5
    }, 200)
  }

  function goToStep(step) {
    const query = { ...getAttributionQuery() }
    const fromRoute = route.query.orderId
    const id =
      (typeof fromRoute === 'string' && isPersistedOrderId(fromRoute) && fromRoute) ||
      activeOrderId()
    if (id) query.orderId = String(id)
    router.push({ name: `quiz-step-${step}`, query })
  }

  function goNext() {
    if (!canProceed(currentStep.value)) return
    if (currentStep.value === 3) {
      startGeneration()
      return
    }
    goToStep(currentStep.value + 1)
  }

  function goBack() {
    if (currentStep.value > 1) goToStep(currentStep.value - 1)
  }

  async function goToPayment() {
    if (!canProceed(5)) return
    const id = activeOrderId()
    if (!id) return
    try {
      await updateQuizContact(id, {
        fullName: form.fullName,
        email: form.email,
        whatsapp: form.whatsapp,
        discreteMode: form.discreteMode,
      })
    } catch (err) {
      console.error('[FLUISOM] Erro ao salvar contato:', err.message)
    }
    goToStep(6)
  }

  function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '')
  }

  function syncPaymentAmountFromPreview(data) {
    if (data?.paymentAmount) {
      paymentAmount.value = Number(data.paymentAmount) || paymentAmount.value
    }
  }

  let paymentPollTimer = null
  let stepSixPollTimer = null

  function clearPaymentPoll() {
    if (paymentPollTimer) {
      clearInterval(paymentPollTimer)
      paymentPollTimer = null
    }
  }

  function clearStepSixPoll() {
    if (stepSixPollTimer) {
      clearInterval(stepSixPollTimer)
      stepSixPollTimer = null
    }
  }

  async function checkPaidAndAdvance() {
    const id = activeOrderId()
    if (!id) return false
    try {
      const status = await getQuizPaymentStatus(id)
      if (status.paid) {
        clearStepSixPoll()
        clearPaymentPoll()
        pixWaiting.value = false
        goToStep(7)
        return true
      }
    } catch {
      // ignora falha de verificação
    }
    return false
  }

  async function verifyPaymentAndAdvance() {
    if (verifyingPayment.value) return
    const id = activeOrderId()
    if (!id) {
      verifyMessage.value = 'Pedido inválido. Volte e tente novamente.'
      return
    }
    verifyingPayment.value = true
    verifyMessage.value = ''
    try {
      const advanced = await checkPaidAndAdvance()
      if (!advanced) {
        verifyMessage.value = 'Pagamento ainda não confirmado. Se você já pagou, aguarde alguns segundos e clique novamente.'
      }
    } catch {
      verifyMessage.value = 'Não foi possível verificar agora. Tente novamente em instantes.'
    } finally {
      verifyingPayment.value = false
    }
  }

  function startStepSixPaymentWatch() {
    clearStepSixPoll()
    stepSixPollTimer = setInterval(() => {
      if (Number(route.meta.step) !== 6) {
        clearStepSixPoll()
        return
      }
      void checkPaidAndAdvance()
    }, 5000)
  }

  async function pollPaymentUntilPaid(orderIdValue) {
    clearPaymentPoll()
    pixWaiting.value = true

    return new Promise((resolve, reject) => {
      let attempts = 0
      paymentPollTimer = setInterval(async () => {
        attempts += 1
        try {
          const status = await getQuizPaymentStatus(orderIdValue)
          if (status.paid) {
            clearPaymentPoll()
            pixWaiting.value = false
            resolve(status)
            return
          }
          if (status.status === 'rejected' || status.status === 'cancelled') {
            clearPaymentPoll()
            pixWaiting.value = false
            reject(new Error(status.message || 'Pagamento não aprovado'))
          }
          if (attempts >= 120) {
            clearPaymentPoll()
            pixWaiting.value = false
            reject(new Error('Tempo esgotado aguardando o pagamento PIX'))
          }
        } catch (err) {
          clearPaymentPoll()
          pixWaiting.value = false
          reject(err)
        }
      }, 3000)
    })
  }

  async function copyPixCode() {
    if (!pixData.value?.qrCode) return
    try {
      await navigator.clipboard.writeText(pixData.value.qrCode)
    } catch {
      // fallback silencioso
    }
  }

  async function confirmPayment() {
    const id = activeOrderId()
    if (!id) {
      paymentError.value = 'Pedido inválido. Volte e tente novamente.'
      return
    }

    paymentError.value = ''
    paymentLoading.value = true

    try {
      if (previewData.value?.paid) {
        goToStep(7)
        return
      }

      if (payment.method === 'pix') {
        const cpf = digitsOnly(payment.cpf)
        if (cpf.length < 11) {
          paymentError.value = 'Informe um CPF/CNPJ válido para pagar com PIX.'
          return
        }

        const result = await createQuizPayment(id, {
          method: 'pix',
          cpf,
        })

        pixData.value = {
          qrCode: result.qrCode,
          qrCodeBase64: result.qrCodeBase64,
          paymentId: result.paymentId,
        }

        await pollPaymentUntilPaid(id)
        goToStep(7)
        return
      }

      const cpf = digitsOnly(payment.cardCpf)
      const cardNumber = digitsOnly(payment.cardNumber)
      if (cardNumber.length < 13) {
        paymentError.value = 'Informe o número do cartão completo.'
        return
      }
      if (!payment.cardExpiry || payment.cardExpiry.length < 5) {
        paymentError.value = 'Informe a validade do cartão.'
        return
      }
      if (!payment.cardCvv || payment.cardCvv.length < 3) {
        paymentError.value = 'Informe o CVV do cartão.'
        return
      }
      if (!payment.cardName.trim()) {
        paymentError.value = 'Informe o nome impresso no cartão.'
        return
      }
      if (cpf.length < 11) {
        paymentError.value = 'Informe o CPF do titular do cartão.'
        return
      }

      const tokenData = await createCardToken(payment)
      const result = await createQuizPayment(id, {
        method: 'card',
        cpf,
        cardToken: tokenData.token,
        paymentMethodId: tokenData.paymentMethodId,
        issuerId: tokenData.issuerId,
        installments: 1,
      })

      if (result.paid) {
        goToStep(7)
        return
      }

      if (result.status === 'pending' || result.status === 'in_process') {
        await pollPaymentUntilPaid(id)
        goToStep(7)
        return
      }

      paymentError.value = result.statusDetail || 'Pagamento não aprovado. Verifique os dados do cartão.'
    } catch (err) {
      paymentError.value = err.message || 'Não foi possível processar o pagamento.'
    } finally {
      paymentLoading.value = false
    }
  }

  function resetQuiz() {
    resetQuizState()
    audioPlaying.value = false
    audioProgress.value = 0
    audioLocked.value = true
    videoPlaying.value = false
    videoProgress.value = 0
    cardFlipped.value = false
    showConfetti.value = false
    clearAudioInterval()
    clearVideoInterval()
    beginNewQuizSession()
    router.push({ name: 'quiz-step-1', query: { novo: '1', ...getAttributionQuery() } })
  }

  function maskCpf(value) {
    const d = value.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  }

  function maskCardNumber(value) {
    const d = value.replace(/\D/g, '').slice(0, 16)
    return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
  }

  function maskExpiry(value) {
    const d = value.replace(/\D/g, '').slice(0, 4)
    if (d.length <= 2) return d
    return `${d.slice(0, 2)}/${d.slice(2)}`
  }

  function onCpfInput(e, target = 'cpf') {
    const val = maskCpf(e.target.value)
    if (target === 'cpf') payment.cpf = val
    else payment.cardCpf = val
    e.target.value = val
  }

  function onCardNumberInput(e) {
    payment.cardNumber = maskCardNumber(e.target.value)
    e.target.value = payment.cardNumber
  }

  function onExpiryInput(e) {
    payment.cardExpiry = maskExpiry(e.target.value)
    e.target.value = payment.cardExpiry
  }

  function onCvvInput(e) {
    payment.cardCvv = e.target.value.replace(/\D/g, '').slice(0, 4)
    e.target.value = payment.cardCvv
  }

  function onWhatsappInput(e) {
    form.whatsapp = maskWhatsapp(e.target.value)
    e.target.value = form.whatsapp
  }

  watch(orderId, (id) => {
    if (!isPersistedOrderId(id)) return
    setPersistOrderId(id)
    persistQuizNow()
  })

  watch(
    () => route.query.orderId,
    async (id) => {
      if (!id || typeof id !== 'string' || !isPersistedOrderId(id)) return
      orderId.value = id
      setPersistOrderId(id)
      persistQuizNow()
      const savedEmail = sessionStorage.getItem('fluisom_orders_email')
      if (savedEmail && !form.email) {
        form.email = savedEmail
        persistQuizNow()
      }
      await loadPreview()
      if (Number(route.meta.step) === 6) {
        await ensureContactSaved()
      }
    },
    { immediate: true },
  )

  watch(
    () => route.meta.step,
    async (step) => {
      window.scrollTo({ top: 0, behavior: 'smooth' })

      if (step === 1 && route.query.novo === '1') {
        beginNewQuizSession()
        const nextQuery = { ...route.query }
        delete nextQuery.novo
        router.replace({ name: route.name, query: nextQuery })
      }

      if (step !== 6) {
        clearStepSixPoll()
      }

      if (step === 4 && activeOrderId() && !pollTimer && !generationLoading.value) {
        resumeGenerationIfNeeded()
      }
      if ((step === 5 || step === 6) && !previewData.value && activeOrderId()) {
        await loadPreview()
      }
      if (step === 6 && route.query.orderId && form.email) {
        await ensureContactSaved()
      }
      if (step === 6 && activeOrderId()) {
        const advanced = await checkPaidAndAdvance()
        if (!advanced) startStepSixPaymentWatch()
      }
      if (step === 7) showConfetti.value = true
    },
    { immediate: true },
  )

  onUnmounted(() => {
    clearAudioInterval()
    clearVideoInterval()
    clearPollTimer()
    clearPaymentPoll()
    clearStepSixPoll()
  })

  return {
    form,
    payment,
    relationships,
    genres,
    testimonials,
    guarantees,
    confettiEmojis,
    currentStep,
    orderId,
    audioPlaying,
    audioProgress,
    audioLocked,
    videoPlaying,
    videoProgress,
    cardFlipped,
    showConfetti,
    waveHeights,
    videoWaveBars,
    genreLabel,
    relationshipLabel,
    progressPercent,
    honoredDisplay,
    cardLastFour,
    paymentAmount,
    paymentAmountLabel,
    paymentLoading,
    paymentError,
    pixData,
    pixWaiting,
    verifyingPayment,
    verifyMessage,
    verifyPaymentAndAdvance,
    audioTimeDisplay,
    playedBars,
    qualitiesProgress,
    momentsProgress,
    canProceed,
    toggleAudio,
    toggleVideo,
    goNext,
    goBack,
    goToPayment,
    confirmPayment,
    copyPixCode,
    resetQuiz,
    goToStep,
    onCpfInput,
    onCardNumberInput,
    onExpiryInput,
    onCvvInput,
    onWhatsappInput,
    generationProgress,
    generationStatus,
    generationStatusLabel,
    generationError,
    generationLoading,
    previewData,
    previewAudioEl,
    previewLoading,
    startGeneration,
    loadPreview,
  }
}
