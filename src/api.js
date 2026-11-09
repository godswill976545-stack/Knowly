let tokenProvider = null

// Called once by the app shell with Clerk's getToken so every API request
// carries the session JWT. Null provider = guest/demo, server falls back
// to the shared demo user.
export function setAuthTokenProvider(fn) {
  tokenProvider = fn
}

async function authHeaders() {
  try {
    const token = await tokenProvider?.()
    if (token) return { Authorization: `Bearer ${token}` }
  } catch {}
  return {}
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()), ...(options.headers || {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export const api = {
  alerts: (type) => request(type ? `/api/alerts?type=${type}` : '/api/alerts'),
  reminders: () => request('/api/reminders'),
  financialProfile: () => request('/api/financial-profile'),
  updateProfile: (income, expenses, savings) =>
    request('/api/financial-profile', { method: 'PATCH', body: JSON.stringify({ monthly_income: income, monthly_expenses: expenses, savings }) }),
  goals: () => request('/api/goals'),
  createGoal: (goal) =>
    request('/api/goals', { method: 'POST', body: JSON.stringify(goal) }),
  updateGoal: (id, currentAmount) =>
    request('/api/goals', { method: 'PATCH', body: JSON.stringify({ id, current_amount: currentAmount }) }),
  dailyLog: (log) =>
    request('/api/daily-log', { method: 'POST', body: JSON.stringify(log) }),
  preferences: () => request('/api/preferences'),
  savePreferences: (topics, language) =>
    request('/api/preferences', { method: 'PATCH', body: JSON.stringify({ topics, language }) }),
  explain: (message) => request('/api/explain', { method: 'POST', body: JSON.stringify({ message }) }),
  checkins: () => request('/api/checkins'),
  createCheckin: (payload) => request('/api/checkins', { method: 'POST', body: JSON.stringify(payload) }),
  explainUploadStream: async (file, message, { onToken, onDone, onError }) => {
    const form = new FormData()
    form.append('file', file)
    if (message) form.append('message', message)
    const res = await fetch('/api/explain/upload', { method: 'POST', headers: await authHeaders(), body: form })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      onError?.(body.error || `Request failed (${res.status})`)
      return
    }
    await readSseStream(res, { onToken, onDone, onError })
  },
  explainStream: async (message, { onToken, onDone, onError }) => {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      onError?.(body.error || `Request failed (${res.status})`)
      return
    }
    await readSseStream(res, { onToken, onDone, onError })
  },
}

// Shared SSE reader. A stream that ends without a `done` frame (e.g. the
// serverless function hit its time budget, or the connection dropped) must
// surface as an error — otherwise the UI stays loading forever.
async function readSseStream(res, { onToken, onDone, onError }) {
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let doneData = null
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''
    for (const part of parts) {
      if (!part.startsWith('data: ')) continue
      const data = JSON.parse(part.slice(6))
      if (data.error) { onError?.(data.error); return }
      if (data.token) onToken?.(data)
      if (data.done) doneData = data
    }
  }
  if (doneData) onDone?.(doneData)
  else onError?.('Connexion interrompue. Réessayez.')
}

const DATE_LOCALES = { fr: 'fr-FR', en: 'en-US' }

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  let lang = 'fr'
  try { lang = localStorage.getItem('moncheck-lang') || 'fr' } catch {}
  return date.toLocaleDateString(DATE_LOCALES[lang] || 'fr-FR', { month: 'long', day: 'numeric', year: 'numeric' })
}
