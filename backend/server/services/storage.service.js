import axios from 'axios'
import getSupabase from '../config/supabase.config.js'
import { env } from '../config/env.js'

function storageSuffix(version) {
  return version > 1 ? `-v${version}` : ''
}

export async function isStoredAudioValid(url) {
  if (!url) return false
  try {
    const res = await axios.head(url, { timeout: 15000, maxRedirects: 5 })
    const len = Number(res.headers['content-length'] || 0)
    return len > 1024
  } catch {
    return false
  }
}

export async function uploadAudioFromUrl(url, orderId, type = 'preview', version = 1) {
  if (!url) throw new Error('URL de áudio inválida')

  const folder = type === 'full' ? 'full' : 'previews'
  const path = `${folder}/${orderId}${storageSuffix(version)}.mp3`

  console.log(`[FLUISOM] Baixando áudio (${type}) para pedido ${orderId}`)

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,
    maxRedirects: 5,
  })

  const byteLength = response.data?.byteLength ?? 0
  if (byteLength < 1024) {
    throw new Error(`Áudio vazio ou inválido (${byteLength} bytes) — origem: ${url}`)
  }

  const supabase = getSupabase()
  const { error } = await supabase.storage
    .from(env.supabaseStorageBucket)
    .upload(path, response.data, {
      contentType: 'audio/mpeg',
      upsert: true,
    })

  if (error) throw new Error(`Erro no upload de áudio: ${error.message}`)
  return getPublicUrl(path)
}

export async function uploadCoverFromUrl(url, orderId, version = 1) {
  if (!url) return null

  const path = `covers/${orderId}${storageSuffix(version)}.jpg`

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  })

  const contentType = response.headers['content-type'] || 'image/jpeg'
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  const finalPath = `covers/${orderId}${storageSuffix(version)}.${ext}`

  const supabase = getSupabase()
  const { error } = await supabase.storage
    .from(env.supabaseStorageBucket)
    .upload(finalPath, response.data, {
      contentType,
      upsert: true,
    })

  if (error) throw new Error(`Erro no upload de capa: ${error.message}`)
  return getPublicUrl(finalPath)
}

export function getPublicUrl(path) {
  const supabase = getSupabase()
  const { data } = supabase.storage.from(env.supabaseStorageBucket).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteFile(path) {
  const supabase = getSupabase()
  const { error } = await supabase.storage.from(env.supabaseStorageBucket).remove([path])
  if (error) throw new Error(`Erro ao deletar arquivo: ${error.message}`)
}
