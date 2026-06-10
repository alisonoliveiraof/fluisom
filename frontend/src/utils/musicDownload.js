export function sanitizeFileName(name) {
  return String(name || 'voce').replace(/[\\/:*?"<>|]/g, '').trim() || 'voce'
}

export function getAudioExtension(url) {
  const lower = String(url || '').toLowerCase()
  if (lower.includes('.wav')) return 'wav'
  if (lower.includes('.m4a')) return 'm4a'
  if (lower.includes('.ogg')) return 'ogg'
  return 'mp3'
}

export function buildDownloadDisplayName(honoredName, version) {
  const name = sanitizeFileName(honoredName)
  if (version != null && version !== '') {
    return `Especial para ${name} - Versão ${version}`
  }
  return `Especial para ${name}`
}

export function buildMusicFileName(honoredName, url, version) {
  const name = sanitizeFileName(honoredName)
  const ext = getAudioExtension(url)
  if (version != null && version !== '') {
    return `${buildDownloadDisplayName(honoredName, version)}.${ext}`
  }
  return `Especial para ${name}.${ext}`
}

function mapOrderVersionEntry(entry, honoredName, index) {
  const version = entry.version ?? index + 1
  const audioUrl =
    entry.full_audio_url ||
    entry.fullAudioUrl ||
    entry.preview_audio_url ||
    entry.previewAudioUrl ||
    null

  return {
    version,
    audioUrl,
    coverImageUrl: entry.cover_image_url || entry.coverImageUrl || null,
    displayName: buildDownloadDisplayName(honoredName, version),
  }
}

export function normalizeOrderVersions(order) {
  if (!order) return []

  const honoredName = order.honored_name || order.honoredName || ''

  const stored = order.music_versions
  if (Array.isArray(stored) && stored.length) {
    return stored.map((entry, index) => mapOrderVersionEntry(entry, honoredName, index))
  }

  const embedded = order.suno_raw_response?.fluisomVersions
  if (Array.isArray(embedded) && embedded.length) {
    return embedded.map((entry, index) => mapOrderVersionEntry(entry, honoredName, index))
  }

  const fallbackUrl = order.full_audio_url || order.fullAudioUrl || order.preview_audio_url || order.previewAudioUrl
  if (fallbackUrl) {
    return [
      mapOrderVersionEntry(
        {
          version: 1,
          full_audio_url: order.full_audio_url || order.fullAudioUrl,
          preview_audio_url: order.preview_audio_url || order.previewAudioUrl,
          cover_image_url: order.cover_image_url || order.coverImageUrl,
        },
        honoredName,
        0,
      ),
    ]
  }

  return []
}

export function buildVersionDisplayTitle(honoredName, version) {
  const name = String(honoredName || 'você').trim() || 'você'
  return `Música Especial para ${name} - Versão ${version}`
}

export async function downloadMusicFile({ url, honoredName, version }) {
  if (!url) return

  const fileName = buildMusicFileName(honoredName, url, version)

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Falha no download')
    const blob = await res.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = fileName
    link.click()
    URL.revokeObjectURL(link.href)
  } catch {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.target = '_blank'
    link.rel = 'noopener'
    link.click()
  }
}
