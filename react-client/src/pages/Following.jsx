import { useState, useEffect } from 'react'

export default function Following() {
  const [followingData, setFollowingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('timestamp') // timestamp, username
  const [sortOrder, setSortOrder] = useState('desc') // asc, desc

  useEffect(() => {
    loadFollowingData()
  }, [])

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
      const username = item.string_list_data?.[0]?.value || ''
      return username.toLowerCase().includes(searchTerm.toLowerCase())
    })

    filtered.sort((a, b) => {
      let aValue, bValue
      
      if (sortBy === 'timestamp') {
        aValue = a.string_list_data?.[0]?.timestamp || 0
        bValue = b.string_list_data?.[0]?.timestamp || 0
      } else {
        aValue = a.string_list_data?.[0]?.value || ''
        bValue = b.string_list_data?.[0]?.value || ''
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
          </select>
        </div>
        
        <div>
          <label>Order: </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ padding: '5px', marginLeft: '5px' }}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
        
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
                        @{userData.value}
                      </a>
                    </h4>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                      <strong>Followed:</strong> {formatTimestamp(userData.timestamp)}
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