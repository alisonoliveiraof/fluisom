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

export function buildMusicFileName(honoredName, url) {
  const name = sanitizeFileName(honoredName)
  const ext = getAudioExtension(url)
  return `Especial para ${name}.${ext}`
}

export async function downloadMusicFile({ url, honoredName }) {
  if (!url) return

  const fileName = buildMusicFileName(honoredName, url)

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
