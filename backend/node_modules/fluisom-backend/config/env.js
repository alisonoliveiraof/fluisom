import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../../.env') })

export const env = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',

  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openaiMaxTokens: Number(process.env.OPENAI_MAX_TOKENS) || 2000,

  sunoApiKey: process.env.SUNO_API_KEY,
  sunoBaseUrl: process.env.SUNO_BASE_URL || 'https://api.sunoapi.org',
  sunoModel: process.env.SUNO_MODEL || 'V4_5ALL',
  sunoPollIntervalMs: Number(process.env.SUNO_POLL_INTERVAL_MS) || 5000,
  sunoMaxPollAttempts: Number(process.env.SUNO_MAX_POLL_ATTEMPTS) || 60,

  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'fluisom-musics',

  adminSecretKey: process.env.ADMIN_SECRET_KEY || 'fluisom_admin_2025',
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || 'fluisom_jwt_change_me',

  maxGenerationRetries: Number(process.env.MAX_GENERATION_RETRIES) || 3,
}

export function assertEnv() {
  const required = ['supabaseUrl', 'supabaseServiceRoleKey', 'openaiApiKey', 'sunoApiKey']
  const missing = required.filter((key) => !env[key])
  if (missing.length) {
    console.warn('[FLUISOM] Variáveis ausentes no .env:', missing.join(', '))
  }
}
