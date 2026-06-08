import pg from 'pg'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, 'migrations.sql'), 'utf8')
const ref = 'wzajwzuagtereqdgkyxn'

const configs = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres' },
  { host: `db.${ref}.supabase.co`, port: 6543, user: 'postgres' },
  { host: `db.${ref}.supabase.co`, port: 5432, user: `postgres.${ref}` },
  { host: 'aws-1-us-east-1.pooler.supabase.com', port: 6543, user: `postgres.${ref}` },
  { host: 'aws-1-eu-central-1.pooler.supabase.com', port: 6543, user: `postgres.${ref}` },
  { host: 'aws-1-ap-southeast-1.pooler.supabase.com', port: 6543, user: `postgres.${ref}` },
]

const passwords = process.env.SUPABASE_DB_PASSWORD ? [process.env.SUPABASE_DB_PASSWORD] : ['']

async function main() {
  for (const base of configs) {
    for (const password of passwords) {
      const client = new pg.Client({
        ...base,
        database: 'postgres',
        password,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      })
      try {
        console.log(`Trying ${base.user}@${base.host}:${base.port}`)
        await client.connect()
        await client.query(sql)
        await client.end()
        console.log('SUCCESS')
        return
      } catch (err) {
        console.log(' ->', err.message.slice(0, 100))
      }
    }
  }
}

main()
