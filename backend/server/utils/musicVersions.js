export function buildVersionTitle(honoredName, version) {
  const name = String(honoredName || 'você').trim() || 'você'
  return `Música Especial para ${name} - Versão ${version}`
}

function mapVersionEntry(v, honoredName, index) {
  const version = v.version ?? index + 1
  return {
    version,
    title: v.title || buildVersionTitle(honoredName, version),
    previewAudioUrl:
      v.previewAudioUrl || v.preview_audio_url || v.fullAudioUrl || v.full_audio_url || null,
    fullAudioUrl: v.fullAudioUrl || v.full_audio_url || null,
    coverImageUrl: v.coverImageUrl || v.cover_image_url || null,
    duration: v.duration ?? v.music_duration_seconds ?? null,
    sunoClipId: v.sunoClipId || v.suno_clip_id || null,
  }
}

export function normalizeStoredVersions(order) {
  const raw = order?.music_versions
  if (Array.isArray(raw) && raw.length) {
    return raw.map((v, i) => mapVersionEntry(v, order.honored_name, i))
  }

  const embedded = order?.suno_raw_response?.fluisomVersions
  if (Array.isArray(embedded) && embedded.length) {
    return embedded.map((v, i) => mapVersionEntry(v, order.honored_name, i))
  }

  if (order?.preview_audio_url) {
    return [
      mapVersionEntry(
        {
          version: 1,
          preview_audio_url: order.preview_audio_url,
          full_audio_url: order.full_audio_url,
          cover_image_url: order.cover_image_url,
          duration: order.music_duration_seconds,
          suno_clip_id: order.suno_clip_id,
        },
        order.honored_name,
        0,
      ),
    ]
  }

  return []
}

export function mapVersionsForClient(order) {
  return normalizeStoredVersions(order)
}
