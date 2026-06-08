import { generateLyrics, withRetry } from '../services/openai.service.js'
import { buildLyricsPrompt } from '../utils/prompt.builder.js'
import { getOrderById, updateOrder, insertGenerationLog } from '../services/supabase.service.js'

export async function generateLyricsForOrder(orderId) {
  const order = await getOrderById(orderId)
  const prompt = buildLyricsPrompt(order)

  await updateOrder(orderId, { status: 'generating_lyrics' })
  await insertGenerationLog({
    order_id: orderId,
    step: 'lyrics',
    status: 'started',
    message: 'Iniciando geração de letra',
    payload: { model: process.env.OPENAI_MODEL },
  })

  try {
    const result = await withRetry(async (attempt) => {
      if (attempt > 0) {
        await insertGenerationLog({
          order_id: orderId,
          step: 'lyrics',
          status: 'retry',
          message: `Tentativa ${attempt + 1}`,
        })
      }
      return generateLyrics(prompt)
    })

    const updated = await updateOrder(orderId, {
      status: 'lyrics_ready',
      generated_lyrics: result.text,
      lyrics_generated_at: new Date().toISOString(),
      lyrics_prompt_used: prompt,
    })

    await insertGenerationLog({
      order_id: orderId,
      step: 'lyrics',
      status: 'success',
      message: 'Letra gerada com sucesso',
      duration_ms: result.durationMs,
    })

    return updated
  } catch (err) {
    await updateOrder(orderId, {
      status: 'failed',
      error_message: err.message,
      last_error_at: new Date().toISOString(),
    })
    await insertGenerationLog({
      order_id: orderId,
      step: 'lyrics',
      status: 'error',
      message: err.message,
    })
    throw err
  }
}
