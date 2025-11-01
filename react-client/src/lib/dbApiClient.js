/**
 * Database API Client
 * Methods for querying the database via the new /api/db endpoints
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

// ==================== REPORT ENDPOINTS ====================

/**
 * Get recent reports
 * @param {number} limit - Number of reports to retrieve (default: 10)
 * @returns {Promise<{reports: Array}>}
 */
export async function getRecentReports(limit = 10) {
  const res = await fetch(`${API_BASE}/api/db/reports/recent?limit=${limit}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch recent reports: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get reports within a date range
 * @param {string} startDate - Start date (ISO format)
 * @param {string} endDate - End date (ISO format)
 * @returns {Promise<{reports: Array}>}
 */
export async function getReportsByDateRange(startDate, endDate) {
  const res = await fetch(
    `${API_BASE}/api/db/reports/date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
  )
  if (!res.ok) {
    throw new Error(`Failed to fetch reports by date range: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get report statistics
 * @returns {Promise<{stats: Object}>}
 */
export async function getReportStats() {
  const res = await fetch(`${API_BASE}/api/db/reports/stats`)
  if (!res.ok) {
    throw new Error(`Failed to fetch report stats: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Query reports with custom filters
 * @param {Object} filters - Query filters
 * @param {string} filters.apiName - API name to filter by
 * @param {string} filters.username - Username to filter by
 * @param {string} filters.startDate - Start date (ISO format)
 * @param {string} filters.endDate - End date (ISO format)
 * @param {number} filters.limit - Number of results to return
 * @returns {Promise<{reports: Array}>}
 */
export async function queryReports(filters) {
  const res = await fetch(`${API_BASE}/api/db/reports/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters)
  })
  if (!res.ok) {
    throw new Error(`Failed to query reports: ${res.statusText}`)
  }
  return res.json()
}

// ==================== USER ENDPOINTS ====================

/**
 * Get user statistics (media count, last download, etc.)
 * @returns {Promise<{users: Array, count: number}>}
 */
export async function getUserStats() {
  const res = await fetch(`${API_BASE}/api/db/users/stats`)
  if (!res.ok) {
    throw new Error(`Failed to fetch user stats: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get user by username
 * @param {string} username - Username to look up
 * @returns {Promise<{user: Object}>}
 */
export async function getUserByUsername(username) {
  const res = await fetch(`${API_BASE}/api/db/users/${encodeURIComponent(username)}`)
  if (!res.ok) {
    if (res.status === 404) {
      return { user: null }
    }
    throw new Error(`Failed to fetch user: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get user by platform and UID
 * @param {string} platform - Platform name (facebook or instagram)
 * @param {string} uid - User UID
 * @returns {Promise<{user: Object}>}
 */
export async function getUserByUid(platform, uid) {
  const res = await fetch(`${API_BASE}/api/db/users/${platform}/${uid}`)
  if (!res.ok) {
    if (res.status === 404) {
      return { user: null }
    }
    throw new Error(`Failed to fetch user by UID: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Fetch user with UID from API (auto-fetch and cache)
 * @param {Object} payload - Fetch payload
 * @param {string} payload.url - User profile URL or username
 * @param {string} payload.platform - Platform name (optional)
 * @param {string} payload.clientId - Client ID for API calls
 * @returns {Promise<{user: Object, cached: boolean}>}
 */
export async function fetchUser(payload) {
  const res = await fetch(`${API_BASE}/api/db/users/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    if (res.status === 404) {
      return { user: null, cached: false }
    }
    throw new Error(`Failed to fetch user: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Bulk fetch users with UIDs from API
 * @param {Object} payload - Bulk fetch payload
 * @param {Array<string>} payload.urls - Array of user profile URLs
 * @param {string} payload.clientId - Client ID for API calls
 * @param {number} payload.concurrency - Number of concurrent fetches (default: 3)
 * @returns {Promise<{results: Array, summary: Object}>}
 */
export async function bulkFetchUsers(payload) {
  const res = await fetch(`${API_BASE}/api/db/users/bulk-fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    throw new Error(`Failed to bulk fetch users: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get saved media for a user
 * @param {string} username - Username to get media for
 * @param {number} limit - Number of media items to return (default: 50)
 * @returns {Promise<{media: Array, count: number, total: number}>}
 */
export async function getUserMedia(username, limit = 50) {
  const res = await fetch(
    `${API_BASE}/api/db/users/${encodeURIComponent(username)}/media?limit=${limit}`
  )
  if (!res.ok) {
    throw new Error(`Failed to fetch user media: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Search users by username pattern
 * @param {Object} payload - Search payload
 * @param {string} payload.pattern - Search pattern (uses SQL LIKE)
 * @param {number} payload.limit - Number of results to return (default: 50)
 * @returns {Promise<{users: Array, count: number}>}
 */
export async function searchUsers(payload) {
  const res = await fetch(`${API_BASE}/api/db/users/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    throw new Error(`Failed to search users: ${res.statusText}`)
  }
  return res.json()
}
