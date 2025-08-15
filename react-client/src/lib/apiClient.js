const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

export async function callApi({ id, apiname, apiparams, url }) {
  const params = (apiparams && typeof apiparams === 'object') ? { ...apiparams } : {}
  if (params.url === undefined || params.url === null || params.url === '') {
    if (url) params.url = url
  }
  const res = await fetch(`${API_BASE}/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, apiname, apiparams: params, url }),
  })
  return res.json()
}

export async function getSavedList() {
  const res = await fetch(`${API_BASE}/saved-list`)
  return res.json()
}

export async function saveShuffledUrls(payload) {
  await fetch(`${API_BASE}/save-shuffled-urls`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
}

export async function getLastCursors(payload) {
  const res = await fetch(`${API_BASE}/get-last-cursors`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
  return res.json()
}

export async function saveLastCursor(payload) {
  await fetch(`${API_BASE}/save-last-cursor`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
}

export async function saveReport(payload) {
  await fetch(`${API_BASE}/save-ig-user-stories-report`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
}

export async function downloadItems(payload) {
  await fetch(`${API_BASE}/download`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
}

export function apiBase() { return API_BASE }

