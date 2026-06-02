import { ref, computed, watch, onUnmounted, inject, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'

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

  const waveHeights = Array.from({ length: 40 }, () => Math.floor(Math.random() * 40 + 8))
  const qrPattern = Array.from({ length: 64 }, () => Math.random() > 0.45)
  const videoWaveBars = Array.from({ length: 20 }, (_, i) => i)

  let audioInterval = null
  let videoInterval = null

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

  function toggleAudio() {
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
    router.push({ name: `quiz-step-${step}` })
  }

  function goNext() {
    if (!canProceed(currentStep.value)) return
    goToStep(currentStep.value + 1)
  }

  function goBack() {
    if (currentStep.value > 1) goToStep(currentStep.value - 1)
  }

  function goToPayment() {
    if (!canProceed(5)) return
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
    clearAudioInterval()
    clearVideoInterval()
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
    () => route.meta.step,
    (step) => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      if (step === 7) showConfetti.value = true
    },
  )

  onUnmounted(() => {
    clearAudioInterval()
    clearVideoInterval()
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
  }
}
