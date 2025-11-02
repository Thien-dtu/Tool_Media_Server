import { useState, useEffect } from 'react'
import { Bar, Doughnut, Pie } from 'react-chartjs-2'
import { getUsernameChanges } from '../../lib/dbApiClient.js'

export default function UsernameChangesReport() {
  const [changes, setChanges] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    fetchData()
  }, [limit])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { changes } = await getUsernameChanges({ limit })
      setChanges(changes || [])
    } catch (err) {
      console.error('Error fetching username changes:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Count changes by user
  const userChangeCounts = {}
  changes.forEach(change => {
    userChangeCounts[change.uid] = (userChangeCounts[change.uid] || 0) + 1
  })

  const topChangers = Object.entries(userChangeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Chart 1: Top Username Changers
  const top10ChartData = {
    labels: topChangers.map(([uid]) => uid.substring(0, 12) + '...'),
    datasets: [{
      label: 'Username Changes',
      data: topChangers.map(([, count]) => count),
      backgroundColor: '#f59e0b'
    }]
  }

  // Chart 2: Platform Distribution
  const platformCounts = changes.reduce((acc, c) => {
    acc[c.platform_name] = (acc[c.platform_name] || 0) + 1
    return acc
  }, {})

  const platformChartData = {
    labels: Object.keys(platformCounts),
    datasets: [{
      data: Object.values(platformCounts),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
    }]
  }

  // Chart 3: Change Frequency Distribution
  const frequencyBuckets = Object.values(userChangeCounts).reduce((acc, count) => {
    if (count === 1) acc['1 change'] = (acc['1 change'] || 0) + 1
    else if (count === 2) acc['2 changes'] = (acc['2 changes'] || 0) + 1
    else if (count <= 5) acc['3-5 changes'] = (acc['3-5 changes'] || 0) + 1
    else acc['6+ changes'] = (acc['6+ changes'] || 0) + 1
    return acc
  }, {})

  const frequencyChartData = {
    labels: Object.keys(frequencyBuckets),
    datasets: [{
      data: Object.values(frequencyBuckets),
      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
    }]
  }

  // Chart 4: All Changes Timeline (by top changers)
  const top20Changers = Object.entries(userChangeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  const top20ChartData = {
    labels: top20Changers.map(([uid]) => uid.substring(0, 12) + '...'),
    datasets: [{
      label: 'Total Changes',
      data: top20Changers.map(([, count]) => count),
      backgroundColor: '#8b5cf6'
    }]
  }

  // Chart 5: Current vs Historical
  const currentCount = changes.filter(c => c.is_current === 1).length
  const historicalCount = changes.filter(c => c.is_current === 0).length

  const statusChartData = {
    labels: ['Current Usernames', 'Historical Usernames'],
    datasets: [{
      data: [currentCount, historicalCount],
      backgroundColor: ['#10b981', '#6b7280']
    }]
  }

  if (isLoading) return <div className="container"><p>Loading...</p></div>

  return (
    <div className="container">
      <h2>🔄 Username Change History Analysis</h2>

      <div style={{ marginBottom: '20px' }}>
        <label>Limit: <input type="number" min="10" max="200" value={limit} onChange={e => setLimit(parseInt(e.target.value) || 50)} style={{ marginLeft: '8px', padding: '4px 8px', width: '80px' }} /></label>
      </div>

      {changes.length > 0 && (
        <>
          {/* Chart 1: Top 10 Username Changers */}
          <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Top 10 Users by Username Changes</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`username-changes-${limit}`} data={top10ChartData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 2: Platform Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Changes by Platform</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key={`platform-${limit}`} data={platformChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 3: Change Frequency Distribution */}
          <h3 style={{ marginBottom: '16px' }}>Change Frequency Distribution</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Pie key={`frequency-${limit}`} data={frequencyChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 4: Top 20 Changers */}
          <h3 style={{ marginBottom: '16px' }}>Top 20 Users - Total Changes</h3>
          <div style={{ height: '400px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Bar key={`top20-${limit}`} data={top20ChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Chart 5: Current vs Historical */}
          <h3 style={{ marginBottom: '16px' }}>Current vs Historical Usernames</h3>
          <div style={{ height: '350px', marginBottom: '40px', background: '#f9fafb', padding: '20px', borderRadius: '8px' }}>
            <Doughnut key={`status-${limit}`} data={statusChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>

          {/* Data Table */}
          <h3 style={{ marginBottom: '16px' }}>Detailed Change History</h3>
          <table>
            <thead>
              <tr>
                <th>UID</th>
                <th>Username</th>
                <th>Platform</th>
                <th>Changed At</th>
                <th>Current</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change, idx) => (
                <tr key={idx}>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{change.uid.substring(0, 12)}...</td>
                  <td>{change.username}</td>
                  <td>{change.platform_name}</td>
                  <td>{new Date(change.changed_at).toLocaleString()}</td>
                  <td style={{ textAlign: 'center' }}>{change.is_current ? '✓' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
