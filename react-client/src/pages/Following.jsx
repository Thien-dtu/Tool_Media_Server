import { useState, useEffect } from 'react'
import { getUserEnrichedData, getMediaCounts } from '../lib/apiClient.js'

export default function Following() {
  const [followingData, setFollowingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('timestamp') // timestamp, username
  const [sortOrder, setSortOrder] = useState('desc') // asc, desc
  const [pagesLoadedFilter, setPagesLoadedFilter] = useState('all') // all, hasPages, noPages, custom
  const [enrichedData, setEnrichedData] = useState({}) // Store UID and cursor info per username
  const [loadingEnriched, setLoadingEnriched] = useState(false)

  useEffect(() => {
    loadFollowingData()
  }, [])

  // Auto-load enriched data when following data is loaded
  useEffect(() => {
    if (followingData && !loadingEnriched && Object.keys(enrichedData).length === 0) {
      loadEnrichedData()
    }
  }, [followingData])

  const loadFollowingData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/ig_user_stories_report.jsonl')
      if (!response.ok) {
        throw new Error('Failed to load following data')
      }

      // Try to load from public folder first, then fallback to data folder
      let data
      try {
        const publicResponse = await fetch('/following.json')
        if (publicResponse.ok) {
          data = await publicResponse.json()
        } else {
          throw new Error('Not found in public folder')
        }
      } catch {
        // Fallback: try to load from data folder via API
        const apiResponse = await fetch('/api/following')
        if (!apiResponse.ok) {
          throw new Error('Failed to load following data from API')
        }
        data = await apiResponse.json()
      }

      setFollowingData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadEnrichedData = async () => {
    if (!followingData?.relationships_following) return

    try {
      setLoadingEnriched(true)
      const usernames = followingData.relationships_following.map(item => item.title).filter(Boolean)

      // Fetch media counts for all users in a single call (more efficient)
      let mediaCountsData = {}
      try {
        const mediaCountsResponse = await getMediaCounts(usernames)
        mediaCountsData = mediaCountsResponse.mediaCounts || {}
      } catch (err) {
        console.error('Failed to fetch media counts:', err)
      }

      // Fetch enriched data for all users (with batching to avoid too many parallel requests)
      const batchSize = 10
      const enrichedMap = {}

      for (let i = 0; i < usernames.length; i += batchSize) {
        const batch = usernames.slice(i, i + batchSize)
        const batchResults = await Promise.all(
          batch.map(async (username) => {
            try {
              const data = await getUserEnrichedData(username, ['get_list_ig_post'])
              // Add media count from the bulk fetch
              data.mediaCount = mediaCountsData[username] || 0
              return { username, data }
            } catch (err) {
              console.error(`Failed to fetch enriched data for ${username}:`, err)
              return { username, data: null }
            }
          })
        )

        batchResults.forEach(({ username, data }) => {
          if (data) {
            enrichedMap[username] = data
          }
        })

        // Update state incrementally so user sees progress
        setEnrichedData(prev => ({ ...prev, ...enrichedMap }))
      }
    } catch (err) {
      console.error('Error loading enriched data:', err)
    } finally {
      setLoadingEnriched(false)
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp * 1000)
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredAndSortedData = () => {
    if (!followingData?.relationships_following) return []

    let filtered = followingData.relationships_following.filter(item => {
      const username = item.title || ''

      // Search filter
      if (!username.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Pages loaded filter
      if (pagesLoadedFilter !== 'all') {
        const enriched = enrichedData[username]
        const pagesLoaded = enriched?.cursors?.pagesLoaded || 0

        if (pagesLoadedFilter === 'hasPages' && pagesLoaded === 0) {
          return false
        }
        if (pagesLoadedFilter === 'noPages' && pagesLoaded > 0) {
          return false
        }
      }

      return true
    })

    filtered.sort((a, b) => {
      let aValue, bValue

      if (sortBy === 'timestamp') {
        aValue = a.string_list_data?.[0]?.timestamp || 0
        bValue = b.string_list_data?.[0]?.timestamp || 0
      } else if (sortBy === 'username') {
        aValue = a.title  || ''
        bValue = b.title  || ''
      } else if (sortBy === 'pages') {
        const aUsername = a.title || ''
        const bUsername = b.title || ''
        aValue = enrichedData[aUsername]?.cursors?.pagesLoaded || 0
        bValue = enrichedData[bUsername]?.cursors?.pagesLoaded || 0
      } else if (sortBy === 'media') {
        const aUsername = a.title || ''
        const bUsername = b.title || ''
        aValue = enrichedData[aUsername]?.mediaCount || 0
        bValue = enrichedData[bUsername]?.mediaCount || 0
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }

  if (loading) {
    return (
      <div className="container">
        <h2>Following Data</h2>
        <div className="loading">Loading following data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <h2>Following Data</h2>
        <div className="error">Error: {error}</div>
        <button onClick={loadFollowingData}>Retry</button>
      </div>
    )
  }

  const sortedData = filteredAndSortedData()
  const totalCount = followingData?.relationships_following?.length || 0

  return (
    <div className="container">
      <h2>Instagram Following Data</h2>
      
      <div className="controls" style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label>Search: </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search username..."
            style={{ padding: '5px', marginLeft: '5px' }}
          />
        </div>

        <div>
          <label>Sort by: </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '5px', marginLeft: '5px' }}
          >
            <option value="timestamp">Date Followed</option>
            <option value="username">Username</option>
            <option value="pages">Pages Loaded</option>
            <option value="media">Media Count</option>
          </select>
        </div>

        <div>
          <label>Order: </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ padding: '5px', marginLeft: '5px' }}
          >
            <option value="desc">
              {sortBy === 'pages' ? 'Most Pages' :
               sortBy === 'media' ? 'Most Media' :
               'Newest First'}
            </option>
            <option value="asc">
              {sortBy === 'pages' ? 'Least Pages' :
               sortBy === 'media' ? 'Least Media' :
               'Oldest First'}
            </option>
          </select>
        </div>

        <div>
          <label>Pages Filter: </label>
          <select
            value={pagesLoadedFilter}
            onChange={(e) => setPagesLoadedFilter(e.target.value)}
            style={{ padding: '5px', marginLeft: '5px' }}
          >
            <option value="all">All Users</option>
            <option value="hasPages">Has Pages (&gt; 0)</option>
            <option value="noPages">No Pages (0)</option>
          </select>
        </div>

        {loadingEnriched && (
          <div style={{ padding: '6px 12px', background: '#e3f2fd', color: '#1976d2', borderRadius: '4px', fontSize: '14px' }}>
            Loading UID & Pages data...
          </div>
        )}

        <div style={{ marginLeft: 'auto', fontWeight: 'bold' }}>
          Total: {totalCount} | Showing: {sortedData.length}
        </div>
      </div>

      <div className="following-list" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {sortedData.length === 0 ? (
          <div className="no-results">No following data found.</div>
        ) : (
          <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
            {sortedData.map((item, index) => {
              const userData = item.string_list_data?.[0]
              if (!userData) return null

              const username = item.title
              const enriched = enrichedData[username]

              return (
                <div key={index} className="following-item" style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#f9f9f9'
                }}>
                  <div className="user-info">
                    <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>
                      <a
                        href={userData.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none', color: '#0066cc' }}
                      >
                        @{username}
                      </a>
                    </h4>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                      <strong>Followed:</strong> {formatTimestamp(userData.timestamp)}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#2e7d32' }}>
                      <strong>UID:</strong> {
                        loadingEnriched ? '...' :
                        enriched?.user?.uid ? enriched.user.uid :
                        'Not in DB'
                      }
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#1976d2' }}>
                      <strong>Pages Loaded:</strong> {
                        loadingEnriched ? '...' :
                        enriched?.cursors?.pagesLoaded !== undefined ? enriched.cursors.pagesLoaded :
                        '0'
                      }
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#d32f2f' }}>
                      <strong>Media Count:</strong> {
                        loadingEnriched ? '...' :
                        enriched?.mediaCount !== undefined ? enriched.mediaCount :
                        '0'
                      }
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#888' }}>
                      <strong>Profile:</strong>
                      <a
                        href={userData.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginLeft: '5px', color: '#0066cc' }}
                      >
                        View Profile
                      </a>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}