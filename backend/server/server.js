import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { assertEnv, env } from './config/env.js'
import quizRoutes from './routes/quiz.routes.js'
import adminRoutes from './routes/admin.routes.js'
import webhookRoutes from './routes/webhook.routes.js'
import cronRoutes from './routes/cron.routes.js'
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js'

assertEnv()

const app = express()

app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.frontendUrls.includes(origin)) {
      callback(null, origin || env.frontendUrls[0])
    } else {
      console.warn('[FLUISOM] CORS bloqueado para origem:', origin)
      callback(new Error(`Origem não permitida: ${origin}`))
    }
  },
  credentials: true,
}))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'fluisom-backend', serverless: process.env.VERCEL === '1' })
})

app.use('/api/quiz', quizRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/cron', cronRoutes)

app.use(notFoundMiddleware)
app.use(errorMiddleware)

if (process.env.VERCEL !== '1') {
  const server = app.listen(env.port, () => {
    console.log(`[FLUISOM] Servidor rodando em http://localhost:${env.port}`)
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[FLUISOM] Porta ${env.port} já está em uso. Encerre o processo anterior ou altere PORT no .env`)
      console.error(`[FLUISOM] Windows: Get-NetTCPConnection -LocalPort ${env.port} | Stop-Process -Id {OwningProcess} -Force`)
      process.exit(1)
    }
    throw err
  })
}

export default app
