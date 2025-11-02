import { useState, useEffect } from 'react'
import { Bar, Doughnut, Pie } from 'react-chartjs-2'
import { getInactiveUsers } from '../../lib/dbApiClient.js'

export default function InactiveUsersReport() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchData()
  }, [days])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { users } = await getInactiveUsers(days)
      setUsers(users || [])
    } catch (err) {
      console.error('Error fetching inactive users:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const top10 = users.slice(0, 10)
  const top20 = users.slice(0, 20)

  // Chart 1: Top 10 Inactive Users
  const top10ChartData = {
    labels: top10.map(u => u.username || 'N/A'),
    datasets: [{
      label: 'Total Downloads',
      data: top10.map(u => u.total_downloads),
      backgroundColor: '#ef4444'
    }]
  }

  // Chart 2: Platform Distribution
  const platformCounts = users.reduce((acc, user) => {
    acc[user.platform_name] = (acc[user.platform_name] || 0) + 1
    return acc
  }, {})

  const platformChartData = {
    labels: Object.keys(platformCounts),
    datasets: [{
      label: 'Inactive Users by Platform',
      data: Object.values(platformCounts),
      backgroundColor: ['#ef4444', '#f59e0b', '#8b5cf6']
    }]
  }

  // Chart 3: Inactivity Duration Distribution
  const inactivityBuckets = users.reduce((acc, user) => {
    if (!user.last_download) {
      acc['Never Active'] = (acc['Never Active'] || 0) + 1
      return acc
    }
    const daysSinceActivity = Math.floor((Date.now() - new Date(user.last_download)) / (1000 * 60 * 60 * 24))
    if (daysSinceActivity < 30) acc['< 30 days'] = (acc['< 30 days'] || 0) + 1
    else if (daysSinceActivity < 60) acc['30-60 days'] = (acc['30-60 days'] || 0) + 1
    else if (daysSinceActivity < 90) acc['60-90 days'] = (acc['60-90 days'] || 0) + 1
    else acc['> 90 days'] = (acc['> 90 days'] || 0) + 1
    return acc
  }, {})

  const inactivityChartData = {
    labels: Object.keys(inactivityBuckets),
    datasets: [{
      label: 'User Count',
      data: Object.values(inactivityBuckets),
      backgroundColor: ['#fef3c7', '#fed7aa', '#fca5a5', '#dc2626', '#7f1d1d']
    }]
  }

  // Chart 4: Downloads Distribution
  const downloadsChartData = {
    labels: top20.map(u => u.username || 'N/A'),
    datasets: [{
      label: 'Total Downloads',
      data: top20.map(u => u.total_downloads),
      backgroundColor: '#f59e0b'
    }]
  }

  // Chart 5: Activity Summary
  const activitySummary = {
    labels: ['Total Inactive', 'Never Downloaded', 'Has Downloads'],
    datasets: [{
      data: [
        users.length,
        users.filter(u => u.total_downloads === 0).length,
        users.filter(u => u.total_downloads > 0).length
      ],
      backgroundColor: ['#ef4444', '#7f1d1d', '#f59e0b']
    }]
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>💤 Inactive Users Analysis</h2>

      <div style={{ marginBottom: '20px' }}>
        <label>Inactive for (days): <input type="number" min="7" max="365" value={days} onChange={e => setDays(parseInt(e.target.value) || 30)} style={{ marginLeft: '8px', padding: '4px 8px', width: '80px' }} /></label>
      </div>

      {users.length > 0 && (
        <>
          {/* Chart 1: Top 10 Inactive Users */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Top 10 Inactive Users by Downloads</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`inactive-users-${days}`} data={top10ChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: Platform Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Inactive Users by Platform</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key={`platform-${days}`} data={platformChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: Inactivity Duration */}
          <h3 style={{ marginBottom: '16px' }}>Inactivity Duration Distribution</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`inactivity-${days}`} data={inactivityChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: Top 20 Downloads */}
          <h3 style={{ marginBottom: '16px' }}>Top 20 Inactive Users - Download History</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`downloads-${days}`} data={downloadsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: Activity Summary */}
          <h3 style={{ marginBottom: '16px' }}>Activity Summary</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Pie key={`summary-${days}`} data={activitySummary} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed Inactive Users List</h3>
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Platform</th>
                <th>Total Downloads</th>
                <th>Last Activity</th>
                <th>Days Inactive</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => {
                const daysSince = user.last_download ? Math.floor((Date.now() - new Date(user.last_download)) / (1000 * 60 * 60 * 24)) : null
                return (
                  <tr key={idx}>
                    <td>{user.username || 'N/A'}</td>
                    <td>{user.platform_name}</td>
                    <td>{user.total_downloads}</td>
                    <td>{user.last_download ? new Date(user.last_download).toLocaleDateString() : 'Never'}</td>
                    <td style={{ fontWeight: '600', color: daysSince > 90 ? '#dc2626' : '#f59e0b' }}>
                      {daysSince ? `${daysSince} days` : 'N/A'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
