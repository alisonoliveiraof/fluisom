const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.message || `Erro HTTP ${res.status}`)
    err.code = data.code
    err.status = res.status
    throw err
  }

  return data
}

export function startQuiz(formData) {
  return request('/quiz/start', {
    method: 'POST',
    body: JSON.stringify({
      relationship: formData.relationship,
      customRelationship: formData.customRelationship,
      honoredName: formData.honoredName,
      specialQualities: formData.specialQualities,
      specialMoments: formData.specialMoments,
      specialMessage: formData.specialMessage,
      genre: formData.genre,
      voice: formData.voice,
    }),
  })
}

export function getQuizStatus(orderId) {
  return request(`/quiz/status/${orderId}`)
}

export function getQuizPreview(orderId) {
  return request(`/quiz/preview/${orderId}`)
}

export function updateQuizContact(orderId, contact) {
  return request(`/quiz/${orderId}/contact`, {
    method: 'PATCH',
    body: JSON.stringify({
      fullName: contact.fullName,
      email: contact.email,
      whatsapp: contact.whatsapp,
      discreteMode: contact.discreteMode,
    }),
  })
}

export function adminLogin(secretKey) {
  return request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ secretKey }),
  })
}

function adminRequest(path, options = {}) {
  const token = localStorage.getItem('fluisom_admin_token')
  return request(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
}

export function getAdminDashboard() {
  return adminRequest('/admin/dashboard')
}

function buildQuery(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
  const qs = new URLSearchParams(clean).toString()
  return qs ? `?${qs}` : ''
}

export function getAdminOrders(params = {}) {
  return adminRequest(`/admin/orders${buildQuery(params)}`)
}

export function getAdminOrderDetail(orderId) {
  return adminRequest(`/admin/orders/${orderId}`)
}

export function retryAdminOrder(orderId) {
  return adminRequest(`/admin/orders/${orderId}/retry`, { method: 'POST' })
}

export function updateAdminOrderStatus(orderId, status) {
  return adminRequest(`/admin/orders/${orderId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

export function getAdminRealtimeStats() {
  return adminRequest('/admin/stats/realtime')
}

export function getAdminSettings() {
  return adminRequest('/admin/settings')
}

export function updateAdminSettings(settings) {
  return adminRequest('/admin/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  })
}

export function exportAdminOrders(params = {}) {
  const token = localStorage.getItem('fluisom_admin_token')
  return fetch(`${API_URL}/admin/orders/export${buildQuery(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export default {
  startQuiz,
  getQuizStatus,
  getQuizPreview,
  updateQuizContact,
  adminLogin,
  getAdminDashboard,
  getAdminOrders,
  getAdminOrderDetail,
  retryAdminOrder,
  updateAdminOrderStatus,
  getAdminRealtimeStats,
  getAdminSettings,
  updateAdminSettings,
  exportAdminOrders,
}
