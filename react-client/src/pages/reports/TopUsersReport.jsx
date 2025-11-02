import { useState, useEffect } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { getTopUsers } from '../../lib/dbApiClient.js'

export default function TopUsersReport() {
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [limit, setLimit] = useState(10)

  useEffect(() => {
    fetchData()
  }, [limit])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { users } = await getTopUsers({ limit: Math.max(limit, 20) })
      setUsers(users || [])
    } catch (err) {
      console.error('Error fetching top users:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const topN = users.slice(0, limit)

  // Chart 1: Downloads by User
  const downloadsChartData = {
    labels: topN.map(u => u.username || 'N/A'),
    datasets: [{
      label: 'Total Downloads',
      data: topN.map(u => u.total_downloads),
      backgroundColor: '#10b981'
    }]
  }

  // Chart 2: API Calls by User
  const apiCallsChartData = {
    labels: topN.map(u => u.username || 'N/A'),
    datasets: [{
      label: 'API Calls',
      data: topN.map(u => u.api_calls || 0),
      backgroundColor: '#3b82f6'
    }]
  }

  // Chart 3: Platform Distribution
  const platformCounts = topN.reduce((acc, user) => {
    acc[user.platform_name] = (acc[user.platform_name] || 0) + 1
    return acc
  }, {})

  const platformChartData = {
    labels: Object.keys(platformCounts),
    datasets: [{
      label: 'Users by Platform',
      data: Object.values(platformCounts),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
    }]
  }

  // Chart 4: Downloads vs API Calls (Combined)
  const comparisonChartData = {
    labels: topN.map(u => u.username || 'N/A'),
    datasets: [
      {
        label: 'Downloads',
        data: topN.map(u => u.total_downloads),
        backgroundColor: '#10b981'
      },
      {
        label: 'API Calls',
        data: topN.map(u => u.api_calls || 0),
        backgroundColor: '#3b82f6'
      }
    ]
  }

  // Chart 5: Efficiency Score (Downloads per API Call)
  const efficiencyChartData = {
    labels: topN.map(u => u.username || 'N/A'),
    datasets: [{
      label: 'Downloads per API Call',
      data: topN.map(u => u.api_calls > 0 ? (u.total_downloads / u.api_calls).toFixed(2) : 0),
      backgroundColor: '#8b5cf6'
    }]
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>👥 Top Active Users</h2>

      <div style={{ marginBottom: '20px' }}>
        <label>Top N: <input type="number" min="5" max="50" value={limit} onChange={e => setLimit(parseInt(e.target.value) || 10)} style={{ marginLeft: '8px', padding: '4px 8px', width: '80px' }} /></label>
      </div>

      {users.length > 0 && (
        <>
          {/* Chart 1: Downloads by User */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Total Downloads by User</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`top-users-${limit}`} data={downloadsChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: API Calls by User */}
          <h3 style={{ marginBottom: '16px' }}>API Calls by User</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`api-calls-${limit}`} data={apiCallsChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: Platform Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Platform Distribution</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key={`platform-dist-${limit}`} data={platformChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: Downloads vs API Calls Comparison */}
          <h3 style={{ marginBottom: '16px' }}>Downloads vs API Calls Comparison</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`comparison-${limit}`} data={comparisonChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: Efficiency Score */}
          <h3 style={{ marginBottom: '16px' }}>User Efficiency (Downloads per API Call)</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`efficiency-${limit}`} data={efficiencyChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed User Statistics</h3>
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Platform</th>
                <th>Downloads</th>
                <th>API Calls</th>
                <th>Efficiency</th>
                <th>Last Download</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={idx}>
                  <td>{user.username || 'N/A'}</td>
                  <td>{user.platform_name}</td>
                  <td style={{ fontWeight: '600', color: '#059669' }}>{user.total_downloads}</td>
                  <td>{user.api_calls}</td>
                  <td style={{ fontWeight: '600', color: '#8b5cf6' }}>
                    {user.api_calls > 0 ? (user.total_downloads / user.api_calls).toFixed(2) : 'N/A'}
                  </td>
                  <td>{user.last_download ? new Date(user.last_download).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
