import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (process.env.VERCEL !== '1') {
  dotenv.config({ path: join(__dirname, '../../.env') })
  dotenv.config({ path: join(__dirname, '../../../backend/.env') })
}

function normalizeOrigin(url) {
  if (!url) return ''
  const trimmed = url.trim().replace(/\/$/, '')
  try {
    const parsed = new URL(trimmed)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return trimmed
  }
}

function resolveBackendUrl() {
  if (process.env.BACKEND_URL) return normalizeOrigin(process.env.BACKEND_URL)

  if (process.env.VERCEL === '1') {
    const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
    if (host) return normalizeOrigin(`https://${host.replace(/^https?:\/\//, '')}`)
  }

  return 'http://localhost:3001'
}

function resolveFrontendUrls() {
  const defaults = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://fluisom.vercel.app',
    'https://fluisom.com',
    'https://www.fluisom.com',
  ].join(',')
  const raw = process.env.FRONTEND_URL || defaults
  const urls = [...new Set(raw.split(',').map(normalizeOrigin).filter(Boolean))]

  if (process.env.VERCEL === '1' && process.env.VERCEL_URL) {
    const vercelOrigin = normalizeOrigin(`https://${process.env.VERCEL_URL.replace(/^https?:\/\//, '')}`)
    if (!urls.includes(vercelOrigin)) urls.push(vercelOrigin)
  }

  return urls
}

const frontendUrls = resolveFrontendUrls()

export const env = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrls,
  frontendUrl: frontendUrls[0],
  backendUrl: resolveBackendUrl(),

  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openaiMaxTokens: Number(process.env.OPENAI_MAX_TOKENS) || 2000,
  openaiTimeoutMs: Number(process.env.OPENAI_TIMEOUT_MS) || (process.env.VERCEL === '1' ? 55000 : 90000),
  maxGenerationRetries: Number(process.env.MAX_GENERATION_RETRIES) || 3,

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

}

export function assertEnv() {
  const required = ['supabaseUrl', 'supabaseServiceRoleKey', 'openaiApiKey', 'sunoApiKey']
  const missing = required.filter((key) => !env[key])
  if (missing.length) {
    console.warn('[FLUISOM] Variáveis ausentes no .env:', missing.join(', '))
  }
}
