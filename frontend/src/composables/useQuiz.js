import { ref, computed, watch, onUnmounted, inject, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  startQuiz,
  generateQuizLyrics,
  submitQuizMusic,
  getQuizStatus,
  getQuizPreview,
  updateQuizContact,
} from '../services/api.service'

const QUIZ_KEY = Symbol('quiz')

import {
  form,
  payment,
  canProceed,
  resetQuizState,
  getRelationshipLabel,
  getGenreLabel,
  getSavedOrderId,
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

  const orderId = ref(getSavedOrderId() || 'FS-' + Math.random().toString(36).substr(2, 8).toUpperCase())
  setPersistOrderId(orderId.value)
  persistQuizNow()
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

  const waveHeights = Array.from({ length: 40 }, () => Math.floor(Math.random() * 40 + 8))
  const qrPattern = Array.from({ length: 64 }, () => Math.random() > 0.45)
  const videoWaveBars = Array.from({ length: 20 }, (_, i) => i)

  let audioInterval = null
  let videoInterval = null
  let pollTimer = null

  const currentStep = computed(() => Number(route.meta.step) || 1)

  const genreLabel = computed(() => getGenreLabel())
  const relationshipLabel = computed(() => getRelationshipLabel())
  const progressPercent = computed(() => ((currentStep.value - 1) / 6) * 100)
  const honoredDisplay = computed(() => form.honoredName.trim() || 'essa pessoa')

  const cardLastFour = computed(() => {
    const digits = payment.cardNumber.replace(/\D/g, '')
    return digits.slice(-4) || '••••'
  })

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
    if (!orderId.value) return
    try {
      const status = await getQuizStatus(orderId.value)
      generationProgress.value = Math.max(0, status.progress ?? 0)
      generationStatus.value = status.status
      generationStatusLabel.value = status.statusLabel || generationStatusLabel.value

      if (status.status === 'music_ready' || status.status === 'preview_shown') {
        clearPollTimer()
        await loadPreview()
        if (Number(route.meta.step) === 4) {
          goToStep(5)
        }
      } else if (status.status === 'failed') {
        clearPollTimer()
        generationError.value = status.errorMessage || 'Erro na geração da música'
      }
    } catch (err) {
      generationError.value = err.message
    }
  }

  function startGenerationPolling() {
    clearPollTimer()
    pollGenerationStatus()
    pollTimer = setInterval(pollGenerationStatus, 3000)
  }

  async function resumeGenerationIfNeeded() {
    if (!orderId.value || generationLoading.value) return

    try {
      const status = await getQuizStatus(orderId.value)
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
        await submitQuizMusic(orderId.value)
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
        await generateQuizLyrics(orderId.value)
        generationStatusLabel.value = '🎧 Enviando para produção musical...'
        await submitQuizMusic(orderId.value)
        startGenerationPolling()
      }
    } catch (err) {
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
    if (!orderId.value || !form.email) return
    try {
      await updateQuizContact(orderId.value, {
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
    if (!orderId.value) return
    previewLoading.value = true
    try {
      const preview = await getQuizPreview(orderId.value)
      previewData.value = preview
      hydrateFormFromOrder(preview)
      generationProgress.value = 100
      generationStatus.value = preview.status || 'preview_shown'
      generationStatusLabel.value = '✨ Sua música está pronta!'
      if (preview.previewAudioUrl) {
        audioLocked.value = false
      }
    } catch (err) {
      generationError.value = err.message
    } finally {
      previewLoading.value = false
    }
  }

  async function startGeneration() {
    if (!canProceed(3) || generationLoading.value) return
    generationLoading.value = true
    generationError.value = null
    generationProgress.value = 0
    generationStatus.value = 'pending'
    generationStatusLabel.value = 'Preparando sua história...'

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
    const query = {}
    const id = route.query.orderId || orderId.value
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
    try {
      await updateQuizContact(orderId.value, {
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

  function confirmPayment() {
    goToStep(7)
  }

  function resetQuiz() {
    resetQuizState()
    orderId.value = 'FS-' + Math.random().toString(36).substr(2, 8).toUpperCase()
    setPersistOrderId(orderId.value)
    audioPlaying.value = false
    audioProgress.value = 0
    audioLocked.value = true
    videoPlaying.value = false
    videoProgress.value = 0
    cardFlipped.value = false
    showConfetti.value = false
    generationProgress.value = 0
    generationStatus.value = 'pending'
    generationStatusLabel.value = 'Preparando sua história...'
    generationError.value = null
    generationLoading.value = false
    previewData.value = null
    clearAudioInterval()
    clearVideoInterval()
    clearPollTimer()
    goToStep(1)
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
    setPersistOrderId(id)
    persistQuizNow()
  })

  watch(
    () => route.query.orderId,
    async (id) => {
      if (!id || typeof id !== 'string') return
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
      if (step === 4 && orderId.value && !pollTimer && !generationLoading.value) {
        resumeGenerationIfNeeded()
      }
      if ((step === 5 || step === 6) && !previewData.value && orderId.value) {
        await loadPreview()
      }
      if (step === 6 && route.query.orderId && form.email) {
        await ensureContactSaved()
      }
      if (step === 7) showConfetti.value = true
    },
  )

  onUnmounted(() => {
    clearAudioInterval()
    clearVideoInterval()
    clearPollTimer()
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
    qrPattern,
    videoWaveBars,
    genreLabel,
    relationshipLabel,
    progressPercent,
    honoredDisplay,
    cardLastFour,
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
