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

export function buildMusicFileName(honoredName, url, version) {
  const name = sanitizeFileName(honoredName)
  const ext = getAudioExtension(url)
  if (version && version > 1) {
    return `Especial para ${name} - Versão ${version}.${ext}`
  }
  return `Especial para ${name}.${ext}`
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
