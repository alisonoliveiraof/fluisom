import axios from 'axios'
import { env } from '../config/env.js'
import { isSunoComplete, isSunoFailed, isSunoStreamReady } from '../utils/status.mapper.js'

const client = axios.create({
  baseURL: env.sunoBaseUrl,
  timeout: 30000,
  headers: {
    Authorization: `Bearer ${env.sunoApiKey}`,
    'Content-Type': 'application/json',
  },
})

/**
 * POST /api/v1/generate — DocumentationSuno.md
 */
export async function submitMusicGeneration({ prompt, style, title, vocalGender, callBackUrl }) {
  console.log('[FLUISOM] Submetendo geração Suno:', title)

  const payload = {
    customMode: true,
    instrumental: false,
    model: env.sunoModel,
    callBackUrl: callBackUrl || `${env.backendUrl}/api/webhooks/suno`,
    prompt,
    style,
    title,
    vocalGender,
  }

  const { data } = await client.post('/api/v1/generate', payload)

  if (data.code !== 200) {
    throw new Error(data.msg || `Suno submit error code ${data.code}`)
  }

  return {
    taskId: data.data?.taskId,
    raw: data,
  }
}

/**
 * GET /api/v1/generate/record-info?taskId= — Get Music Generation Details
 */
export async function getMusicGenerationDetails(taskId) {
  const { data } = await client.get('/api/v1/generate/record-info', {
    params: { taskId },
  })

  if (data.code !== 200) {
    throw new Error(data.msg || `Suno poll error code ${data.code}`)
  }

  return data.data
}

export async function pollUntilComplete(taskId, { onProgress } = {}) {
  const maxAttempts = env.sunoMaxPollAttempts
  const interval = env.sunoPollIntervalMs

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const details = await getMusicGenerationDetails(taskId)
    const status = details.status

    if (onProgress) {
      onProgress({ details, status, attempt, maxAttempts })
    }

    if (isSunoFailed(status)) {
      throw new Error(details.errorMessage || `Suno falhou: ${status}`)
    }

    if (isSunoComplete(status)) {
      return details
    }

    if (isSunoStreamReady(status) && details.response?.sunoData?.length) {
      return details
    }

    await sleep(interval)
  }

  throw new Error('Timeout aguardando geração Suno')
}

export function pickBestClip(details) {
  const clips = details?.response?.sunoData || []
  if (!clips.length) return null
  return clips[0]
}

export function getClipAudioUrl(clip, preferStream = false) {
  if (!clip) return null
  if (preferStream) {
    return clip.streamAudioUrl || clip.audioUrl || clip.source_stream_audio_url || clip.audio_url
  }
  return clip.audioUrl || clip.audio_url || clip.streamAudioUrl || clip.source_audio_url
}

export function getClipImageUrl(clip) {
  if (!clip) return null
  return clip.imageUrl || clip.image_url || clip.source_image_url
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export { isSunoComplete, isSunoFailed, isSunoStreamReady }
