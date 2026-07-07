const STORAGE_KEY = 'fluisom_attribution'

export const ATTRIBUTION_KEYS = [
  'src',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
]

function sanitize(value, max = 255) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export function captureAttributionFromLocation() {
  if (typeof window === 'undefined') return
  try {
    const params = new URLSearchParams(window.location.search)
    const query = {}
    for (const key of ATTRIBUTION_KEYS) {
      const val = params.get(key)
      if (val) query[key] = val
    }
    captureAttribution(query)
  } catch {
    // location indisponível
  }
}

export function captureAttribution(query = {}) {
  const incoming = {}
  for (const key of ATTRIBUTION_KEYS) {
    const val = sanitize(query[key])
    if (val) incoming[key] = val
  }

  if (!Object.keys(incoming).length) return

  const existing = getAttribution()
  const merged = {
    ...existing,
    ...incoming,
    captured_at: existing.captured_at || new Date().toISOString(),
  }

  if (!merged.landing_page && typeof window !== 'undefined') {
    merged.landing_page = `${window.location.pathname}${window.location.search}`.slice(0, 500)
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
}

export function getAttribution() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getAttributionQuery() {
  const data = getAttribution()
  const query = {}
  for (const key of ATTRIBUTION_KEYS) {
    if (data[key]) query[key] = data[key]
  }
  return query
}

export function getAttributionPayload() {
  const data = getAttribution()
  return {
    trafficSrc: data.src || null,
    utmSource: data.utm_source || null,
    utmMedium: data.utm_medium || null,
    utmCampaign: data.utm_campaign || null,
    utmTerm: data.utm_term || null,
    utmContent: data.utm_content || null,
    landingPage: data.landing_page || null,
  }
}

export function formatAttributionLabel(order = {}) {
  if (order.traffic_src) return `src: ${order.traffic_src}`
  if (order.utm_source) {
    const parts = [order.utm_source]
    if (order.utm_medium) parts.push(order.utm_medium)
    if (order.utm_campaign) parts.push(order.utm_campaign)
    return parts.join(' / ')
  }
  return 'Direto'
}
