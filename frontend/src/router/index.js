import { createRouter, createWebHistory } from 'vue-router'
import QuizLayout from '../layouts/QuizLayout.vue'
import { canProceed, maxReachableStep } from '../quiz/quizState'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/pv',
      name: 'sales',
      component: () => import('../pv/SalesPage.vue'),
    },
    {
      path: '/',
      component: QuizLayout,
      children: [
        { path: '', redirect: '/pv' },
        { path: 'passo/1', name: 'quiz-step-1', meta: { step: 1 }, component: () => import('../views/quiz/Step1View.vue') },
        { path: 'passo/2', name: 'quiz-step-2', meta: { step: 2 }, component: () => import('../views/quiz/Step2View.vue') },
        { path: 'passo/3', name: 'quiz-step-3', meta: { step: 3 }, component: () => import('../views/quiz/Step3View.vue') },
        { path: 'passo/4', name: 'quiz-step-4', meta: { step: 4 }, component: () => import('../views/quiz/Step4View.vue') },
        { path: 'passo/5', name: 'quiz-step-5', meta: { step: 5 }, component: () => import('../views/quiz/Step5View.vue') },
        { path: 'passo/6', name: 'quiz-step-6', meta: { step: 6 }, component: () => import('../views/quiz/Step6View.vue') },
        { path: 'passo/7', name: 'quiz-step-7', meta: { step: 7 }, component: () => import('../views/quiz/Step7View.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/pv' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to, from, next) => {
  const targetStep = to.meta.step
  if (!targetStep) return next()

  const fromStep = from.meta.step ?? 0

  if (fromStep && targetStep > fromStep + 1) {
    const allowed = fromStep + (canProceed(fromStep) ? 1 : 0)
    return next({ name: `quiz-step-${allowed}` })
  }

  if (targetStep > 1) {
    for (let step = 1; step < targetStep; step++) {
      if (!canProceed(step)) {
        return next({ name: `quiz-step-${step}` })
      }
    }
  }

  if (targetStep === 7 && fromStep !== 6) {
    return next({ name: `quiz-step-${maxReachableStep()}` })
  }

  next()
})

export default router
