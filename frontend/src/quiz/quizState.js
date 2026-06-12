import { reactive, watch } from 'vue'
import { relationships, genres } from '../data/quizData'
import { clearQuizDraft, loadQuizDraft, saveQuizDraft } from './quizPersistence'
import { maskWhatsapp } from '../utils/masks'

export const initialForm = () => ({
  relationship: '',
  customRelationship: '',
  honoredName: '',
  specialQualities: '',
  specialMoments: '',
  specialMessage: '',
  genre: '',
  voice: '',
  fullName: '',
  email: '',
  whatsapp: '',
  discreteMode: false,
})

export const initialPayment = () => ({
  method: 'pix',
  cpf: '',
  cardNumber: '',
  cardExpiry: '',
  cardCvv: '',
  cardName: '',
  cardCpf: '',
  cardCpfType: 'cpf',
})

export const form = reactive(initialForm())
export const payment = reactive(initialPayment())

export function isPersistedOrderId(id) {
  return !!id && !String(id).startsWith('FS-')
}

const savedDraft = loadQuizDraft()
if (savedDraft?.orderId && !isPersistedOrderId(savedDraft.orderId)) {
  savedDraft.orderId = null
  saveQuizDraft(savedDraft)
}

if (savedDraft?.form) {
  Object.assign(form, initialForm(), savedDraft.form)
  if (form.whatsapp) form.whatsapp = maskWhatsapp(form.whatsapp)
}
if (savedDraft?.payment) {
  Object.assign(payment, initialPayment(), savedDraft.payment)
}

export function getSavedOrderId() {
  const id = savedDraft?.orderId || null
  return isPersistedOrderId(id) ? id : null
}

let persistOrderId = savedDraft?.orderId || null
let persistTimer = null

export function setPersistOrderId(id) {
  persistOrderId = id
}

export function persistQuizNow() {
  saveQuizDraft({
    form: { ...form },
    payment: { ...payment },
    orderId: persistOrderId,
    savedAt: Date.now(),
  })
}

export function scheduleQuizPersist() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(persistQuizNow, 300)
}

watch(form, scheduleQuizPersist, { deep: true })
watch(payment, scheduleQuizPersist, { deep: true })

export function canProceed(step) {
  if (step === 1) {
    if (!form.relationship || !form.honoredName.trim()) return false
    if (form.relationship === 'outro' && !form.customRelationship.trim()) return false
    return true
  }
  if (step === 2) {
    return form.specialQualities.length >= 20 && form.specialMoments.length >= 20
  }
  if (step === 3) return !!form.genre && !!form.voice
  if (step === 4) return true
  if (step === 5) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return !!form.fullName.trim() && emailRe.test(form.email)
  }
  return false
}

export function resetQuizState() {
  Object.assign(form, initialForm())
  Object.assign(payment, initialPayment())
  clearQuizDraft()
}

export function getRelationshipLabel() {
  if (form.relationship === 'outro') return form.customRelationship || 'Outro'
  const r = relationships.find((x) => x.value === form.relationship)
  return r ? r.label : '—'
}

export function getGenreLabel() {
  const g = genres.find((x) => x.value === form.genre)
  return g ? g.label : '—'
}

export function maxReachableStep() {
  for (let step = 1; step <= 6; step++) {
    if (!canProceed(step)) return step
  }
  return 7
}
