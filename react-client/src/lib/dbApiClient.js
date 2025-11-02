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
export async function getRecentReports(limit = 100) {
  const res = await fetch(`${API_BASE}/api/db/reports/recent?limit=${limit}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch recent reports: ${res.statusText}`)
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

// ==================== ANALYTICS ENDPOINTS ====================

/**
 * Get top active users by download count
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Number of users to return
 * @param {string} params.startDate - Start date (ISO format)
 * @param {string} params.endDate - End date (ISO format)
 * @returns {Promise<{users: Array, count: number}>}
 */
export async function getTopUsers(params = {}) {
  const queryParams = new URLSearchParams()
  if (params.limit) queryParams.append('limit', params.limit)
  if (params.startDate) queryParams.append('startDate', params.startDate)
  if (params.endDate) queryParams.append('endDate', params.endDate)

  const res = await fetch(`${API_BASE}/api/db/analytics/top-users?${queryParams}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch top users: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get inactive users (no activity in specified days)
 * @param {number} days - Number of days of inactivity
 * @returns {Promise<{users: Array, count: number, inactiveDays: number}>}
 */
export async function getInactiveUsers(days = 30) {
  const res = await fetch(`${API_BASE}/api/db/analytics/inactive-users?days=${days}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch inactive users: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get user engagement scores
 * @param {number} minScore - Minimum engagement score
 * @returns {Promise<{users: Array, count: number}>}
 */
export async function getUserEngagement(minScore = 0) {
  const res = await fetch(`${API_BASE}/api/db/analytics/user-engagement?minScore=${minScore}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch user engagement: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get download timeline
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date (ISO format)
 * @param {string} params.endDate - End date (ISO format)
 * @param {string} params.granularity - Granularity (day, week, month)
 * @returns {Promise<{timeline: Array, granularity: string}>}
 */
export async function getDownloadTimeline(params = {}) {
  const queryParams = new URLSearchParams()
  if (params.startDate) queryParams.append('startDate', params.startDate)
  if (params.endDate) queryParams.append('endDate', params.endDate)
  if (params.granularity) queryParams.append('granularity', params.granularity)

  const res = await fetch(`${API_BASE}/api/db/analytics/download-timeline?${queryParams}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch download timeline: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get API call frequency over time
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date (ISO format)
 * @param {string} params.endDate - End date (ISO format)
 * @param {string} params.granularity - Granularity (day, week, month)
 * @returns {Promise<{frequency: Array, granularity: string}>}
 */
export async function getApiFrequency(params = {}) {
  const queryParams = new URLSearchParams()
  if (params.startDate) queryParams.append('startDate', params.startDate)
  if (params.endDate) queryParams.append('endDate', params.endDate)
  if (params.granularity) queryParams.append('granularity', params.granularity)

  const res = await fetch(`${API_BASE}/api/db/analytics/api-frequency?${queryParams}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch API frequency: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get completion rate trends
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date (ISO format)
 * @param {string} params.endDate - End date (ISO format)
 * @param {string} params.apiName - API name to filter
 * @returns {Promise<{trends: Array}>}
 */
export async function getCompletionTrends(params = {}) {
  const queryParams = new URLSearchParams()
  if (params.startDate) queryParams.append('startDate', params.startDate)
  if (params.endDate) queryParams.append('endDate', params.endDate)
  if (params.apiName) queryParams.append('apiName', params.apiName)

  const res = await fetch(`${API_BASE}/api/db/analytics/completion-trends?${queryParams}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch completion trends: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get media deduplication report
 * @param {number} limit - Number of items to return
 * @returns {Promise<{media: Array, count: number}>}
 */
export async function getMediaDeduplication(limit = 20) {
  const res = await fetch(`${API_BASE}/api/db/analytics/media-deduplication?limit=${limit}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch media deduplication: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get completion rates by API
 * @returns {Promise<{rates: Array}>}
 */
export async function getCompletionByApi() {
  const res = await fetch(`${API_BASE}/api/db/analytics/completion-by-api`)
  if (!res.ok) {
    throw new Error(`Failed to fetch completion by API: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get username change history
 * @param {Object} params - Query parameters
 * @param {string} params.username - Username to filter
 * @param {number} params.limit - Number of records to return
 * @returns {Promise<{changes: Array, count: number}>}
 */
export async function getUsernameChanges(params = {}) {
  const queryParams = new URLSearchParams()
  if (params.username) queryParams.append('username', params.username)
  if (params.limit) queryParams.append('limit', params.limit)

  const res = await fetch(`${API_BASE}/api/db/analytics/username-changes?${queryParams}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch username changes: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get duplicate usernames across UIDs
 * @returns {Promise<{duplicates: Array, count: number}>}
 */
export async function getDuplicateUsernames() {
  const res = await fetch(`${API_BASE}/api/db/analytics/duplicate-usernames`)
  if (!res.ok) {
    throw new Error(`Failed to fetch duplicate usernames: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get cursor progress for ongoing downloads
 * @param {string} username - Username to filter
 * @returns {Promise<{cursors: Array, count: number}>}
 */
export async function getCursorProgress(username = '') {
  const queryParams = username ? `?username=${encodeURIComponent(username)}` : ''
  const res = await fetch(`${API_BASE}/api/db/analytics/cursor-progress${queryParams}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch cursor progress: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get platform comparison statistics
 * @returns {Promise<{platforms: Array}>}
 */
export async function getPlatformComparison() {
  const res = await fetch(`${API_BASE}/api/db/analytics/platform-comparison`)
  if (!res.ok) {
    throw new Error(`Failed to fetch platform comparison: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get cohort analysis
 * @param {string} period - Cohort period (week, month)
 * @returns {Promise<{cohorts: Array, period: string}>}
 */
export async function getCohortAnalysis(period = 'month') {
  const res = await fetch(`${API_BASE}/api/db/analytics/cohort-analysis?period=${period}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch cohort analysis: ${res.statusText}`)
  }
  return res.json()
}

/**
 * Get summary dashboard statistics
 * @param {Object} params - Query parameters
 * @param {string} params.startDate - Start date (ISO format)
 * @param {string} params.endDate - End date (ISO format)
 * @returns {Promise<{summary: Object}>}
 */
export async function getSummaryDashboard(params = {}) {
  const queryParams = new URLSearchParams()
  if (params.startDate) queryParams.append('startDate', params.startDate)
  if (params.endDate) queryParams.append('endDate', params.endDate)

  const res = await fetch(`${API_BASE}/api/db/analytics/summary-dashboard?${queryParams}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch summary dashboard: ${res.statusText}`)
  }
  return res.json()
}
