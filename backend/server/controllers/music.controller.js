import {
  submitMusicGeneration,
  pollUntilComplete,
  getMusicGenerationDetails,
  pickBestClip,
  getClipAudioUrl,
  getClipImageUrl,
  isSunoComplete,
  isSunoStreamReady,
} from '../services/suno.service.js'
import { withRetry } from '../services/openai.service.js'
import { uploadAudioFromUrl, uploadCoverFromUrl } from '../services/storage.service.js'
import { buildMusicTitle, getGenreStyle } from '../utils/prompt.builder.js'
import { getOrderById, updateOrder, insertGenerationLog } from '../services/supabase.service.js'
import { env } from '../config/env.js'
import { isServerless } from '../utils/background.js'

export async function finalizeMusicFromDetails(orderId, details, { title, style } = {}) {
  const order = await getOrderById(orderId)
  const clip = pickBestClip(details)
  if (!clip) throw new Error('Suno não retornou faixas de áudio')

  const resolvedTitle = title || order.music_title || buildMusicTitle(order)
  const resolvedStyle = style || order.music_tags || getGenreStyle(order.genre)

  const streamUrl = getClipAudioUrl(clip, true)
  const fullUrl = getClipAudioUrl(clip, false)
  const coverUrl = getClipImageUrl(clip)

  let previewStoredUrl = streamUrl
  let fullStoredUrl = fullUrl
  let coverStoredUrl = coverUrl

  try {
    if (streamUrl) previewStoredUrl = await uploadAudioFromUrl(streamUrl, orderId, 'preview')
    if (fullUrl && isSunoComplete(details.status)) {
      fullStoredUrl = await uploadAudioFromUrl(fullUrl, orderId, 'full')
    }
    if (coverUrl) coverStoredUrl = await uploadCoverFromUrl(coverUrl, orderId)
  } catch (storageErr) {
    console.warn('[FLUISOM] Falha no storage, usando URLs Suno:', storageErr.message)
  }

  const updated = await updateOrder(orderId, {
    status: 'music_ready',
    suno_status: details.status,
    suno_clip_id: clip.id,
    suno_raw_response: details,
    preview_audio_url: previewStoredUrl,
    full_audio_url: fullStoredUrl,
    audio_stored_url: fullStoredUrl,
    cover_image_url: coverStoredUrl,
    music_duration_seconds: clip.duration ? Math.round(clip.duration) : null,
    music_title: clip.title || resolvedTitle,
    music_tags: clip.tags || resolvedStyle,
    music_generation_completed_at: new Date().toISOString(),
  })

  await insertGenerationLog({
    order_id: orderId,
    step: 'music_finalize',
    status: 'success',
    message: 'Música gerada e armazenada',
    payload: { clipId: clip.id, status: details.status },
  })

  return updated
}

export async function finalizeMusicFromWebhookClips(orderId, clips, { title, style } = {}) {
  const details = {
    status: 'SUCCESS',
    response: { sunoData: clips },
  }
  return finalizeMusicFromDetails(orderId, details, { title, style })
}

export async function pollAndFinalizeMusic(orderId, taskId, meta = {}) {
  const details = await pollUntilComplete(taskId, {
    onProgress: async ({ status, attempt }) => {
      await updateOrder(orderId, {
        suno_status: status,
        suno_raw_response: { pollAttempt: attempt },
      })
    },
  })
  return finalizeMusicFromDetails(orderId, details, meta)
}

export async function tryFinalizeFromSunoTask(orderId, taskId, meta = {}) {
  const details = await getMusicGenerationDetails(taskId)
  const status = details.status

  await updateOrder(orderId, { suno_status: status })

  if (isSunoComplete(status) || (isSunoStreamReady(status) && details.response?.sunoData?.length)) {
    return finalizeMusicFromDetails(orderId, details, meta)
  }

  return null
}

export async function generateMusicForOrder(orderId) {
  const order = await getOrderById(orderId)

  if (!order.generated_lyrics) {
    throw new Error('Letra ainda não disponível para gerar música')
  }

  await updateOrder(orderId, {
    status: 'generating_music',
    music_generation_started_at: new Date().toISOString(),
  })

  await insertGenerationLog({
    order_id: orderId,
    step: 'music_submit',
    status: 'started',
    message: 'Submetendo tarefa Suno',
  })

  const vocalGender = order.voice === 'feminino' ? 'f' : 'm'
  const title = buildMusicTitle(order)
  const style = getGenreStyle(order.genre)

  try {
    const submitResult = await withRetry(async (attempt) => {
      if (attempt > 0) {
        await insertGenerationLog({
          order_id: orderId,
          step: 'music_submit',
          status: 'retry',
          message: `Tentativa ${attempt + 1}`,
        })
      }
      return submitMusicGeneration({
        prompt: order.generated_lyrics,
        style,
        title,
        vocalGender,
        callBackUrl: `${env.backendUrl}/api/webhooks/suno`,
      })
    })

    await updateOrder(orderId, {
      suno_task_id: submitResult.taskId,
      suno_status: 'PENDING',
      music_title: title,
      music_tags: style,
    })

    await insertGenerationLog({
      order_id: orderId,
      step: 'music_submit',
      status: 'success',
      message: `Task Suno criada: ${submitResult.taskId}`,
      payload: submitResult.raw,
    })

    if (isServerless()) {
      await insertGenerationLog({
        order_id: orderId,
        step: 'music_poll',
        status: 'pending',
        message: 'Aguardando callback Suno (modo serverless)',
      })
      return getOrderById(orderId)
    }

    return pollAndFinalizeMusic(orderId, submitResult.taskId, { title, style })
  } catch (err) {
    await updateOrder(orderId, {
      status: 'failed',
      error_message: err.message,
      last_error_at: new Date().toISOString(),
      retry_count: (order.retry_count || 0) + 1,
    })
    await insertGenerationLog({
      order_id: orderId,
      step: 'music',
      status: 'error',
      message: err.message,
    })
    throw err
  }
}

export async function retryMusicGeneration(orderId) {
  const order = await getOrderById(orderId)
  if (order.generated_lyrics && !order.suno_task_id) {
    return generateMusicForOrder(orderId)
  }
  if (order.generated_lyrics) {
    await updateOrder(orderId, { suno_task_id: null, suno_status: null, status: 'lyrics_ready' })
    return generateMusicForOrder(orderId)
  }
  throw new Error('Pedido sem letra para retentar música')
}
