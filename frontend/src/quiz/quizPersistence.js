const STORAGE_KEY = 'fluisom-quiz-draft'

export function loadQuizDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    return data
  } catch {
    return null
  }
}

export function saveQuizDraft(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // quota exceeded or private mode — ignore
  }
}

export function clearQuizDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function hasQuizDraft() {
  return !!loadQuizDraft()
}
