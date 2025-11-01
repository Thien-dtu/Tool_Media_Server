import { useState } from 'react'

/**
 * MediaGroupedByUser - Display saved media grouped by user
 * Shows media organized by username with expandable sections
 */
export default function MediaGroupedByUser({ users = [], onRefresh }) {
  const [expandedUsers, setExpandedUsers] = useState(new Set())
  const [sortBy, setSortBy] = useState('media_count') // media_count, username, last_download
  const [sortDirection, setSortDirection] = useState('desc')

  if (!users || users.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <p style={{ margin: '0 0 12px 0' }}>Chưa có người dùng nào được lưu trong database</p>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Làm mới
          </button>
        )}
      </div>
    )
  }

  const toggleUser = (username) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(username)) {
        newSet.delete(username)
      } else {
        newSet.add(username)
      }
      return newSet
    })
  }

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDirection('desc')
    }
  }

  // Sort users
  const sortedUsers = [...users].sort((a, b) => {
    let aVal, bVal

    switch (sortBy) {
      case 'media_count':
        aVal = a.media_count || 0
        bVal = b.media_count || 0
        break
      case 'username':
        aVal = (a.username || '').toLowerCase()
        bVal = (b.username || '').toLowerCase()
        break
      case 'last_download':
        aVal = a.last_download ? new Date(a.last_download).getTime() : 0
        bVal = b.last_download ? new Date(b.last_download).getTime() : 0
        break
      default:
        aVal = a.media_count || 0
        bVal = b.media_count || 0
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A'
    try {
      const d = new Date(timestamp)
      const now = new Date()
      const diffMs = now - d
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return 'Hôm nay'
      if (diffDays === 1) return 'Hôm qua'
      if (diffDays < 7) return `${diffDays} ngày trước`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`
      return `${Math.floor(diffDays / 365)} năm trước`
    } catch {
      return timestamp
    }
  }

  const getSortIcon = (field) => {
    if (sortBy !== field) return '⇅'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const totalMedia = sortedUsers.reduce((sum, u) => sum + (u.media_count || 0), 0)

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ margin: 0, color: '#111827' }}>
          Media theo người dùng ({sortedUsers.length} users, {totalMedia} media)
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', color: '#6b7280' }}>Sắp xếp theo:</span>
          <button
            onClick={() => toggleSort('media_count')}
            style={{
              padding: '6px 12px',
              background: sortBy === 'media_count' ? '#2563eb' : '#f3f4f6',
              color: sortBy === 'media_count' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            Số media {sortBy === 'media_count' && getSortIcon('media_count')}
          </button>
          <button
            onClick={() => toggleSort('username')}
            style={{
              padding: '6px 12px',
              background: sortBy === 'username' ? '#2563eb' : '#f3f4f6',
              color: sortBy === 'username' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            Username {sortBy === 'username' && getSortIcon('username')}
          </button>
          <button
            onClick={() => toggleSort('last_download')}
            style={{
              padding: '6px 12px',
              background: sortBy === 'last_download' ? '#2563eb' : '#f3f4f6',
              color: sortBy === 'last_download' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            Lần tải cuối {sortBy === 'last_download' && getSortIcon('last_download')}
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                padding: '6px 12px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              🔄 Làm mới
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sortedUsers.map((user, idx) => {
          const isExpanded = expandedUsers.has(user.username)
          const hasUid = user.uid && user.uid !== 'null'

          return (
            <div
              key={idx}
              style={{
                background: isExpanded ? '#f0f9ff' : '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              <div
                onClick={() => toggleUser(user.username)}
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  <div style={{ fontSize: '18px' }}>
                    {isExpanded ? '▼' : '▶'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '600', fontSize: '16px', color: '#111827' }}>
                        {user.username}
                      </span>
                      {hasUid && (
                        <span style={{
                          padding: '2px 8px',
                          background: '#10b981',
                          color: 'white',
                          fontSize: '11px',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}>
                          UID: {user.uid}
                        </span>
                      )}
                      {user.platform_name && (
                        <span style={{
                          padding: '2px 8px',
                          background: '#6366f1',
                          color: 'white',
                          fontSize: '11px',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}>
                          {user.platform_name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      <span style={{ marginRight: '16px' }}>
                        <b>Media:</b> {user.media_count || 0}
                      </span>
                      <span>
                        <b>Lần tải cuối:</b> {formatTimestamp(user.last_download)}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#374151'
                }}>
                  {user.media_count || 0} items
                </div>
              </div>

              {isExpanded && user.profile_url && (
                <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #e5e7eb', marginTop: '-8px', paddingTop: '16px' }}>
                  <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                      <b>Profile URL:</b>
                    </div>
                    <a
                      href={user.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontSize: '14px',
                        wordBreak: 'break-all'
                      }}
                    >
                      {user.profile_url}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
