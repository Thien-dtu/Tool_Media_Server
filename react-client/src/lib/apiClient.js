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

export async function checkSavedStatus(username, ids) {
  if (!ids || ids.length === 0) {
    return { saved: [] } // Tránh gọi API không cần thiết
  }
  const resp = await fetch(`${apiBase()}/check-saved`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, ids }),
  })
  if (!resp.ok) {
    console.error('Failed to check saved status:', await resp.text());
    throw new Error('Failed to check saved status')
  }
  return resp.json() // Trả về { saved: [...] }
}

/**
 * Pre-fetch users with UIDs before making API calls
 * Ensures all users are tracked in database with proper UIDs
 * @param {string[]} urls - Array of profile URLs
 * @param {string} clientId - WebSocket client ID
 * @returns {Promise<{results: Array, summary: {total: number, successful: number, failed: number}}>}
 */
export async function preFetchUsers(urls, clientId) {
  if (!urls || urls.length === 0) {
    return { results: [], summary: { total: 0, successful: 0, failed: 0 } }
  }

  const resp = await fetch(`${API_BASE}/api/db/users/bulk-fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, clientId, concurrency: 3 }),
  })

  if (!resp.ok) {
    console.error('Failed to pre-fetch users:', await resp.text())
    throw new Error('Failed to pre-fetch users')
  }

  return resp.json()
}

export function apiBase() { return API_BASE }

