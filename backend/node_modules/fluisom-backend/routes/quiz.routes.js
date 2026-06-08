import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { startQuiz, getQuizStatus, getQuizPreview, updateContact } from '../controllers/quiz.controller.js'
import { validateQuizStart, validateContactUpdate } from '../middleware/validate.middleware.js'

const router = Router()

const startLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: true, message: 'Muitas tentativas de início. Tente novamente em 1 hora.', code: 'RATE_LIMIT' },
})

const pollLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: true, message: 'Muitas consultas. Aguarde um momento.', code: 'RATE_LIMIT' },
})

router.post('/start', startLimiter, validateQuizStart, startQuiz)
router.get('/status/:orderId', pollLimiter, getQuizStatus)
router.get('/preview/:orderId', pollLimiter, getQuizPreview)
router.patch('/:orderId/contact', pollLimiter, validateContactUpdate, updateContact)

export default router
