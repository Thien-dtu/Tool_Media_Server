import { useState } from 'react'
import { fetchUser, bulkFetchUsers, getUserByUsername } from '../../lib/dbApiClient'

/**
 * UserInfoSection - Display and manage user information with UID
 * Allows searching for users and bulk fetching UIDs
 */
export default function UserInfoSection({ clientId, onUserUpdated }) {
  const [searchUsername, setSearchUsername] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [bulkUrls, setBulkUrls] = useState('')
  const [isBulkFetching, setIsBulkFetching] = useState(false)
  const [bulkResults, setBulkResults] = useState(null)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!searchUsername.trim()) {
      setError('Vui lòng nhập username')
      return
    }

    setIsSearching(true)
    setError('')
    setSearchResult(null)

    try {
      const { user } = await getUserByUsername(searchUsername.trim())
      if (user) {
        setSearchResult({
          found: true,
          user,
          hasUid: !!user.uid && user.uid !== 'null'
        })
      } else {
        setSearchResult({
          found: false,
          username: searchUsername.trim()
        })
      }
    } catch (err) {
      console.error('Search error:', err)
      setError(`Lỗi tìm kiếm: ${err.message}`)
    } finally {
      setIsSearching(false)
    }
  }

  const handleFetchUid = async () => {
    if (!searchResult || searchResult.found) return

    setIsSearching(true)
    setError('')

    try {
      const result = await fetchUser({
        url: searchResult.username,
        clientId
      })

      if (result.user) {
        setSearchResult({
          found: true,
          user: result.user,
          hasUid: !!result.user.uid && result.user.uid !== 'null',
          cached: result.cached
        })
        if (onUserUpdated) onUserUpdated()
      } else {
        setError('Không thể fetch thông tin user từ API')
      }
    } catch (err) {
      console.error('Fetch UID error:', err)
      setError(`Lỗi fetch UID: ${err.message}`)
    } finally {
      setIsSearching(false)
    }
  }

  const handleBulkFetch = async () => {
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(Boolean)

    if (urls.length === 0) {
      setError('Vui lòng nhập ít nhất một URL')
      return
    }

    if (urls.length > 50) {
      setError('Tối đa 50 URLs mỗi lần')
      return
    }

    setIsBulkFetching(true)
    setError('')
    setBulkResults(null)

    try {
      const result = await bulkFetchUsers({
        urls,
        clientId,
        concurrency: 3
      })

      setBulkResults(result)
      if (onUserUpdated) onUserUpdated()
    } catch (err) {
      console.error('Bulk fetch error:', err)
      setError(`Lỗi bulk fetch: ${err.message}`)
    } finally {
      setIsBulkFetching(false)
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A'
    try {
      const d = new Date(timestamp)
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch {
      return timestamp
    }
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#111827' }}>Quản lý User & UID</h3>

      {/* Search Section */}
      <div style={{
        background: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px' }}>Tìm kiếm User</h4>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Nhập username hoặc URL..."
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            disabled={isSearching}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            style={{
              padding: '10px 20px',
              background: isSearching ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isSearching ? '🔍 Đang tìm...' : '🔍 Tìm kiếm'}
          </button>
        </div>

        {searchResult && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: searchResult.found ? '#f0fdf4' : '#fef3f2',
            border: `1px solid ${searchResult.found ? '#86efac' : '#fecaca'}`,
            borderRadius: '8px'
          }}>
            {searchResult.found ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px', color: '#065f46' }}>
                      User đã tồn tại trong database
                    </div>
                    {searchResult.cached === false && (
                      <div style={{ fontSize: '13px', color: '#059669', marginTop: '4px' }}>
                        Vừa fetch từ API và lưu vào database
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '14px' }}>
                  <div>
                    <div style={{ color: '#6b7280', marginBottom: '4px' }}>Username:</div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{searchResult.user.username}</div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', marginBottom: '4px' }}>UID:</div>
                    <div style={{ fontWeight: '600', color: searchResult.hasUid ? '#10b981' : '#ef4444' }}>
                      {searchResult.hasUid ? searchResult.user.uid : 'Chưa có UID'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#6b7280', marginBottom: '4px' }}>Platform:</div>
                    <div style={{ fontWeight: '600', color: '#111827' }}>{searchResult.user.platform_name || 'N/A'}</div>
                  </div>
                  {searchResult.user.created_at && (
                    <div>
                      <div style={{ color: '#6b7280', marginBottom: '4px' }}>Tạo lúc:</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {formatTimestamp(searchResult.user.created_at)}
                      </div>
                    </div>
                  )}
                </div>

                {searchResult.user.profile_url && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ color: '#6b7280', marginBottom: '4px', fontSize: '14px' }}>Profile URL:</div>
                    <a
                      href={searchResult.user.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontSize: '14px',
                        wordBreak: 'break-all'
                      }}
                    >
                      {searchResult.user.profile_url}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '24px' }}>❌</span>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px', color: '#991b1b' }}>
                      User chưa có trong database
                    </div>
                    <div style={{ fontSize: '13px', color: '#dc2626', marginTop: '4px' }}>
                      Username: {searchResult.username}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleFetchUid}
                  disabled={isSearching}
                  style={{
                    padding: '8px 16px',
                    background: isSearching ? '#9ca3af' : '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSearching ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {isSearching ? '⏳ Đang fetch...' : '🔑 Fetch UID từ API'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Fetch Section */}
      <div style={{
        background: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px' }}>Bulk Fetch UIDs</h4>
        <div style={{ marginBottom: '12px' }}>
          <textarea
            placeholder="Nhập các URL (mỗi dòng một URL, tối đa 50 URLs)..."
            value={bulkUrls}
            onChange={(e) => setBulkUrls(e.target.value)}
            disabled={isBulkFetching}
            rows={6}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
          />
        </div>
        <button
          onClick={handleBulkFetch}
          disabled={isBulkFetching}
          style={{
            padding: '10px 20px',
            background: isBulkFetching ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isBulkFetching ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {isBulkFetching ? '⏳ Đang fetch...' : '🚀 Bulk Fetch UIDs'}
        </button>

        {bulkResults && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px'
          }}>
            <div style={{ fontWeight: '600', fontSize: '16px', color: '#065f46', marginBottom: '12px' }}>
              ✅ Hoàn thành Bulk Fetch
            </div>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '12px', fontSize: '14px' }}>
              <div>
                <span style={{ color: '#6b7280' }}>Tổng:</span>{' '}
                <span style={{ fontWeight: '600', color: '#111827' }}>{bulkResults.summary.total}</span>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Thành công:</span>{' '}
                <span style={{ fontWeight: '600', color: '#10b981' }}>{bulkResults.summary.successful}</span>
              </div>
              <div>
                <span style={{ color: '#6b7280' }}>Thất bại:</span>{' '}
                <span style={{ fontWeight: '600', color: '#ef4444' }}>{bulkResults.summary.failed}</span>
              </div>
            </div>

            {bulkResults.results.length > 0 && (
              <details style={{ marginTop: '12px' }}>
                <summary style={{ cursor: 'pointer', color: '#2563eb', fontWeight: '500', fontSize: '14px' }}>
                  Xem chi tiết ({bulkResults.results.length} items)
                </summary>
                <div style={{ marginTop: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                  {bulkResults.results.map((result, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        background: result.error ? '#fef2f2' : '#f0fdf4',
                        border: `1px solid ${result.error ? '#fecaca' : '#86efac'}`,
                        borderRadius: '6px',
                        marginBottom: '8px',
                        fontSize: '13px'
                      }}
                    >
                      <div style={{ fontWeight: '600', color: result.error ? '#dc2626' : '#059669' }}>
                        {result.error ? '❌' : '✅'} {result.url}
                      </div>
                      {result.user && (
                        <div style={{ marginTop: '4px', color: '#6b7280' }}>
                          Username: {result.user.username} | UID: {result.user.uid || 'N/A'}
                        </div>
                      )}
                      {result.error && (
                        <div style={{ marginTop: '4px', color: '#dc2626' }}>
                          Lỗi: {result.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
    </div>
  )
}
