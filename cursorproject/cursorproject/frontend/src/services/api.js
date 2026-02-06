const API_BASE = 'http://127.0.0.1:8000'

function authHeaders() {
  const saved = localStorage.getItem('trusted_user')
  if (!saved) return {}
  const { token } = JSON.parse(saved)
  return { Authorization: `Bearer ${token}` }
}

export async function apiLogin(email, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Invalid credentials (${res.status}): ${text}`)
  }
  return res.json()
}

export async function apiVerify(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${API_BASE}/verify`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: fd
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Verification failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function apiListVerifications(filters = {}) {
  const params = new URLSearchParams()
  if (filters.institution) params.set('institution', filters.institution)
  if (filters.year) params.set('year', filters.year)
  if (filters.status) params.set('status', filters.status)
  const res = await fetch(`${API_BASE}/verifications?${params.toString()}`, {
    headers: { ...authHeaders() }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to fetch verifications (${res.status}): ${text}`)
  }
  return res.json()
}

export async function apiListInstitutions(filters = {}) {
  const params = new URLSearchParams()
  if (filters.institution) params.set('institution', filters.institution)
  if (filters.year) params.set('year', filters.year)
  const res = await fetch(`${API_BASE}/institutions?${params.toString()}`)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to fetch institutions (${res.status}): ${text}`)
  }
  return res.json()
}

export async function apiBulkUploadInstitutions(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${API_BASE}/institutions/bulk`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: fd
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Bulk upload failed (${res.status}): ${text}`)
  }
  return res.json()
}