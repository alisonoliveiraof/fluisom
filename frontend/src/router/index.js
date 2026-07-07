import { createRouter, createWebHistory } from 'vue-router'
import QuizLayout from '../layouts/QuizLayout.vue'
import { canProceed, maxReachableStep } from '../quiz/quizState'
import { SITE_TITLE } from '../constants'
import { captureAttribution, ATTRIBUTION_KEYS } from '../utils/attribution'

function keepAttributionQuery(query = {}) {
  const kept = {}
  for (const key of ATTRIBUTION_KEYS) {
    if (query[key]) kept[key] = query[key]
  }
  return kept
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminPanel.vue'),
    },
    {
      path: '/pv',
      name: 'sales',
      component: () => import('../pv/SalesPage.vue'),
    },
    {
      path: '/meus-pedidos',
      name: 'my-orders',
      component: () => import('../views/MyOrders.vue'),
    },
    {
      path: '/',
      component: QuizLayout,
      children: [
        { path: '', redirect: (to) => ({ path: '/pv', query: to.query }) },
        { path: 'passo/1', name: 'quiz-step-1', meta: { step: 1 }, component: () => import('../views/quiz/Step1View.vue') },
        { path: 'passo/2', name: 'quiz-step-2', meta: { step: 2 }, component: () => import('../views/quiz/Step2View.vue') },
        { path: 'passo/3', name: 'quiz-step-3', meta: { step: 3 }, component: () => import('../views/quiz/Step3View.vue') },
        { path: 'passo/4', name: 'quiz-step-4', meta: { step: 4 }, component: () => import('../views/quiz/Step4View.vue') },
        { path: 'passo/5', name: 'quiz-step-5', meta: { step: 5 }, component: () => import('../views/quiz/Step5View.vue') },
        { path: 'passo/6', name: 'quiz-step-6', meta: { step: 6 }, component: () => import('../views/quiz/Step6View.vue') },
        { path: 'passo/7', name: 'quiz-step-7', meta: { step: 7 }, component: () => import('../views/quiz/Step7View.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: (to) => ({ path: '/pv', query: to.query }) },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  document.title = to.meta?.documentTitle || SITE_TITLE
})

router.beforeEach((to, from, next) => {
  captureAttribution(to.query)

  const attribution = keepAttributionQuery(to.query)
  const targetStep = to.meta.step
  if (!targetStep) return next()

  // Retorno via Meus Pedidos: pedido existente pode ir direto ao passo 5 ou 6
  if (to.query.orderId && targetStep >= 5 && targetStep <= 6) {
    return next()
  }

  const fromStep = from.meta.step ?? 0

  if (fromStep && targetStep > fromStep + 1) {
    const allowed = fromStep + (canProceed(fromStep) ? 1 : 0)
    return next({ name: `quiz-step-${allowed}`, query: attribution })
  }

  if (targetStep > 1) {
    for (let step = 1; step < targetStep; step++) {
      if (!canProceed(step)) {
        return next({ name: `quiz-step-${step}`, query: attribution })
      }
    }
  }

  if (targetStep === 7 && fromStep !== 6) {
    return next({ name: `quiz-step-${maxReachableStep()}`, query: attribution })
  }

  next()
})

export default router
