import { useState } from 'react'

/**
 * UserReportTable - Display database reports with UID and enhanced filtering
 * Shows report data from the database with user UID information
 */
export default function UserReportTable({ reports = [], onDeleteReport }) {
  const [sortField, setSortField] = useState('timestamp')
  const [sortDirection, setSortDirection] = useState('desc')
  const [filterUsername, setFilterUsername] = useState('')

  if (!reports || reports.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        Không có báo cáo nào trong cơ sở dữ liệu
      </div>
    )
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Flatten reports to individual entries
  const flattenedReports = reports.flatMap(reportGroup => {
    const { apiName, timestamp, report: reportDetails } = reportGroup
    if (Array.isArray(reportDetails)) {
      return reportDetails.map(detail => ({
        ...detail,
        apiName,
        timestamp,
        reportTimestamp: timestamp
      }))
    }
    return []
  })

  // Filter by username
  const filteredReports = filterUsername
    ? flattenedReports.filter(r => r.username && r.username.toLowerCase().includes(filterUsername.toLowerCase()))
    : flattenedReports

  // Sort reports
  const sortedReports = [...filteredReports].sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]

    if (sortField === 'timestamp' || sortField === 'reportTimestamp') {
      aVal = new Date(aVal).getTime()
      bVal = new Date(bVal).getTime()
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const formatTimestamp = (timestamp) => {
    try {
      const d = new Date(timestamp)
      const utc7 = new Date(d.getTime() + 7 * 60 * 60 * 1000)
      return utc7.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    } catch {
      return timestamp
    }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return '⇅'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#111827' }}>
          Báo cáo từ Database ({sortedReports.length} mục)
        </h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Lọc theo username..."
            value={filterUsername}
            onChange={(e) => setFilterUsername(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          />
        </div>
      </div>

      <div className="table-wrapper" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
              <th onClick={() => handleSort('username')} style={{ padding: '12px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>
                Username {getSortIcon('username')}
              </th>
              <th onClick={() => handleSort('apiName')} style={{ padding: '12px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>
                API {getSortIcon('apiName')}
              </th>
              <th onClick={() => handleSort('total')} style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                Tổng {getSortIcon('total')}
              </th>
              <th onClick={() => handleSort('have')} style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                Đã có {getSortIcon('have')}
              </th>
              <th onClick={() => handleSort('nohave')} style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                Chưa có {getSortIcon('nohave')}
              </th>
              <th style={{ padding: '12px', textAlign: 'center' }}>% Hoàn thành</th>
              <th onClick={() => handleSort('pages')} style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                Trang {getSortIcon('pages')}
              </th>
              <th onClick={() => handleSort('time')} style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                Thời gian {getSortIcon('time')}
              </th>
              <th onClick={() => handleSort('reportTimestamp')} style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                Timestamp {getSortIcon('reportTimestamp')}
              </th>
              {onDeleteReport && (
                <th style={{ padding: '12px', textAlign: 'center' }}>Hành động</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedReports.map((item, idx) => {
              const completionPct = item.total > 0 ? Math.round((item.have / item.total) * 100) : 0
              const completionColor = completionPct >= 100 ? '#10b981' : completionPct >= 50 ? '#f59e0b' : '#ef4444'

              return (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'none' }}
                    >
                      {item.username || 'N/A'}
                    </a>
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280', fontSize: '13px' }}>{item.apiName}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>{item.total}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#10b981' }}>{item.have}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#ef4444' }}>{item.nohave}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <div style={{
                        width: '60px',
                        height: '8px',
                        background: '#e5e7eb',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${completionPct}%`,
                          height: '100%',
                          background: completionColor,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: '13px', color: completionColor, fontWeight: '600' }}>
                        {completionPct}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{item.pages || 'N/A'}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>{item.time || 'N/A'}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                    {formatTimestamp(item.reportTimestamp)}
                  </td>
                  {onDeleteReport && (
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => onDeleteReport(item)}
                        style={{
                          padding: '6px 12px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#dc2626'}
                        onMouseLeave={(e) => e.target.style.background = '#ef4444'}
                      >
                        Xóa
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '14px', color: '#6b7280' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <b>Tổng số mục:</b> {sortedReports.reduce((sum, r) => sum + (r.total || 0), 0)}
          </div>
          <div>
            <b>Đã tải:</b> {sortedReports.reduce((sum, r) => sum + (r.have || 0), 0)}
          </div>
          <div>
            <b>Chưa tải:</b> {sortedReports.reduce((sum, r) => sum + (r.nohave || 0), 0)}
          </div>
          <div>
            <b>Tổng số trang:</b> {sortedReports.reduce((sum, r) => sum + (r.pages || 0), 0)}
          </div>
        </div>
      </div>
    </div>
  )
}
