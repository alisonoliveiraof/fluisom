import { env } from '../config/env.js'

/**
 * Gera letra via OpenAI Responses API (DocumentationGPT.md).
 * POST https://api.openai.com/v1/responses
 */
export async function generateLyrics(prompt) {
  const started = Date.now()
  console.log('[FLUISOM] Iniciando geração de letra via OpenAI Responses API')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), env.openaiTimeoutMs)

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: env.openaiModel,
        input: prompt,
        store: true,
        max_output_tokens: env.openaiMaxTokens,
        temperature: 0.85,
      }),
      signal: controller.signal,
    })

    const body = await response.json()

    if (!response.ok) {
      throw new Error(body.error?.message || body.message || `OpenAI HTTP ${response.status}`)
    }

    const text = extractResponseText(body)
    if (!text?.trim()) {
      throw new Error('OpenAI retornou resposta vazia')
    }

    console.log(`[FLUISOM] Letra gerada em ${Date.now() - started}ms`)
    return { text: text.trim(), durationMs: Date.now() - started, raw: body }
  } finally {
    clearTimeout(timeout)
  }
}

function extractResponseText(body) {
  if (typeof body.output_text === 'string') return body.output_text

  if (Array.isArray(body.output)) {
    const parts = []
    for (const item of body.output) {
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (const block of item.content) {
          if (block.type === 'output_text' && block.text) parts.push(block.text)
          if (block.type === 'text' && block.text) parts.push(block.text)
        }
      }
      if (item.type === 'output_text' && item.text) parts.push(item.text)
    }
    if (parts.length) return parts.join('\n')
  }

  if (body.choices?.[0]?.message?.content) return body.choices[0].message.content
  return null
}

export async function withRetry(fn, maxRetries = env.maxGenerationRetries) {
  let lastError
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastError = err
      if (attempt < maxRetries - 1) {
        const delay = 2000 * 2 ** attempt
        console.warn(`[FLUISOM] Retry ${attempt + 1}/${maxRetries} em ${delay}ms:`, err.message)
        await sleep(delay)
      }
    }
  }
  throw lastError
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
