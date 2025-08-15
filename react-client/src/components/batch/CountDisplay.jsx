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
          <div className="user-list">
            {Object.entries(userStats).map(([username, stats]) => (
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