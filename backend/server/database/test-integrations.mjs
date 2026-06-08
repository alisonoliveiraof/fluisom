import dotenv from 'dotenv'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../../.env') })

console.log('[FLUISOM] Testando integrações...\n')

async function testOpenAI() {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      input: 'Responda apenas: OK',
      max_output_tokens: 20,
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`OpenAI: ${body.error?.message || res.status}`)
  console.log('✅ OpenAI OK')
}

async function testSuno() {
  const res = await fetch(`${process.env.SUNO_BASE_URL}/api/v1/generate/record-info?taskId=test`, {
    headers: { Authorization: `Bearer ${process.env.SUNO_API_KEY}` },
  })
  const body = await res.json()
  // 400/404 for invalid taskId is fine — means auth works
  if (body.code === 401) throw new Error('Suno: unauthorized')
  console.log('✅ Suno API OK (auth)', body.code, body.msg?.slice?.(0, 40))
}

async function testSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/bucket`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`Supabase storage: ${res.status}`)
  const buckets = await res.json()
  console.log('✅ Supabase Storage OK — buckets:', buckets.map((b) => b.name).join(', '))

  const orders = await fetch(`${process.env.SUPABASE_URL}/rest/v1/quiz_orders?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  if (orders.ok) {
    console.log('✅ Supabase quiz_orders table OK')
  } else {
    console.log('⚠️  quiz_orders ainda não existe — rode npm run setup:supabase com SUPABASE_DB_PASSWORD')
  }
}

async function testQuizStart() {
  const res = await fetch('http://localhost:3001/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      relationship: 'mae',
      honoredName: 'Maria Teste',
      specialQualities: 'Ela é carinhosa, dedicada e sempre presente na minha vida com muito amor.',
      specialMoments: 'Lembro quando ela me abraçou no meu aniversário e cantou parabéns com lágrimas nos olhos.',
      genre: 'romantico',
      voice: 'feminino',
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`Quiz start: ${body.message}`)
  console.log('✅ Quiz start OK — orderId:', body.orderId)
  return body.orderId
}

async function main() {
  await testOpenAI()
  await testSuno()
  await testSupabase()
  try {
    const orderId = await testQuizStart()
    console.log('\n[FLUISOM] Aguardando 15s e consultando status...')
    await new Promise((r) => setTimeout(r, 15000))
    const status = await fetch(`http://localhost:3001/api/quiz/status/${orderId}`)
    console.log('Status:', await status.json())
  } catch (err) {
    console.log('⚠️  Quiz flow:', err.message)
  }
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
