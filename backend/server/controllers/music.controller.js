import {
  submitMusicGeneration,
  pollUntilComplete,
  getMusicGenerationDetails,
  getAllClips,
  getClipAudioUrl,
  getClipImageUrl,
  isSunoComplete,
  isSunoStreamReady,
} from '../services/suno.service.js'
import { withRetry } from '../services/openai.service.js'
import { uploadAudioFromUrl, uploadCoverFromUrl, isStoredAudioValid } from '../services/storage.service.js'
import { buildMusicTitle, getGenreStyle } from '../utils/prompt.builder.js'
import { buildVersionTitle, normalizeStoredVersions } from '../utils/musicVersions.js'
import { getOrderById, updateOrder, insertGenerationLog } from '../services/supabase.service.js'
import { env } from '../config/env.js'
const isServerless = () => process.env.VERCEL === '1'

const finalizeLocks = new Set()

export async function refreshOrderSunoStatus(order) {
  if (!order?.suno_task_id) return order

  try {
    const details = await getMusicGenerationDetails(order.suno_task_id)
    if (!details?.status || details.status === order.suno_status) return order

    return await updateOrder(order.id, { suno_status: details.status })
  } catch (err) {
    console.warn('[FLUISOM] Falha ao atualizar status Suno:', err.message)
    return order
  }
}

function isSupabaseStorageUrl(url) {
  return !!url && String(url).includes('supabase.co/storage')
}

function pickExistingVersionField(existingVersions, version, field) {
  const match = existingVersions.find((v) => (v.version ?? 0) === version)
  const value = match?.[field] || match?.[field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())]
  if (!value || !isSupabaseStorageUrl(value)) return null
  return value
}

async function storeClipVersion(orderId, clip, version, details, resolvedStyle, existingVersions = []) {
  const streamUrl = getClipAudioUrl(clip, true)
  const fullUrl = getClipAudioUrl(clip, false)
  const coverUrl = getClipImageUrl(clip)
  const previewSourceUrl = streamUrl || fullUrl

  let previewStoredUrl = null
  let fullStoredUrl = null
  let coverStoredUrl = coverUrl

  try {
    if (previewSourceUrl) {
      previewStoredUrl = await uploadAudioFromUrl(previewSourceUrl, orderId, 'preview', version)
    }
    if (fullUrl && isSunoComplete(details.status)) {
      fullStoredUrl = await uploadAudioFromUrl(fullUrl, orderId, 'full', version)
    } else if (previewStoredUrl) {
      fullStoredUrl = previewStoredUrl
    }
    if (coverUrl) coverStoredUrl = await uploadCoverFromUrl(coverUrl, orderId, version)
  } catch (storageErr) {
    console.warn(`[FLUISOM] Falha no storage v${version}:`, storageErr.message)
    if (previewStoredUrl) {
      fullStoredUrl = fullStoredUrl || previewStoredUrl
    }
  }

  if (!previewStoredUrl) {
    previewStoredUrl = pickExistingVersionField(existingVersions, version, 'preview_audio_url')
  }
  if (!fullStoredUrl) {
    fullStoredUrl =
      pickExistingVersionField(existingVersions, version, 'full_audio_url') || previewStoredUrl
  }
  if (!coverStoredUrl || !isSupabaseStorageUrl(coverStoredUrl)) {
    const existingCover = pickExistingVersionField(existingVersions, version, 'cover_image_url')
    if (existingCover) coverStoredUrl = existingCover
  }

  return {
    version,
    preview_audio_url: previewStoredUrl,
    full_audio_url: fullStoredUrl,
    cover_image_url: coverStoredUrl,
    duration: clip.duration ? Math.round(clip.duration) : null,
    suno_clip_id: clip.id,
    music_tags: clip.tags || resolvedStyle,
  }
}

