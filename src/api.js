async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export const api = {
  alerts: () => request('/api/alerts'),
  financialProfile: () => request('/api/financial-profile'),
  goals: () => request('/api/goals'),
  updateGoal: (id, currentAmount) =>
    request('/api/goals', { method: 'PATCH', body: JSON.stringify({ id, current_amount: currentAmount }) }),
  preferences: () => request('/api/preferences'),
  savePreferences: (topics, language) =>
    request('/api/preferences', { method: 'PATCH', body: JSON.stringify({ topics, language }) }),
  explain: (message) => request('/api/explain', { method: 'POST', body: JSON.stringify({ message }) }),
  explainUploadStream: async (file, message, { onToken, onDone, onError }) => {
    const form = new FormData()
    form.append('file', file)
    if (message) form.append('message', message)
    const res = await fetch('/api/explain/upload', { method: 'POST', body: form })
    if (!res.ok && !res.body) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Request failed (${res.status})`)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
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
        if (data.done) onDone?.(data)
      }
    }
  },
  explainStream: async (message, { onToken, onDone, onError }) => {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    if (!res.ok && !res.body) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Request failed (${res.status})`)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() || ''
      for (const part of parts) {
        if (!part.startsWith('data: ')) continue
        const data = JSON.parse(part.slice(6))
        if (data.error) {
          onError?.(data.error)
          return
        }
        if (data.token) onToken?.(data)
        if (data.done) onDone?.(data)
      }
    }
  },
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
