import pg from 'pg'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, 'migrations.sql'), 'utf8')

const hosts = [
  'db.wzajwzuagtereqdgkyxn.supabase.co',
  'aws-0-sa-east-1.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
]

async function tryConnect(config) {
  const client = new pg.Client({ ...config, ssl: { rejectUnauthorized: false } })
  await client.connect()
  return client
}

async function main() {
  const password = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD
  if (!password) {
    console.log('SUPABASE_DB_PASSWORD não definida — tentando pooler com variáveis comuns...')
  }

  const passwords = password ? [password] : ['postgres', 'fluisom', 'Fluisom2025', '']

  for (const host of hosts) {
    for (const pwd of passwords) {
      const config = host.includes('pooler')
        ? { host, port: 6543, database: 'postgres', user: 'postgres.wzajwzuagtereqdgkyxn', password: pwd }
        : { host, port: 5432, database: 'postgres', user: 'postgres', password: pwd }

      try {
        console.log(`Tentando ${config.user}@${host}...`)
        const client = await tryConnect(config)
        await client.query(sql)
        await client.end()
        console.log('Migration OK via', host)
        return
      } catch (err) {
        console.log('Falhou:', err.message.slice(0, 80))
      }
    }
  }
  throw new Error('Não foi possível conectar ao Postgres. Defina SUPABASE_DB_PASSWORD no .env (Settings → Database no Supabase).')
}

main().catch((e) => { console.error(e.message); process.exit(1) })