export async function finalizeMusicFromDetails(orderId, details, { title, style } = {}) {
  const order = await getOrderById(orderId)
  const clips = getAllClips(details, 2)
  if (!clips.length) throw new Error('Suno não retornou faixas de áudio')

  const resolvedStyle = style || order.music_tags || getGenreStyle(order.genre)
  const honoredName = order.honored_name?.trim() || 'você'
  const existingVersions = normalizeStoredVersions(order)

  const storedVersions = await Promise.all(
    clips.map(async (clip, i) => {
      const version = i + 1
      const entry = await storeClipVersion(orderId, clip, version, details, resolvedStyle, existingVersions)
      entry.title = buildVersionTitle(honoredName, version)
      return entry
    }),
  )

  const hasAnyAudio = storedVersions.some((v) => v.preview_audio_url || v.full_audio_url)
  if (!hasAnyAudio) {
    throw new Error('Não foi possível armazenar nenhuma versão de áudio')
  }

  const primary = storedVersions[0]
  const baseTitle = title || order.music_title || buildMusicTitle(order)

  const payload = {
    status: 'music_ready',
    suno_status: details.status,
    suno_clip_id: primary.suno_clip_id,
    suno_raw_response: { ...details, fluisomVersions: storedVersions },
    music_versions: storedVersions,
    preview_audio_url: primary.preview_audio_url,
    full_audio_url: primary.full_audio_url,
    audio_stored_url: primary.full_audio_url,
    cover_image_url: primary.cover_image_url,
    music_duration_seconds: primary.duration,
    music_title: baseTitle,
    music_tags: primary.music_tags || resolvedStyle,
    music_generation_completed_at: new Date().toISOString(),
  }

  let updated
  try {
    updated = await updateOrder(orderId, payload)
  } catch (err) {
    if (!String(err.message).includes('music_versions')) throw err
    console.warn('[FLUISOM] Coluna music_versions ausente — usando fluisomVersions em suno_raw_response')
    const { music_versions: _mv, ...fallback } = payload
    updated = await updateOrder(orderId, fallback)
  }

  await insertGenerationLog({
    order_id: orderId,
    step: 'music_finalize',
    status: 'success',
    message: `${storedVersions.length} versão(ões) gerada(s) e armazenada(s)`,
    payload: { clipIds: storedVersions.map((v) => v.suno_clip_id), status: details.status },
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

const READY_STATUSES = ['music_ready', 'preview_shown', 'payment_pending', 'paid', 'delivered']

async function versionsNeedRepair(versions) {
  if (!versions.length) return true

  const previewChecks = await Promise.all(
    versions.map((v) => isStoredAudioValid(v.preview_audio_url || v.previewAudioUrl)),
  )
  if (!previewChecks.every(Boolean)) return true

  const fullChecks = await Promise.all(
    versions.map((v) => {
      const url = v.full_audio_url || v.fullAudioUrl
      if (!isSupabaseStorageUrl(url)) return Promise.resolve(false)
      return isStoredAudioValid(url)
    }),
  )
  return !fullChecks.every(Boolean)
}

export async function checkOrderNeedsSunoSync(order) {
  if (!order?.suno_task_id) return { needsSync: false, force: false }

  const versions = normalizeStoredVersions(order)
  const existing = versions.length
  const repair = existing > 0 ? await versionsNeedRepair(versions) : false

  const needsSync =
    order.status === 'generating_music' ||
    (READY_STATUSES.includes(order.status) && existing < 2) ||
    (READY_STATUSES.includes(order.status) && repair) ||
    (order.suno_status === 'FIRST_SUCCESS' && !isSunoComplete(order.suno_status))

  return { needsSync, force: repair }
}

export async function tryFinalizeFromSunoTask(orderId, taskId, meta = {}, { force = false } = {}) {
  const order = await getOrderById(orderId)
  const details = await getMusicGenerationDetails(taskId)
  const status = details.status

  await updateOrder(orderId, { suno_status: status })

  if (isSunoComplete(status) || (isSunoStreamReady(status) && details.response?.sunoData?.length)) {
    const clips = getAllClips(details, 2)
    const existing = normalizeStoredVersions(order).length
    if (!force && READY_STATUSES.includes(order.status) && existing >= clips.length) {
      const repair = await versionsNeedRepair(normalizeStoredVersions(order))
      if (!repair) return order
    }
    return finalizeMusicFromDetails(orderId, details, meta)
  }

  return null
}

async function runFinalizeSync(order, meta = {}, { force = false } = {}) {
  return tryFinalizeFromSunoTask(
    order.id,
    order.suno_task_id,
    {
      title: meta.title || order.music_title || buildMusicTitle(order),
      style: meta.style || order.music_tags || getGenreStyle(order.genre),
    },
    { force },
  )
}

export async function ensureAllMusicVersions(order, meta = {}, { blocking = true } = {}) {
  if (!order?.suno_task_id) return order

  const { needsSync, force } = await checkOrderNeedsSunoSync(order)
  if (!needsSync) return order

  const syncMeta = {
    title: meta.title || order.music_title || buildMusicTitle(order),
    style: meta.style || order.music_tags || getGenreStyle(order.genre),
  }

  if (!blocking) {
    if (finalizeLocks.has(order.id)) return order

    finalizeLocks.add(order.id)
    void runFinalizeSync(order, syncMeta, { force })
      .catch((err) => console.warn('[FLUISOM] Finalize em background falhou:', err.message))
      .finally(() => finalizeLocks.delete(order.id))

    return order
  }

  const result = await runFinalizeSync(order, syncMeta, { force })
  return result || (await getOrderById(order.id))
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
