import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../../.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'fluisom-musics'
const POOLER_HOST = process.env.SUPABASE_POOLER_HOST || 'aws-1-us-east-1.pooler.supabase.com'
const PROJECT_REF = 'wzajwzuagtereqdgkyxn'

async function checkTablesViaRest() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_orders?select=id&limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  return res.ok
}

async function runMigration() {
  const password = process.env.SUPABASE_DB_PASSWORD
  if (!password) {
    throw new Error(
      'Defina SUPABASE_DB_PASSWORD no backend/.env (Supabase Dashboard → Project Settings → Database → Database password)',
    )
  }

  const sql = readFileSync(join(__dirname, 'migrations.sql'), 'utf8')
  const client = new pg.Client({
    host: POOLER_HOST,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  try {
    await client.query(sql)
    console.log('[FLUISOM] Migration SQL executada com sucesso')
  } finally {
    await client.end()
  }
}

async function ensureStorageBucket() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error(error.message)
    console.log(`[FLUISOM] Bucket "${BUCKET}" criado`)
  } else {
    console.log(`[FLUISOM] Bucket "${BUCKET}" OK`)
  }
}

async function main() {
  if (!(await checkTablesViaRest())) {
    await runMigration()
    if (!(await checkTablesViaRest())) {
      throw new Error('Tabelas não acessíveis após migration')
    }
  } else {
    console.log('[FLUISOM] Tabelas já existem')
  }
  await ensureStorageBucket()
  console.log('[FLUISOM] Setup concluído')
}

main().catch((err) => {
  console.error('[FLUISOM]', err.message)
  process.exit(1)
})
