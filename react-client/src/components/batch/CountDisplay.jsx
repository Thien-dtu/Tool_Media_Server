import { useState } from 'react'

export default function CountDisplay({ results, savedSet, downloadedIds }) {
  const totalItems = results.length
  const savedItems = results.filter(item => savedSet.has(`${item.username}|${item.id}`)).length
  const downloadedItems = results.filter(item => downloadedIds.has(`${item.username}|${item.id}`)).length
  const newItems = totalItems - savedItems
  
  // Group by username for detailed breakdown
  const userStats = results.reduce((acc, item) => {
    const username = item.username || 'unknown'
    if (!acc[username]) {
      acc[username] = { total: 0, saved: 0, downloaded: 0 }
    }
    acc[username].total++
    if (savedSet.has(`${item.username}|${item.id}`)) {
      acc[username].saved++
    }
    if (downloadedIds.has(`${item.username}|${item.id}`)) {
      acc[username].downloaded++
    }
    return acc
  }, {})

  // Base entries for sorting
  const baseEntries = Object.entries(userStats)

  // Sorting controls and logic
  const [sortField, setSortField] = useState('total') // 'username' | 'total' | 'saved' | 'downloaded' | 'new'
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'

  const sortedEntries = [...baseEntries].sort((a, b) => {
    const [userA, statsA] = a
    const [userB, statsB] = b
    const newA = statsA.total - statsA.saved - statsA.downloaded
    const newB = statsB.total - statsB.saved - statsB.downloaded
    let valA; let valB
    switch (sortField) {
      case 'username':
        valA = userA.toLowerCase(); valB = userB.toLowerCase();
        if (valA < valB) return sortDir === 'asc' ? -1 : 1
        if (valA > valB) return sortDir === 'asc' ? 1 : -1
        return 0
      case 'saved':
        valA = statsA.saved; valB = statsB.saved; break
      case 'downloaded':
        valA = statsA.downloaded; valB = statsB.downloaded; break
      case 'new':
        valA = newA; valB = newB; break
      case 'total':
      default:
        valA = statsA.total; valB = statsB.total; break
    }
    return sortDir === 'asc' ? (valA - valB) : (valB - valA)
  })

  return (
    <div className="count-display">
      <div className="summary-stats">
        <h3>Tổng quan</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Tổng số mục:</span>
            <span className="stat-value">{totalItems}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Đã lưu trước đó:</span>
            <span className="stat-value saved">{savedItems}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Mới tải trong phiên:</span>
            <span className="stat-value downloaded">{downloadedItems}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Chưa tải:</span>
            <span className="stat-value new">{newItems - downloadedItems}</span>
          </div>
        </div>
      </div>

      {Object.keys(userStats).length > 0 && (
        <div className="user-stats">
          <h3>Chi tiết theo người dùng</h3>
          <div className="stat-grid" style={{ marginBottom: 8 }}>
            <div className="stat-item">
              <span className="stat-label">Sắp xếp theo</span>
              <select value={sortField} onChange={e => setSortField(e.target.value)} style={{ width: 140 }}>
                <option value="total">Tổng</option>
                <option value="saved">Đã lưu</option>
                <option value="downloaded">Mới tải</option>
                <option value="new">Chưa tải</option>
                <option value="username">Username</option>
              </select>
            </div>
            <div className="stat-item">
              <span className="stat-label">Thứ tự</span>
              <select value={sortDir} onChange={e => setSortDir(e.target.value)} style={{ width: 140 }}>
                <option value="desc">Giảm dần</option>
                <option value="asc">Tăng dần</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
              Hiển thị {sortedEntries.length}/{Object.keys(userStats).length} người dùng
            </span>
          </div>
          <div className="user-list">
            {sortedEntries.map(([username, stats]) => (
              <div key={username} className="user-stat">
                <div className="username">{username}</div>
                <div className="user-numbers">
                  <span>Tổng: {stats.total}</span>
                  <span className="saved">Đã lưu: {stats.saved}</span>
                  <span className="downloaded">Mới tải: {stats.downloaded}</span>
                  <span className="new">Chưa tải: {stats.total - stats.saved - stats.downloaded}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}